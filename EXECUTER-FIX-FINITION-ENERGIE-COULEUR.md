# Fix Bug : Finition, Energie, Couleur vides

## Résumé du problème

Les champs `finition`, `energie`, et `couleur` apparaissent vides dans le modal "Voir" et "Modifier" d'un véhicule, même quand ils sont renseignés dans la base de données.

## Cause racine

La vue SQL `v_vehicles_list_ui` n'expose PAS ces 3 colonnes, bien qu'elles existent dans la table `vehicule`.

Lorsque `VehicleDetailModal` et `VehicleListNew` chargent les données via :
```typescript
.from('v_vehicles_list_ui')
.select('*')
```

Ces colonnes ne sont jamais récupérées, car elles ne font pas partie de la vue.

## Impact

- **Modal "Voir"** : Les champs finition/energie/couleur sont vides
- **Modal "Modifier"** : Les champs sont vides et on ne peut pas voir les valeurs existantes
- **Liste des véhicules** : Si affichés, ces champs seraient vides aussi

## Solution

Recréer la vue `v_vehicles_list_ui` en incluant les colonnes manquantes :
- `finition`
- `energie`
- `couleur`
- Et aussi : `reste_a_payer_ttc`, `financeur_*` (qui manquaient aussi)

## Exécution

### 1. Exécuter le script SQL

```bash
# Dans l'éditeur SQL Supabase ou via psql
cat FIX-VUE-VEHICLES-FINITION-ENERGIE-COULEUR.sql
```

Ou directement copier-coller le contenu du fichier dans l'éditeur SQL Supabase.

### 2. Vérifier le résultat

Après exécution, vérifier qu'un véhicule test affiche bien ses données :

```sql
SELECT
  immatriculation,
  marque,
  modele,
  finition,
  energie,
  couleur
FROM v_vehicles_list_ui
WHERE immatriculation = 'AZ123EY';
```

### 3. Tester dans l'application

1. Rafraîchir la page de l'application
2. Ouvrir le modal d'un véhicule qui a finition/energie/couleur renseignés
3. Vérifier que les champs apparaissent correctement
4. Cliquer sur "Modifier" et vérifier que les valeurs sont pré-remplies

## Fichiers concernés

### Fichiers SQL créés
- ✅ `FIX-VUE-VEHICLES-FINITION-ENERGIE-COULEUR.sql` - Script de correction

### Fichiers frontend (AUCUNE modification nécessaire)
- ✅ `VehicleDetailModal.tsx` - Utilise déjà correctement `editedVehicle.finition/energie/couleur`
- ✅ `VehicleCreateModal.tsx` - Envoie déjà correctement ces champs à la BDD
- ✅ `VehicleListNew.tsx` - Charge depuis la vue (sera fixé automatiquement)

## Pourquoi "Voir" et "Modifier" étaient vides

1. Le frontend charge depuis `v_vehicles_list_ui`
2. La vue ne contient pas `finition`, `energie`, `couleur`
3. Donc `data.finition`, `data.energie`, `data.couleur` sont `undefined`
4. Le state `editedVehicle` est initialisé avec ces valeurs `undefined`
5. Les inputs affichent `value={editedVehicle.finition || ''}` → chaîne vide

## Colonnes manquantes découvertes

En bonus, j'ai aussi ajouté d'autres colonnes qui manquaient :
- `reste_a_payer_ttc`
- `financeur_nom`
- `financeur_adresse`
- `financeur_code_postal`
- `financeur_ville`
- `financeur_telephone`

Ces champs sont utilisés dans l'onglet "Acquisition" du modal.
