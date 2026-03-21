# Déploiement : Fix affichage finition, energie, couleur

## Problème

Les véhicules existants qui ont des valeurs pour **finition**, **energie**, **couleur** ne les affichent pas dans le modal détail.

**Exemple** :
```
Véhicule AZ123EY en BDD:
  finition = "BUSINESS"
  energie  = "Diesel"
  couleur  = "BLANC"

Affichage dans le modal:
  finition = (vide)
  energie  = (vide)
  couleur  = (vide)
```

## Diagnostic

### Cause racine

La vue `v_vehicles_list_ui` utilisée par `VehicleListNew.tsx` ne sélectionne **PAS** les colonnes `finition`, `energie`, `couleur`.

**Fichier SQL d'origine** : `FIX-VUE-VEHICLES-FINAL.sql`
- Lignes 18-55 : Liste des colonnes sélectionnées
- `finition`, `energie`, `couleur` sont **absents**

**Conséquence** :
```typescript
// Dans VehicleListNew.tsx ligne 126
const { data, error } = await supabase
  .from('v_vehicles_list_ui')  // ← Vue incomplète
  .select('*');

// Résultat : finition, energie, couleur sont undefined/null
```

### Pourquoi le modal détail ne les affiche pas non plus ?

Le modal `VehicleDetailModal` reçoit l'objet `vehicle` depuis `VehicleListNew`, qui vient de `v_vehicles_list_ui`.

**Flux de données** :
```
1. VehicleListNew charge depuis v_vehicles_list_ui
   → finition, energie, couleur absents

2. VehicleListNew passe vehicle à VehicleDetailModal
   → finition, energie, couleur = undefined

3. VehicleDetailModal affiche editedVehicle
   → Champs vides même si les données existent en BDD
```

**Note importante** : Le modal détail charge bien les données depuis la table `vehicule` dans `fetchVehicleDetails()` (ligne 96-99), mais l'**état initial** vient de la prop `vehicle` qui est incomplète.

## Solution

### Étape 1 : Mettre à jour la vue SQL

**Fichier** : `FIX-VUE-VEHICLES-AJOUTER-3-CHAMPS.sql`

**Action** :
```sql
DROP VIEW IF EXISTS v_vehicles_list_ui CASCADE;

CREATE VIEW v_vehicles_list_ui AS
SELECT
  v.id,
  v.immatriculation,
  v.immat_norm,
  v.ref_tca,
  v.marque,
  v.modele,
  v.finition,        -- ✅ AJOUTÉ
  v.energie,         -- ✅ AJOUTÉ
  v.couleur,         -- ✅ AJOUTÉ
  v.annee,
  ...
FROM vehicule v;
```

**Exécution** :
```bash
# Via Supabase SQL Editor
Copier/coller le contenu de FIX-VUE-VEHICLES-AJOUTER-3-CHAMPS.sql
```

### Étape 2 : Vérification

**Test 1 : Colonnes présentes dans la vue**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list_ui'
  AND column_name IN ('finition', 'energie', 'couleur')
ORDER BY column_name;
```

**Résultat attendu** :
```
column_name | data_type
------------|----------
couleur     | text
energie     | text
finition    | text
```

**Test 2 : Données pour AZ123EY**
```sql
SELECT
  immatriculation,
  ref_tca,
  marque,
  modele,
  finition,
  energie,
  couleur,
  mode_acquisition
FROM v_vehicles_list_ui
WHERE immatriculation = 'AZ123EY';
```

**Résultat attendu** :
```
immatriculation | ref_tca | marque  | modele | finition | energie | couleur | mode_acquisition
----------------|---------|---------|--------|----------|---------|---------|------------------
AZ123EY         | 819     | Hyundai | i20    | BUSINESS | Diesel  | BLANC   | LOA
```

**Test 3 : Véhicules avec finition/energie/couleur**
```sql
SELECT
  immatriculation,
  finition,
  energie,
  couleur
FROM v_vehicles_list_ui
WHERE finition IS NOT NULL
   OR energie IS NOT NULL
   OR couleur IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Étape 3 : Test dans l'interface

1. Ouvrir la page **Véhicules** (VehicleListNew)
2. Cliquer sur un véhicule avec finition/energie/couleur (ex: AZ123EY)
3. Le modal détail s'ouvre
4. Vérifier l'onglet **Identification** :
   ```
   ✅ Finition : BUSINESS
   ✅ Énergie  : Diesel
   ✅ Couleur  : BLANC
   ```

5. Vérifier dans la console du navigateur :
   ```
   [AUDIT 4 CHAMPS] finition: BUSINESS
   [AUDIT 4 CHAMPS] energie: Diesel
   [AUDIT 4 CHAMPS] couleur: BLANC
   [AUDIT 4 CHAMPS] mode_acquisition: LOA
   ```

## Comparaison : Avant / Après

### Avant le fix

**Vue v_vehicles_list_ui** :
```sql
SELECT
  v.id,
  v.immatriculation,
  v.ref_tca,
  v.marque,
  v.modele,
  -- ❌ finition, energie, couleur absents
  v.annee,
  ...
```

**Résultat dans l'interface** :
```
Finition : (vide)
Énergie  : (vide)
Couleur  : (vide)
```

### Après le fix

**Vue v_vehicles_list_ui** :
```sql
SELECT
  v.id,
  v.immatriculation,
  v.ref_tca,
  v.marque,
  v.modele,
  v.finition,        -- ✅ AJOUTÉ
  v.energie,         -- ✅ AJOUTÉ
  v.couleur,         -- ✅ AJOUTÉ
  v.annee,
  ...
```

**Résultat dans l'interface** :
```
Finition : BUSINESS
Énergie  : Diesel
Couleur  : BLANC
```

## Fichiers concernés

### Fichiers SQL

**1. FIX-VUE-VEHICLES-AJOUTER-3-CHAMPS.sql** (nouveau)
- DROP et recréation de `v_vehicles_list_ui` avec les 3 colonnes
- Tests de vérification inclus

**2. FIX-VUE-VEHICLES-FINAL.sql** (ancien, remplacé)
- Version précédente de la vue sans finition/energie/couleur

### Fichiers TypeScript

**1. src/components/VehicleListNew.tsx**
- Interface `Vehicle` déjà correcte (lignes 40-42)
- Charge depuis `v_vehicles_list_ui` (ligne 126)
- Aucune modification nécessaire

**2. src/components/VehicleDetailModal.tsx**
- Interface `Vehicle` déjà correcte (lignes 18-20)
- Affichage des 3 champs déjà présent (lignes 666-711)
- Logs de diagnostic déjà en place (lignes 165-182)
- Aucune modification nécessaire

**3. src/components/VehicleCreateModal.tsx**
- Déjà corrigé dans le fix précédent (CORRECTIF-CREATION-VEHICULE-4-CHAMPS.md)

## Complémentarité des correctifs

Ce fix est complémentaire au correctif précédent :

### Correctif 1 : CORRECTIF-CREATION-VEHICULE-4-CHAMPS.md
- **Problème** : Champs vides lors de la **création** de véhicule
- **Cause** : `finition`, `energie`, `couleur` absents de `textFields` dans `cleanPayloadForInsert`
- **Fichier** : `VehicleCreateModal.tsx`
- **Impact** : Nouveaux véhicules

### Correctif 2 : DEPLOYER-FIX-3-CHAMPS-AFFICHAGE.md (ce fichier)
- **Problème** : Champs vides lors de l'**affichage** des véhicules existants
- **Cause** : `finition`, `energie`, `couleur` absents de la vue `v_vehicles_list_ui`
- **Fichier** : `FIX-VUE-VEHICLES-AJOUTER-3-CHAMPS.sql`
- **Impact** : Véhicules existants

**Avec les 2 correctifs** :
- ✅ Les nouveaux véhicules sauvegardent correctement finition/energie/couleur
- ✅ Les véhicules existants affichent correctement finition/energie/couleur

## Rollback (si nécessaire)

Si le déploiement cause des problèmes, revenir à la version précédente :

```sql
-- Revenir à la version sans finition/energie/couleur
-- (exécuter le contenu de FIX-VUE-VEHICLES-FINAL.sql)
```

**Note** : Il n'y a aucun risque de perte de données. Les colonnes `finition`, `energie`, `couleur` existent dans la table `vehicule`, seule la vue change.

## Résumé

**Problème identifié** : ✅ Vue `v_vehicles_list_ui` incomplète

**Solution appliquée** : ✅ Ajout de `finition`, `energie`, `couleur` à la vue

**Fichiers modifiés** :
- ✅ 1 nouveau fichier SQL : `FIX-VUE-VEHICLES-AJOUTER-3-CHAMPS.sql`
- ✅ 0 fichier TypeScript (déjà corrects)

**Tests** : ✅ 3 tests SQL de vérification inclus

**Impact** : ✅ Véhicules existants afficheront leurs données

**Risque** : ✅ Aucun (pas de modification de données)

**Prêt pour déploiement** : ✅ OUI

---

## Commandes rapides

```bash
# 1. Exécuter le fix SQL
# Copier le contenu de FIX-VUE-VEHICLES-AJOUTER-3-CHAMPS.sql
# dans Supabase SQL Editor et exécuter

# 2. Vérifier
# Exécuter les 3 tests SQL inclus dans le fichier

# 3. Tester dans l'interface
# Ouvrir VehicleListNew → Cliquer sur AZ123EY → Vérifier affichage
```
