# Test : Affichage finition, energie, couleur

## Objectif

Vérifier que les véhicules existants avec des valeurs pour `finition`, `energie`, `couleur` les affichent correctement dans le modal détail.

## Pré-requis

1. ✅ Correctif SQL appliqué : `FIX-VUE-VEHICLES-AJOUTER-3-CHAMPS.sql`
2. ✅ Correctif TypeScript appliqué : `CORRECTIF-CREATION-VEHICULE-4-CHAMPS.md`

## Test 1 : Vérification SQL

### Étape 1 : Vérifier la structure de la vue

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

**Si les colonnes sont absentes** : Le correctif SQL n'a pas été appliqué.

### Étape 2 : Vérifier les données pour AZ123EY

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

**Si finition/energie/couleur sont NULL** :
- Soit le véhicule n'a pas ces données en BDD
- Soit il faut vérifier dans la table `vehicule` directement :
  ```sql
  SELECT immatriculation, finition, energie, couleur
  FROM vehicule
  WHERE immatriculation = 'AZ123EY';
  ```

## Test 2 : Vérification dans l'interface

### Étape 1 : Ouvrir la liste des véhicules

1. Se connecter à l'application
2. Aller dans **Véhicules** (VehicleListNew)
3. La liste des véhicules s'affiche

### Étape 2 : Ouvrir le modal détail

1. Cliquer sur le véhicule **AZ123EY** (ou un autre avec finition/energie/couleur)
2. Le modal détail s'ouvre
3. Par défaut, l'onglet **Identification** est sélectionné

### Étape 3 : Vérifier l'affichage des 3 champs

**Onglet : Identification**

**Localisation** :
```
+-------------------------------+
| Identification                |
|-------------------------------|
| Immatriculation : AZ123EY     |
| Référence TCA   : 819         |
| Marque          : Hyundai     |
| Modèle          : i20         |
| Finition        : BUSINESS    | ← Vérifier
| Énergie         : Diesel      | ← Vérifier
| Couleur         : BLANC       | ← Vérifier
| Année           : 2024        |
| Type de véhicule: VL          |
+-------------------------------+
```

**Résultat attendu** :
```
✅ Finition : BUSINESS (visible et non vide)
✅ Énergie  : Diesel (visible et non vide)
✅ Couleur  : BLANC (visible et non vide)
```

**Si les champs sont vides** :
1. Ouvrir la console du navigateur (F12)
2. Chercher les logs `[AUDIT 4 CHAMPS]`
3. Vérifier les valeurs :
   ```
   [AUDIT 4 CHAMPS] finition: BUSINESS
   [AUDIT 4 CHAMPS] energie: Diesel
   [AUDIT 4 CHAMPS] couleur: BLANC
   ```

**Si les logs montrent les bonnes valeurs mais l'affichage est vide** :
- Problème de binding dans `VehicleDetailModal.tsx`
- Vérifier les lignes 669, 680, 708

## Test 3 : Vérification en mode édition

### Étape 1 : Activer le mode édition

1. Dans le modal détail du véhicule AZ123EY
2. Cliquer sur le bouton **Modifier** (icône crayon)
3. Le mode édition s'active

### Étape 2 : Vérifier que les champs sont éditables

**Finition** :
- Type : Input texte
- Valeur : "BUSINESS"
- Placeholder : "Ex: Premium, Business"
- État : Éditable

**Énergie** :
- Type : Select (dropdown)
- Valeur : "Diesel"
- Options : Diesel, Essence, Électrique, Hybride, GPL, GNV, Hydrogène, Autre
- État : Éditable

**Couleur** :
- Type : Input texte
- Valeur : "BLANC"
- Placeholder : "Ex: Blanc, Noir, Gris"
- État : Éditable

### Étape 3 : Modifier et sauvegarder

1. Modifier la finition : "BUSINESS" → "PREMIUM"
2. Cliquer sur **Enregistrer**
3. Fermer et rouvrir le modal
4. Vérifier : Finition = "PREMIUM"

**Résultat attendu** :
```
✅ La modification est sauvegardée
✅ La valeur s'affiche correctement après réouverture
```

## Test 4 : Vérification avec un nouveau véhicule

Ce test vérifie que le correctif de création fonctionne également.

### Étape 1 : Créer un nouveau véhicule

1. Cliquer sur **Ajouter un véhicule**
2. Remplir les champs obligatoires :
   ```
   Immatriculation : TEST123
   Marque          : Peugeot
   Modèle          : 208
   Finition        : ACTIVE
   Énergie         : Essence
   Couleur         : ROUGE
   Année           : 2024
   Type            : VL
   ```
3. Cliquer sur **Suivant** jusqu'à la fin
4. Cliquer sur **Créer le véhicule**

### Étape 2 : Vérifier la sauvegarde

```sql
SELECT
  immatriculation,
  finition,
  energie,
  couleur
FROM vehicule
WHERE immatriculation = 'TEST123';
```

**Résultat attendu** :
```
immatriculation | finition | energie | couleur
----------------|----------|---------|--------
TEST123         | ACTIVE   | Essence | ROUGE
```

### Étape 3 : Vérifier l'affichage

1. Fermer et rouvrir le modal du véhicule TEST123
2. Vérifier l'onglet **Identification**

**Résultat attendu** :
```
✅ Finition : ACTIVE
✅ Énergie  : Essence
✅ Couleur  : ROUGE
```

## Test 5 : Vérification des logs (Debug)

### Étape 1 : Ouvrir la console

1. Ouvrir la console du navigateur (F12)
2. Aller dans l'onglet **Console**
3. Filtrer par `[AUDIT` ou `[CREATION]`

### Étape 2 : Ouvrir un véhicule existant

1. Cliquer sur AZ123EY
2. Vérifier les logs dans la console :

**Logs attendus** :
```
[fetchVehicleDetails] Début refetch pour vehicule ID: xxx
[AUDIT 4 CHAMPS] finition: BUSINESS
[AUDIT 4 CHAMPS] energie: Diesel
[AUDIT 4 CHAMPS] couleur: BLANC
[AUDIT 4 CHAMPS] mode_acquisition: LOA
[AUDIT ETAT] editedVehicle après setEditedVehicle: {
  finition: "BUSINESS",
  energie: "Diesel",
  couleur: "BLANC",
  mode_acquisition: "LOA"
}
[fetchVehicleDetails] État mis à jour avec succès
```

### Étape 3 : Créer un nouveau véhicule

1. Créer un véhicule TEST456 avec finition="SPORT", energie="Diesel", couleur="NOIR"
2. Vérifier les logs dans la console :

**Logs attendus** :
```
[CREATION] formData.finition: SPORT
[CREATION] formData.energie: Diesel
[CREATION] formData.couleur: NOIR
[CREATION] formData.mode_acquisition: LOA
[CREATION] vehicleData après cleanPayloadForInsert: {
  finition: "SPORT",
  energie: "Diesel",
  couleur: "NOIR",
  mode_acquisition: "LOA"
}
```

## Résultats attendus (Récapitulatif)

### ✅ Test 1 : SQL
- Colonnes `finition`, `energie`, `couleur` présentes dans `v_vehicles_list_ui`
- Données correctes pour AZ123EY

### ✅ Test 2 : Interface (affichage)
- Champs visibles et non vides dans le modal détail
- Valeurs correctes : BUSINESS, Diesel, BLANC

### ✅ Test 3 : Interface (édition)
- Champs éditables en mode modification
- Sauvegarde fonctionne correctement

### ✅ Test 4 : Création
- Nouveau véhicule sauvegarde correctement les 3 champs
- Affichage correct après création

### ✅ Test 5 : Logs
- Logs de diagnostic présents
- Valeurs correctes à chaque étape

## En cas d'échec

### Problème : Colonnes absentes de la vue

**Symptôme** :
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'v_vehicles_list_ui'
  AND column_name IN ('finition', 'energie', 'couleur');
-- Résultat : 0 lignes
```

**Solution** :
- Exécuter `FIX-VUE-VEHICLES-AJOUTER-3-CHAMPS.sql`

### Problème : Champs vides dans l'interface malgré les données en BDD

**Symptôme** :
```sql
-- BDD : Données présentes
SELECT finition, energie, couleur
FROM vehicule WHERE immatriculation = 'AZ123EY';
-- Résultat : BUSINESS | Diesel | BLANC

-- Interface : Champs vides
```

**Diagnostic** :
1. Vérifier la vue :
   ```sql
   SELECT finition, energie, couleur
   FROM v_vehicles_list_ui
   WHERE immatriculation = 'AZ123EY';
   ```
2. Si NULL : La vue n'a pas été mise à jour correctement
3. Si valeurs présentes : Problème de binding dans le composant React

### Problème : Création de véhicule ne sauvegarde pas les champs

**Symptôme** :
```
Formulaire rempli : finition="SPORT"
BDD après création : finition=NULL
```

**Solution** :
- Vérifier que le correctif TypeScript est appliqué : `CORRECTIF-CREATION-VEHICULE-4-CHAMPS.md`
- Vérifier les logs `[CREATION]` dans la console

## Contact / Support

Si les tests échouent :
1. Vérifier que les 2 correctifs sont appliqués
2. Consulter les logs de la console navigateur
3. Exécuter les requêtes SQL de diagnostic
4. Fournir les résultats des logs et requêtes SQL
