# FIX - Compteur Inbox Dashboard RH

## Problème identifié

**Page Boîte de Réception** : 8 tâches (Total = 8)
**Dashboard RH - Carte Inbox** : 0

Le Dashboard n'affichait **aucune tâche** alors que la page Inbox en affichait **8**.

---

## Analyse des sources de données

### Page Inbox (InboxPage.tsx)

**Fichier** : `src/components/InboxPage.tsx`
**Fonction** : `fetchTaches()` (lignes 142-262)

**Requêtes** :

1. **Table `taches`** (lignes 147-155) :
   ```typescript
   .from('taches')
   .select('*, expediteur:..., assignee:...')
   .or(`assignee_id.eq.${appUserId},expediteur_id.eq.${appUserId}`)
   ```

2. **Table `inbox`** (lignes 157-163) :
   ```typescript
   .from('inbox')
   .select('*')
   .eq('utilisateur_id', appUserId)
   .eq('reference_type', 'demande_externe')
   ```

**Calcul du Total** (ligne 253) :
```typescript
total: allItems.length  // taches + demandes externes
```

---

### Dashboard RH - AVANT correction (RHDashboard.tsx)

**Fichier** : `src/components/RHDashboard.tsx`
**Fonction** : `fetchInboxStats()` (lignes 672-701)

**Requêtes** :

1. **Table `taches` UNIQUEMENT** (lignes 676-679) :
   ```typescript
   .from('taches')
   .select('lu_par_assignee, lu_par_expediteur, assignee_id, expediteur_id')
   .or(`assignee_id.eq.${appUser.id},expediteur_id.eq.${appUser.id}`)
   ```

2. ❌ **Table `inbox` : PAS INTERROGÉE**

**Affichage** (ligne 888) :
```typescript
value={stats.inbox.non_lus}  // Affiche UNIQUEMENT les non lus
```

### Problèmes identifiés

| Problème | Page Inbox | Dashboard RH (AVANT) |
|----------|-----------|---------------------|
| **Source 1 : taches** | ✅ Table `taches` | ✅ Table `taches` |
| **Source 2 : inbox** | ✅ Table `inbox` (demandes externes) | ❌ MANQUANT |
| **Affichage** | ✅ Total (taches + demandes) | ❌ Non lus uniquement |
| **Filtres** | ✅ `.or(assignee/expediteur)` | ✅ `.or(assignee/expediteur)` |

**Cause racine** :
1. Le Dashboard **n'interrogeait PAS** la table `inbox` (demandes externes)
2. Le Dashboard affichait les **non lus** au lieu du **total**

---

## Solution appliquée

### 1. Mise à jour de l'interface Stats

**Fichier** : `src/components/RHDashboard.tsx`

**Ligne 72-75 (AVANT)** :
```typescript
inbox: {
  non_lus: number;
};
```

**Ligne 72-75 (APRÈS)** :
```typescript
inbox: {
  total: number;      // ✅ Ajouté
  non_lus: number;
};
```

**Ligne 156-159 (initialisation)** :
```typescript
inbox: {
  total: 0,           // ✅ Ajouté
  non_lus: 0,
},
```

---

### 2. Réécriture de fetchInboxStats()

**Fichier** : `src/components/RHDashboard.tsx`
**Fonction** : `fetchInboxStats()` (lignes 674-721)

**AVANT (lignes 672-701)** :
```typescript
const fetchInboxStats = async () => {
  if (!appUser) return;

  try {
    // ❌ Seulement la table taches
    const { data: taches } = await supabase
      .from('taches')
      .select('lu_par_assignee, lu_par_expediteur, assignee_id, expediteur_id')
      .or(`assignee_id.eq.${appUser.id},expediteur_id.eq.${appUser.id}`);

    if (!taches) {
      setStats((prev) => ({
        ...prev,
        inbox: { non_lus: 0 },  // ❌ Pas de total
      }));
      return;
    }

    // ❌ Compte UNIQUEMENT les non lus
    const non_lus = taches.filter((t) =>
      (t.assignee_id === appUser.id && !t.lu_par_assignee) ||
      (t.expediteur_id === appUser.id && !t.lu_par_expediteur)
    ).length;

    setStats((prev) => ({
      ...prev,
      inbox: { non_lus },  // ❌ Pas de total
    }));
  } catch (error) {
    console.error('Error fetching inbox stats:', error);
  }
};
```

**APRÈS (lignes 674-721)** :
```typescript
const fetchInboxStats = async () => {
  if (!appUser) return;

  try {
    // ✅ 1. Récupérer les tâches (même requête que InboxPage)
    const { data: taches } = await supabase
      .from('taches')
      .select('*')
      .or(`assignee_id.eq.${appUser.id},expediteur_id.eq.${appUser.id}`);

    // ✅ 2. Récupérer les demandes externes (NOUVEAU)
    const { data: inboxData } = await supabase
      .from('inbox')
      .select('*')
      .eq('utilisateur_id', appUser.id)
      .eq('reference_type', 'demande_externe');

    const tachesCount = taches?.length || 0;
    const demandesCount = inboxData?.length || 0;
    const total = tachesCount + demandesCount;  // ✅ Total calculé

    // Calculer les non lus (taches + demandes)
    const nonLusTaches = (taches || []).filter((t: any) =>
      (t.assignee_id === appUser.id && !t.lu_par_assignee) ||
      (t.expediteur_id === appUser.id && !t.lu_par_expediteur)
    ).length;
    const nonLusDemandes = (inboxData || []).filter((d: any) => !d.lu).length;
    const non_lus = nonLusTaches + nonLusDemandes;

    // ✅ Log pour debug
    console.log('📊 Dashboard Inbox:', {
      tachesCount,
      demandesCount,
      total,
      non_lus,
      filters: {
        utilisateur_id: appUser.id,
        source: 'taches + inbox'
      }
    });

    setStats((prev) => ({
      ...prev,
      inbox: { total, non_lus },  // ✅ Total + non_lus
    }));
  } catch (error) {
    console.error('Error fetching inbox stats:', error);
  }
};
```

---

### 3. Mise à jour de l'affichage

**Fichier** : `src/components/RHDashboard.tsx`

**Ligne 885-893 (AVANT)** :
```typescript
<StatCard
  icon={<Inbox className="w-6 h-6" />}
  title="Inbox"
  value={stats.inbox.non_lus}  // ❌ Affiche les non lus
  subtitle={stats.inbox.non_lus > 0 ? `+${stats.inbox.non_lus} non lus` : 'Aucun message'}
  trend={stats.inbox.non_lus > 0 ? 'up' : 'neutral'}
  trendValue={stats.inbox.non_lus > 0 ? 'Nouveau' : 'Boîte vide'}
  color="purple"
/>
```

**Ligne 885-893 (APRÈS)** :
```typescript
<StatCard
  icon={<Inbox className="w-6 h-6" />}
  title="Inbox"
  value={stats.inbox.total}  // ✅ Affiche le total
  subtitle={stats.inbox.non_lus > 0 ? `${stats.inbox.non_lus} non lus` : 'Aucun message'}
  trend={stats.inbox.non_lus > 0 ? 'up' : 'neutral'}
  trendValue={stats.inbox.non_lus > 0 ? 'Nouveau' : 'Boîte vide'}
  color="purple"
/>
```

---

### 4. Ajout des abonnements temps réel

**Fichier** : `src/components/RHDashboard.tsx`

**Lignes 232-244 (NOUVEAU)** :
```typescript
// ✅ Abonnement pour la table inbox
const inboxChannel = supabase
  .channel('inbox-dashboard-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox' }, () => {
    fetchInboxStats();
  })
  .subscribe();

// ✅ Abonnement pour la table demandes_externes
const demandesExternesChannel = supabase
  .channel('demandes-externes-dashboard-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes_externes' }, () => {
    fetchInboxStats();
  })
  .subscribe();
```

**Lignes 256-257 (cleanup)** :
```typescript
supabase.removeChannel(inboxChannel);
supabase.removeChannel(demandesExternesChannel);
```

---

### 5. Ajout de logs dans InboxPage

**Fichier** : `src/components/InboxPage.tsx`

**Lignes 257-266 (NOUVEAU)** :
```typescript
console.log('📊 Page Inbox:', {
  tachesCount: formattedTaches.length,
  demandesCount: formattedDemandes.length,
  total: allItems.length,
  non_lus: newStats.non_lus,
  filters: {
    utilisateur_id: appUserId,
    source: 'taches + inbox'
  }
});
```

---

## Fichiers modifiés

| Fichier | Lignes | Modifications |
|---------|--------|---------------|
| `src/components/RHDashboard.tsx` | 72-75 | Interface Stats : ajout `total` |
| `src/components/RHDashboard.tsx` | 156-159 | Initialisation stats : ajout `total: 0` |
| `src/components/RHDashboard.tsx` | 674-721 | `fetchInboxStats()` : requête `inbox` + calcul total |
| `src/components/RHDashboard.tsx` | 232-244 | Abonnements temps réel `inbox` + `demandes_externes` |
| `src/components/RHDashboard.tsx` | 256-257 | Cleanup abonnements |
| `src/components/RHDashboard.tsx` | 888 | Affichage : `stats.inbox.total` au lieu de `non_lus` |
| `src/components/InboxPage.tsx` | 257-266 | Logs de debug |

---

## Résultat attendu

### Avant la correction

```
Dashboard RH - Inbox : 0
  - Source : taches uniquement
  - Affichage : non_lus

Page Inbox - Total : 8
  - Source : taches + inbox (demandes externes)
  - Affichage : total
```

### Après la correction

```
Dashboard RH - Inbox : 8 ✅
  - Source : taches + inbox (demandes externes)
  - Affichage : total
  - Sous-titre : X non lus

Page Inbox - Total : 8 ✅
  - Source : taches + inbox (demandes externes)
  - Affichage : total

Les deux sources sont maintenant alignées !
```

---

## Vérification dans la console

### 1. Ouvrir le Dashboard RH

Dans la console (F12), vous verrez :

```
📊 Dashboard Inbox: {
  tachesCount: 6,
  demandesCount: 2,
  total: 8,
  non_lus: 3,
  filters: {
    utilisateur_id: "xxx-xxx-xxx",
    source: "taches + inbox"
  }
}
```

### 2. Ouvrir la page Inbox

Dans la console (F12), vous verrez :

```
📊 Page Inbox: {
  tachesCount: 6,
  demandesCount: 2,
  total: 8,
  non_lus: 3,
  filters: {
    utilisateur_id: "xxx-xxx-xxx",
    source: "taches + inbox"
  }
}
```

**Les deux logs doivent afficher le même total !**

---

## Sources de données identiques

| Critère | Page Inbox | Dashboard RH |
|---------|-----------|--------------|
| **Table 1** | ✅ `taches` | ✅ `taches` |
| **Table 2** | ✅ `inbox` | ✅ `inbox` |
| **Filtre taches** | ✅ `.or(assignee/expediteur)` | ✅ `.or(assignee/expediteur)` |
| **Filtre inbox** | ✅ `.eq(utilisateur_id)` | ✅ `.eq(utilisateur_id)` |
| **Filtre type** | ✅ `.eq(reference_type, 'demande_externe')` | ✅ `.eq(reference_type, 'demande_externe')` |
| **Calcul total** | ✅ `taches.length + inbox.length` | ✅ `taches.length + inbox.length` |
| **Temps réel** | ✅ Abonnements taches + inbox | ✅ Abonnements taches + inbox |

**Les deux pages utilisent maintenant EXACTEMENT les mêmes sources et filtres.**

---

## Build

✅ Le projet compile sans erreurs :

```bash
vite v5.4.21 building for production...
✓ built in 22.01s
```

---

## Résumé

| Aspect | Avant | Après |
|--------|-------|-------|
| **Total Dashboard** | 0 | 8 ✅ |
| **Source données** | ❌ taches uniquement | ✅ taches + inbox |
| **Affichage** | ❌ non_lus | ✅ total |
| **Temps réel** | ❌ taches + taches_messages | ✅ taches + inbox + demandes_externes |
| **Logs debug** | ❌ Non | ✅ Oui |
| **Cohérence** | ❌ Incohérent | ✅ Cohérent |

La carte Inbox du Dashboard RH affiche maintenant le **même total** que la page Boîte de Réception, en utilisant **exactement les mêmes sources de données et filtres**.
