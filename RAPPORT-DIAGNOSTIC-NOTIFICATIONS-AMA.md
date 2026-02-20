# RAPPORT DIAGNOSTIC - Notifications Ama GOUFADO

Date du diagnostic : 2026-02-20 12:33 UTC
Profil ID : 5c432ff4-4d5a-424f-bb87-4a413349cc18
Contrat ID : 28254d58-efe1-4634-9ef1-d1f020a218b3

---

## 1. FICHIER ET FONCTIONS

**Fichier principal :**
- `src/components/NotificationsList.tsx`

**Fonctions clés :**
- `fetchNotifications()` (ligne 61-229) : Charge toutes les notifications
- `getTabCount()` (ligne 303-316) : Compte les notifications par onglet
- `filteredNotifications` (ligne 277-294) : Filtre les notifications affichées

---

## 2. SOURCES DE DONNÉES

### 2.1 Vue `v_notifications_ui`

**Définition SQL :**
```sql
SELECT id, type, profil_id, date_echeance, date_notification, statut,
       email_envoye_at, email_envoye_par, metadata, created_at,
       updated_at, incident_id
FROM notification
WHERE statut = 'active'
  AND date_echeance IS NOT NULL
  AND date_echeance >= CURRENT_DATE
  AND date_echeance <= (CURRENT_DATE + 30);
```

**Requête front (ligne 64-70) :**
```javascript
const { data: notifData } = await supabase
  .from('v_notifications_ui')
  .select(`
    *,
    profil:profil_id(prenom, nom, email, statut)
  `)
  .order('date_echeance', { ascending: true });
```

**Résultat pour Ama :**
✅ **AUCUNE LIGNE** - Ama n'a pas de ligne dans `public.notification`

---

### 2.2 Table `contrat` (CDD)

**Requête front (ligne 83-98) :**
```javascript
const today = new Date();
const futureDate = new Date();
futureDate.setDate(today.getDate() + 30);

const { data: contratData } = await supabase
  .from('contrat')
  .select(`
    id, profil_id, date_fin, type, statut,
    avenant_1_date_fin, avenant_2_date_fin,
    profil:profil_id(prenom, nom, email, statut)
  `)
  .eq('statut', 'actif')
  .gte('date_fin', today.toISOString().split('T')[0])
  .lte('date_fin', futureDate.toISOString().split('T')[0])
  .neq('profil.statut', 'inactif');
```

**Données Ama dans la DB :**
```json
{
  "id": "28254d58-efe1-4634-9ef1-d1f020a218b3",
  "profil_id": "5c432ff4-4d5a-424f-bb87-4a413349cc18",
  "date_fin": "2026-02-20",
  "type": null,
  "statut": "actif",
  "profil_statut": "actif",
  "jours_restants": 0
}
```

**Résultat pour Ama :**
✅ **PRÉSENTE** - Ama EST dans les résultats SQL (confirmé)

---

### 2.3 Table `contrat` (Avenant 1)

**Requête front (ligne 123-137) :**
```javascript
const { data: avenant1Data } = await supabase
  .from('contrat')
  .select(...)
  .eq('statut', 'actif')
  .not('avenant_1_date_fin', 'is', null)
  .gte('avenant_1_date_fin', today.toISOString().split('T')[0])
  .lte('avenant_1_date_fin', futureDate.toISOString().split('T')[0])
  .neq('profil.statut', 'inactif');
```

**Résultat pour Ama :** N/A (pas d'avenant_1_date_fin)

---

### 2.4 Table `contrat` (Avenant 2)

**Requête front (ligne 161-175) :**
```javascript
const { data: avenant2Data } = await supabase
  .from('contrat')
  .select(...)
  .eq('statut', 'actif')
  .not('avenant_2_date_fin', 'is', null)
  .gte('avenant_2_date_fin', today.toISOString().split('T')[0])
  .lte('avenant_2_date_fin', futureDate.toISOString().split('T')[0])
  .neq('profil.statut', 'inactif');
```

**Résultat pour Ama :** N/A (pas d'avenant_2_date_fin)

---

## 3. LOGIQUE DE FUSION ET DÉDOUBLONNAGE

**Code (ligne 198-213) :**
```javascript
const allNotifications = [...(notifData || [])];

const existingKeys = new Set(
  allNotifications.map(n => `${n.type}-${n.profil_id}-${n.date_echeance}`)
);

// Ajouter les contrats qui n'ont pas déjà une notification
[...contratNotifications, ...avenant1Notifications, ...avenant2Notifications].forEach(n => {
  const key = `${n.type}-${n.profil_id}-${n.date_echeance}`;
  if (!existingKeys.has(key)) {
    allNotifications.push(n);
  }
});
```

**Clé de dédoublonnage :**
```
type-profil_id-date_echeance
```

**Stratégie :**
- Priorité : notifications de `public.notification` (via `v_notifications_ui`)
- Ajout : contrats de la DB uniquement si pas déjà présents

**Résultat pour Ama :**
✅ **DEVRAIT ÊTRE AJOUTÉE** - Pas de ligne dans `notification` donc devrait être ajoutée depuis `contrat`

---

## 4. LOGIQUE DE DATE

### 4.1 Calcul côté JavaScript

**Code (ligne 79-81) :**
```javascript
const today = new Date();  // Date locale du navigateur
const futureDate = new Date();
futureDate.setDate(today.getDate() + 30);
```

**Conversion pour Supabase (ligne 96-97) :**
```javascript
.gte('date_fin', today.toISOString().split('T')[0])
.lte('date_fin', futureDate.toISOString().split('T')[0])
```

**Exemple de calcul :**
```
today = new Date() → "2026-02-20T12:33:12.000Z"
today.toISOString().split('T')[0] → "2026-02-20"
futureDate → "2026-03-22"
```

### 4.2 Calcul côté DB

**Vue `v_notifications_ui` :**
```sql
WHERE date_echeance >= CURRENT_DATE
  AND date_echeance <= (CURRENT_DATE + 30)
```

**DB aujourd'hui :**
```
CURRENT_DATE = 2026-02-20 (confirmé par SQL)
```

### 4.3 Problème de timezone ?

❌ **PAS DE PROBLÈME DE TIMEZONE DÉTECTÉ**
- `.toISOString().split('T')[0]` retourne toujours "YYYY-MM-DD"
- Même si le navigateur est en UTC-5, `new Date()` en UTC donne `2026-02-20`
- La DB utilise aussi `2026-02-20`

---

## 5. FILTRAGE UI

### 5.1 Filtre par onglet (ligne 277-284)

**Code :**
```javascript
const filteredNotifications = notifications
  .filter(n => {
    if (activeTab === 'contrat_cdd') {
      // Gérer à la fois 'cdd' (depuis v_notifications_ui) et 'contrat_cdd' (depuis contrat)
      return n.type === 'cdd' || n.type === 'contrat_cdd';
    }
    return n.type === activeTab;
  })
```

**Pour Ama :**
- `n.type = 'contrat_cdd'` (créé par la transformation ligne 105-120)
- `activeTab = 'contrat_cdd'` → ✅ **PASSE LE FILTRE**

### 5.2 Filtre par statut (ligne 285)

**Code :**
```javascript
.filter(n => filterStatut === 'all' || n.statut === filterStatut)
```

**Pour Ama :**
- `n.statut = 'active'` (ligne 111)
- `filterStatut = 'all'` (par défaut) → ✅ **PASSE LE FILTRE**

### 5.3 Filtre de recherche (ligne 286-293)

**Code :**
```javascript
.filter(n => {
  if (!searchTerm) return true;
  const searchLower = searchTerm.toLowerCase();
  return (
    n.profil?.nom?.toLowerCase().includes(searchLower) ||
    n.profil?.prenom?.toLowerCase().includes(searchLower) ||
    n.profil?.email?.toLowerCase().includes(searchLower)
  );
});
```

**Pour Ama :**
- Si `searchTerm` vide → ✅ **PASSE LE FILTRE**

---

## 6. COMPTEUR D'ONGLET

**Code (ligne 303-316) :**
```javascript
const getTabCount = (type: string) => {
  const filtered = notifications.filter(n => {
    if (type === 'contrat_cdd') {
      // Compter à la fois 'cdd' et 'contrat_cdd'
      if (n.type !== 'cdd' && n.type !== 'contrat_cdd') return false;
    } else if (n.type !== type) {
      return false;
    }
    if (n.statut === 'resolue' || n.statut === 'ignoree') return false;
    return true;
  });
  return filtered.length;
};
```

**Pour Ama :**
- `n.type = 'contrat_cdd'` → ✅ **COMPTÉE**
- `n.statut = 'active'` → ✅ **COMPTÉE**

---

## 7. PROBLÈME IDENTIFIÉ

### ⚠️ BUG CRITIQUE : Filtre Supabase sur relation

**Ligne 98 :**
```javascript
.neq('profil.statut', 'inactif')
```

**Ce filtre NE FONCTIONNE PAS comme prévu avec Supabase !**

Supabase a un comportement connu avec les filtres sur les relations :
- `.neq('profil.statut', 'inactif')` peut être ignoré ou mal appliqué
- Les filtres sur relations imbriquées nécessitent une syntaxe spéciale

**Test SQL confirmé :**
Sans le filtre, on obtient 18 contrats incluant :
- ✅ Ama (profil_statut = 'actif')
- ❌ Harry Damas-Agis (profil_statut = 'inactif')
- ❌ Ramachia BERROUANE (profil_statut = 'inactif')
- ❌ Didier SOUGY (profil_statut = 'inactif')

### ⚠️ AUTRE POSSIBILITÉ : RLS sur table profil

Si des RLS existent sur `profil`, le join peut échouer silencieusement.

---

## 8. OÙ AMA DISPARAÎT

**Hypothèses par ordre de probabilité :**

### Hypothèse #1 (TRÈS PROBABLE) : RLS sur table profil
Le join `profil:profil_id(...)` échoue à cause des RLS, donc `contrat.profil` est `null`

**Ligne 119 :**
```javascript
profil: contrat.profil  // Si null, crash ou objet vide
```

### Hypothèse #2 (POSSIBLE) : Erreur Supabase silencieuse
Le filtre `.neq('profil.statut', 'inactif')` cause une erreur mais `contratError` n'est pas vérifié correctement (ligne 100-102)

### Hypothèse #3 (MOINS PROBABLE) : Bug de transformation
La transformation ligne 105-120 échoue pour certains contrats

---

## 9. VÉRIFICATIONS NÉCESSAIRES

Pour confirmer où Ama disparaît :

1. ✅ **Contrat existe dans DB** - Confirmé
2. ✅ **Date dans fenêtre 30j** - Confirmé (expire aujourd'hui)
3. ✅ **Statut = 'actif'** - Confirmé
4. ❓ **Profil accessible via RLS** - À vérifier
5. ❓ **Requête Supabase retourne Ama** - À tester dans browser
6. ❓ **Transformation en notification réussit** - À vérifier logs console

---

## 10. TESTS À EFFECTUER

### Test 1 : RLS sur profil
```sql
-- Se connecter avec l'utilisateur connecté et vérifier :
SELECT * FROM profil WHERE id = '5c432ff4-4d5a-424f-bb87-4a413349cc18';
```

### Test 2 : Requête complète dans browser console
```javascript
const today = new Date();
const futureDate = new Date();
futureDate.setDate(today.getDate() + 30);

const { data, error } = await supabase
  .from('contrat')
  .select(`
    id,
    profil_id,
    date_fin,
    profil:profil_id(prenom, nom, email, statut)
  `)
  .eq('statut', 'actif')
  .gte('date_fin', today.toISOString().split('T')[0])
  .lte('date_fin', futureDate.toISOString().split('T')[0]);

console.log('Contrats récupérés:', data);
console.log('Erreur:', error);
console.log('Ama présente?', data?.find(c => c.profil_id === '5c432ff4-4d5a-424f-bb87-4a413349cc18'));
```

### Test 3 : Logs console
Chercher dans la console du navigateur :
```
✅ Notifications totales: {
  documents: X,
  contrats: Y,  ← Vérifier si > 0
  avenants1: Z,
  avenants2: W,
  total: T
}
```

---

## 11. SOLUTION RECOMMANDÉE

### Option A : Retirer le filtre profil.statut (ligne 98)
```javascript
// AVANT
.neq('profil.statut', 'inactif')

// APRÈS
// (retirer cette ligne)
```

Puis filtrer côté front :
```javascript
const contratNotifications = (contratData || [])
  .filter(c => c.profil?.statut !== 'inactif')  // Filtrer ici
  .map(contrat => ({...}));
```

### Option B : Utiliser un filtre direct sur profil_id
Créer une vue `v_profils_actifs` et filtrer avec `.in()`.

---

## 12. CONCLUSION

**État actuel :**
- ✅ Contrat Ama existe et répond aux critères (date_fin = 2026-02-20, statut = actif)
- ✅ Requête SQL raw retourne Ama
- ❓ Requête Supabase front retourne Ama ? (à tester)
- ❓ Logs console montrent Ama ? (à vérifier)

**Étape suivante :**
Exécuter Test 2 dans le navigateur pour confirmer si Ama est bien récupérée par Supabase JS.

**Prochaine action si Test 2 échoue :**
Appliquer Solution A (retirer le filtre `.neq()` et filtrer côté front).
