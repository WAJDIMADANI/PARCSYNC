# Correction Dashboard RH - Carte Incidents

## Problème identifié

La carte "Incidents" du Tableau de bord RH affichait un **nombre incorrect** car elle comptait les incidents legacy de la table `public.incident` :

- `type = 'contrat_expirer'` : 199 lignes (legacy, doublons)
- `type = 'avenant_expirer'` : 61 lignes (legacy, doublons)

Ces incidents sont des **doublons** car les vrais incidents de contrats et avenants expirés sont gérés par les fonctions RPC :
- `public.get_contrats_expires()` pour les CDD
- `public.get_avenants_expires()` pour les avenants

## Solution appliquée

La carte "Incidents" calcule maintenant le total **exactement comme la page Incidents** :

```typescript
total = docsCount + cddCount + avenantCount
```

Où :

### 1. `docsCount` - Incidents de documents

```typescript
const { data: documentsIncidents } = await supabase
  .from('incident')
  .select('...')
  .in('type', ['titre_sejour', 'visite_medicale', 'permis_conduire'])
  .in('statut', ['actif', 'en_cours']);

const docsCount = documentsIncidents?.length || 0;
```

**Uniquement les types de documents valides, statuts actifs.**

### 2. `cddCount` - Contrats CDD expirés

```typescript
const { data: cddData } = await supabase.rpc('get_contrats_expires');
const cddCount = cddData?.length || 0;
```

**Utilise la même RPC que l'onglet CDD de la page Incidents.**

### 3. `avenantCount` - Avenants expirés

```typescript
const { data: avenantsData } = await supabase.rpc('get_avenants_expires');
const avenantCount = avenantsData?.length || 0;
```

**Utilise la RPC pour les avenants expirés.**

## Types d'incidents exclus (legacy)

Le code exclut maintenant **explicitement** les types legacy :

```typescript
const LEGACY_TYPES = ['contrat_expirer', 'avenant_expirer'];
```

Ces types ne sont **jamais** comptés dans les statistiques du dashboard.

## Modifications apportées

### Fichier modifié

`src/components/RHDashboard.tsx` - Fonction `fetchIncidentsStats()`

### Changements clés

#### 1. Calcul du total (lignes 426-456)

**Avant :**
- Récupérait tous les incidents de la table `incident`
- Incluait les types legacy dans le total

**Après :**
```typescript
// 1. Documents uniquement (types valides, statuts actifs)
const docsCount = documentsIncidents?.length || 0;

// 2. CDD expirés (via RPC)
const cddCount = cddData?.length || 0;

// 3. Avenants expirés (via RPC)
const avenantCount = avenantsData?.length || 0;

// 4. Total exact
const totalIncidents = docsCount + cddCount + avenantCount;
```

#### 2. Données pour statistiques détaillées (lignes 458-483)

Les CDD et avenants sont transformés en objets incidents pour l'affichage :

```typescript
const cddIncidents = (cddData || []).map(cdd => ({
  id: `cdd-${cdd.profil_id}-${cdd.contrat_id}`,
  type: 'contrat_expire',
  created_at: cdd.date_fin || new Date().toISOString(),
  statut: 'actif',
  profil_id: cdd.profil_id,
  profil: { prenom: cdd.prenom, nom: cdd.nom, email: cdd.email },
  contrat_type: 'CDD'
}));
```

Idem pour les avenants avec `contrat_type: 'Avenant'`.

#### 3. Comptage par type (lignes 512-539)

**Avant :**
- Comptait tous les types d'incidents trouvés

**Après :**
```typescript
const typeCountMap: { [key: string]: number } = {
  'Titre de séjour': 0,
  'Visite médicale': 0,
  'Permis de conduire': 0,
  'Contrat CDD expiré': 0,
  'Avenant expiré': 0,
};

// Compte uniquement ces types spécifiques
incidents.forEach((i: any) => {
  if (i.type === 'titre_sejour') {
    typeCountMap['Titre de séjour']++;
  } else if (i.type === 'visite_medicale') {
    typeCountMap['Visite médicale']++;
  } else if (i.type === 'permis_conduire') {
    typeCountMap['Permis de conduire']++;
  } else if (i.type === 'contrat_expire') {
    if (i.contrat_type === 'CDD') {
      typeCountMap['Contrat CDD expiré']++;
    } else if (i.contrat_type === 'Avenant') {
      typeCountMap['Avenant expiré']++;
    }
  }
});
```

Les types legacy ne sont jamais comptés.

#### 4. Incidents récents (lignes 561-568)

Tri par date de création (du plus récent au plus ancien) :

```typescript
const recents = incidents
  .sort((a, b) => {
    const dateA = new Date(a.created_at || a.date_creation_incident || 0);
    const dateB = new Date(b.created_at || b.date_creation_incident || 0);
    return dateB.getTime() - dateA.getTime();
  })
  .slice(0, 5);
```

## Résultat attendu

### Avant la correction

```
Incidents : 260+
  - 199 contrat_expirer (legacy)
  - 61 avenant_expirer (legacy)
  - Vrais incidents (documents + RPC)
```

### Après la correction

```
Incidents : [Nombre réel]
  - X Titre de séjour
  - X Visite médicale
  - X Permis de conduire
  - X Contrat CDD expiré (via RPC)
  - X Avenant expiré (via RPC)
```

Le nombre affiché correspond maintenant **exactement** au nombre d'incidents de la page Incidents.

## Cohérence avec la page Incidents

La carte Dashboard utilise maintenant :

| Source | Dashboard RH | Page Incidents | Statut |
|--------|--------------|----------------|--------|
| Documents | `incident` table (types valides uniquement) | `incident` table (types valides) | ✅ Cohérent |
| CDD expirés | `get_contrats_expires()` | `get_contrats_expires()` | ✅ Cohérent |
| Avenants expirés | `get_avenants_expires()` | `get_avenants_expires()` | ✅ Cohérent |
| Types legacy | ❌ Exclus | ❌ Exclus | ✅ Cohérent |

## Test de vérification

Pour vérifier que la correction fonctionne :

1. **Ouvrir le Tableau de bord RH**
   - Noter le nombre total d'incidents affiché

2. **Ouvrir la page Incidents**
   - Compter les incidents dans chaque onglet :
     - Onglet "Documents" (titre de séjour, visite médicale, permis de conduire)
     - Onglet "Contrats CDD"
     - Onglet "Avenants"

3. **Vérifier la cohérence**
   ```
   Total Dashboard = Documents + CDD + Avenants
   ```

## Vérification SQL (optionnelle)

Pour vérifier qu'il reste des incidents legacy dans la base :

```sql
-- Compter les incidents legacy
SELECT
  type,
  COUNT(*) as count
FROM public.incident
WHERE type IN ('contrat_expirer', 'avenant_expirer')
GROUP BY type;

-- Résultat attendu :
-- type              | count
-- contrat_expirer   | 199
-- avenant_expirer   | 61
```

Ces incidents existent toujours dans la base mais ne sont **plus comptés** dans le dashboard.

## Notes importantes

### Pourquoi ne pas supprimer les incidents legacy ?

Les incidents legacy sont conservés pour :
- L'historique
- Les audits
- Éviter de perdre des données

Ils sont simplement **ignorés** lors des calculs.

### Qu'arrive-t-il si de nouveaux incidents legacy sont créés ?

Le code exclut automatiquement tous les incidents avec `type IN ('contrat_expirer', 'avenant_expirer')`.

Si de nouveaux incidents de ces types sont créés (ce qui ne devrait pas arriver), ils seront automatiquement exclus des statistiques.

## Fichier modifié

- ✅ `src/components/RHDashboard.tsx`
  - Fonction `fetchIncidentsStats()` complètement réécrite
  - Lignes 418-584 (environ 166 lignes)

## Build

✅ Le projet compile sans erreurs :
```
vite v5.4.21 building for production...
✓ built in 26.50s
```

## Résumé

| Aspect | Avant | Après |
|--------|-------|-------|
| Total incidents | 260+ (avec legacy) | [Réel] (sans legacy) |
| Source données | Table `incident` | RPC + table `incident` (filtré) |
| Types comptés | Tous | Uniquement valides |
| Cohérence | ❌ Différent de page Incidents | ✅ Identique à page Incidents |
| Legacy inclus | ✅ Oui (erreur) | ❌ Non (correct) |

La carte "Incidents" du Dashboard RH affiche maintenant le **nombre réel et correct** d'incidents, en parfaite cohérence avec la page Incidents.
