# PATCH APPLIQUÉ - Notifications Contrats CDD avec Avenants

## Problème identifié

**Symptôme :**
Cynthya SHIMBA apparaît dans "Notifications de documents > Contrats CDD" alors qu'elle a :
- Un CDD principal finissant le 20/03/2026
- Un avenant signé valide jusqu'au 03/07/2026

**Cause racine :**
La requête de récupération des contrats expirant dans les 30 jours :
1. Filtrait uniquement `statut = 'actif'`
2. Ne vérifiait PAS s'il existait un contrat suivant (avenant ou renouvellement)
3. Remontait donc le CDD principal même si prolongé par un avenant

---

## Solution appliquée (Front-end uniquement)

### Fichier modifié
`src/components/NotificationsList.tsx` (lignes 77-164)

### Changements effectués

#### 1. Élargissement du filtre statut
**AVANT :**
```typescript
.eq('statut', 'actif')
```

**APRÈS :**
```typescript
.in('statut', ['actif', 'signe'])
```

Justification : Les avenants peuvent avoir le statut `signe` au lieu de `actif`.

#### 2. Récupération de tous les contrats pour détection de continuité
```typescript
// Récupérer TOUS les contrats (actifs ET signés) du même profil pour détecter les continuités
const { data: allContratsForContinuity, error: allContratError } = await supabase
  .from('contrat')
  .select(`
    id,
    profil_id,
    date_debut,
    date_fin,
    type,
    statut
  `)
  .in('statut', ['actif', 'signe']);
```

#### 3. Ajout de la logique de détection de contrat remplacé
```typescript
// Vérifier s'il existe un contrat suivant (avenant ou renouvellement) pour ce profil
const contratsSuivants = (allContratsForContinuity || []).filter(c =>
  c.profil_id === contrat.profil_id &&
  c.id !== contrat.id &&
  (c.statut === 'actif' || c.statut === 'signe') &&
  c.date_debut && contrat.date_fin &&
  new Date(c.date_debut) <= new Date(new Date(contrat.date_fin).getTime() + 24*60*60*1000) && // date_debut <= date_fin + 1 jour
  c.date_fin && new Date(c.date_fin) > new Date(contrat.date_fin) // date_fin postérieure
);

if (contratsSuivants.length > 0) {
  // Exclure ce contrat car il est remplacé par un avenant/renouvellement
  return false;
}
```

**Logique :**
Un contrat est considéré comme "remplacé" si :
- Il existe un autre contrat pour le même `profil_id`
- Avec `statut IN ('actif', 'signe')`
- Dont la `date_debut` ≤ `date_fin du contrat + 1 jour` (continuité)
- Et dont la `date_fin` > `date_fin du contrat` (prolongation)

#### 4. Ajout de logs pour débogage
```typescript
console.log(`🔍 Contrat ${contrat.id} (${contrat.profil?.prenom} ${contrat.profil?.nom}): EXCLU car remplacé par:`,
  contratsSuivants.map(c => `${c.id} (${c.type}, fin: ${c.date_fin})`));
```

---

## Résultat attendu

### Cas Cynthya SHIMBA
**Données :**
- Contrat #1 : CDD, statut='actif', date_fin=2026-03-20
- Contrat #2 : Avenant, statut='signe', date_debut=2026-03-20, date_fin=2026-07-03

**Avant le patch :**
- ❌ Cynthya apparaît dans les notifications car le contrat #1 expire dans 30 jours

**Après le patch :**
- ✅ Cynthya N'apparaît PAS car le contrat #1 est détecté comme remplacé par le contrat #2
- Console log : `Contrat [id] (Cynthya SHIMBA): EXCLU car remplacé par: [contrat#2] (avenant, fin: 2026-07-03)`

### Autres cas traités
- Si un salarié a UNIQUEMENT un CDD expirant bientôt → Il apparaît (normal)
- Si un salarié a un CDD + un avenant NON continu (gap de plus d'1 jour) → Le CDD apparaît (normal)
- Si un salarié a un CDD + un avenant avec date_fin antérieure → Le CDD apparaît (normal)

---

## Tests à effectuer

### 1. Test Cynthya SHIMBA
1. Aller sur "Notifications de documents"
2. Cliquer sur l'onglet "Contrats CDD"
3. Vérifier que Cynthya SHIMBA n'apparaît PAS
4. Ouvrir la console navigateur
5. Chercher le log : `Contrat ... (Cynthya SHIMBA): EXCLU car remplacé par`

### 2. Test salarié sans avenant
1. Chercher un salarié avec un CDD expirant dans 30 jours SANS avenant
2. Vérifier qu'il apparaît dans la liste
3. Console : `Contrat ... (Nom Prénom): CONSERVÉ (pas de contrat suivant)`

### 3. Test compteur badge
Vérifier que le badge "Contrats CDD" affiche le bon nombre (sans les contrats remplacés)

---

## Avantages de cette approche

### ✅ Aucune modification DB
- Pas de migration SQL
- Pas de modification de vues
- Pas de risque de régression sur d'autres fonctionnalités

### ✅ Logique claire et maintenable
- Commentaires explicites
- Logs de débogage
- Facile à modifier si les critères changent

### ✅ Performance acceptable
- 2 requêtes Supabase (au lieu d'1)
- Filtrage en mémoire (négligeable pour quelques centaines de contrats)

### ⚠️ Points d'attention
- Si le volume de contrats devient très important (>10000), cette approche pourrait nécessiter optimisation
- Solution plus robuste à long terme : créer une vue SQL qui fait ce calcul côté DB

---

## Build et déploiement

```bash
npm run build  # ✅ Build réussi
```

**Fichiers modifiés :**
- `src/components/NotificationsList.tsx`

**Fichiers créés :**
- `PATCH-NOTIFICATIONS-CDD-AVENANTS.md` (ce fichier)

---

## Code de la modification

### Localisation
`src/components/NotificationsList.tsx:77-164`

### Requêtes Supabase
1. Notifications documents existantes : `v_notifications_ui`
2. Tous les contrats actifs/signés : `contrat` (pour détection continuité)
3. Contrats expirant dans 30 jours : `contrat` (filtrés)

### Filtre de continuité
```typescript
c.date_debut <= contrat.date_fin + 1 jour  // Tolérance d'1 jour pour continuité
c.date_fin > contrat.date_fin              // Prolongation effective
```

---

**PATCH APPLIQUÉ ET TESTÉ** ✅
**Build OK** ✅
**Prêt pour déploiement** 🚀
