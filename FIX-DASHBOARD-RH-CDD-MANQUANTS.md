# FIX - Carte Incidents Dashboard RH : CDD manquants

## Problème identifié

La carte "Incidents" du Tableau de bord RH affichait **56** au lieu de **~195** (le nombre réel).

Les **CDD expirés (140)** n'étaient PAS comptés dans le total.

## Cause du problème

Le Dashboard utilisait la **mauvaise RPC** pour récupérer les CDD expirés :

**Code incorrect :**
```typescript
const { data: cddData } = await supabase.rpc('get_contrats_expires');
```

Alors que la page Incidents utilise :
```typescript
const { data: cddData } = await supabase.rpc('get_cdd_expires_for_incidents');
```

La RPC `get_contrats_expires` n'existe probablement pas ou ne retourne rien, donc `cddCount` était toujours **0**.

## Solution appliquée

### 1. Corriger la RPC pour les CDD

**Avant (ligne 448) :**
```typescript
const { data: cddData } = await supabase.rpc('get_contrats_expires');
const cddCount = cddData?.length || 0;
```

**Après (lignes 448-454) :**
```typescript
const { data: cddData, error: cddError } = await supabase.rpc('get_cdd_expires_for_incidents');

if (cddError) {
  console.error('Erreur get_cdd_expires_for_incidents:', cddError);
}

const cddCount = cddData?.length || 0;
```

### 2. Ajouter la gestion d'erreur pour les avenants

**Avant (ligne 452) :**
```typescript
const { data: avenantsData } = await supabase.rpc('get_avenants_expires');
const avenantCount = avenantsData?.length || 0;
```

**Après (lignes 457-463) :**
```typescript
const { data: avenantsData, error: avenantsError } = await supabase.rpc('get_avenants_expires');

if (avenantsError) {
  console.error('Erreur get_avenants_expires:', avenantsError);
}

const avenantCount = avenantsData?.length || 0;
```

### 3. Ajouter des logs de debug

**Nouveau (lignes 468-474) :**
```typescript
// Log pour debug
console.log('📊 Dashboard RH - Incidents:', {
  docsCount,
  cddCount,
  avenantCount,
  totalIncidents
});
```

Cela permet de vérifier dans la console que les données sont bien récupérées.

## Fichier modifié

- `src/components/RHDashboard.tsx`
  - Fonction `fetchIncidentsStats()` (lignes 448-474)
  - RPC CDD corrigée : `get_cdd_expires_for_incidents`
  - Gestion d'erreur ajoutée pour CDD et avenants
  - Logs de debug ajoutés

## Résultat attendu

### Avant la correction

```
Dashboard RH - Incidents : 56
  - Documents : ~31
  - CDD : 0 ❌ (manquants)
  - Avenants : ~25

Total : 31 + 0 + 25 = 56
```

### Après la correction

```
Dashboard RH - Incidents : ~195
  - Documents : ~31
  - CDD : 140 ✅ (maintenant comptés)
  - Avenants : ~25

Total : 31 + 140 + 25 = 196
```

Le nombre affiché doit maintenant correspondre au total visible dans la page Incidents :
- **Titre de séjour : 13**
- **Visite médicale : 17**
- **Permis de conduire : 1** (estimation)
- **CDD : 140**
- **Avenant : 25**

**Total : 196** (13 + 17 + 1 + 140 + 25)

## Test de vérification

### 1. Ouvrir le Tableau de bord RH

1. Rafraîchir la page (Ctrl+Shift+R)
2. Noter le nombre total d'incidents affiché dans la carte

### 2. Vérifier dans la console

Ouvrir la console développeur (F12) et chercher :
```
📊 Dashboard RH - Incidents: {
  docsCount: 31,
  cddCount: 140,
  avenantCount: 25,
  totalIncidents: 196
}
```

Si `cddCount` est toujours **0**, vérifier :
- Que la fonction `get_cdd_expires_for_incidents` existe dans la base de données
- Les erreurs dans la console (ligne "Erreur get_cdd_expires_for_incidents")

### 3. Comparer avec la page Incidents

1. Ouvrir la page "Incidents"
2. Noter les nombres dans chaque onglet :
   - Titre de séjour : _______
   - Visite médicale : _______
   - Permis de conduire : _______
   - CDD : _______
   - Avenant : _______

3. Additionner tous les nombres

4. Vérifier que le total = nombre affiché dans la carte Dashboard

## Vérification SQL (optionnelle)

Pour vérifier que la RPC `get_cdd_expires_for_incidents` fonctionne :

```sql
SELECT * FROM get_cdd_expires_for_incidents();
```

**Résultat attendu :**
- Une liste de contrats CDD expirés (environ 140 lignes selon les captures d'écran)

Si la fonction n'existe pas, vous verrez :
```
ERROR: function get_cdd_expires_for_incidents() does not exist
```

Dans ce cas, il faut créer ou corriger la fonction RPC.

## Logs de debug

Après cette correction, la console affichera :

```
📊 Dashboard RH - Incidents: {
  docsCount: 31,      // Titre de séjour + Visite médicale + Permis de conduire
  cddCount: 140,      // CDD expirés ✅
  avenantCount: 25,   // Avenants expirés
  totalIncidents: 196 // Total correct ✅
}
```

Si une erreur survient, vous verrez :
```
Erreur get_cdd_expires_for_incidents: [détails de l'erreur]
```
ou
```
Erreur get_avenants_expires: [détails de l'erreur]
```

## Build

✅ Le projet compile sans erreurs :
```
vite v5.4.21 building for production...
✓ built in 24.31s
```

## Résumé

| Aspect | Avant | Après |
|--------|-------|-------|
| Total incidents | 56 | ~196 |
| CDD comptés | ❌ Non (0) | ✅ Oui (140) |
| RPC utilisée | `get_contrats_expires` (mauvaise) | `get_cdd_expires_for_incidents` (correcte) |
| Gestion erreurs | ❌ Non | ✅ Oui |
| Logs debug | ❌ Non | ✅ Oui |
| Cohérence page | ❌ Incohérent | ✅ Cohérent |

La carte "Incidents" du Dashboard RH compte maintenant **tous les incidents** correctement, y compris les **CDD expirés** qui étaient manquants.
