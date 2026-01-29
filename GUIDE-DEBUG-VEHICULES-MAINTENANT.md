# GUIDE DEBUG - Module Véhicules (tous les problèmes)

## 🚨 Problèmes identifiés

1. ❌ Modifications non enregistrées (tous onglets)
2. ❌ Attributions actuelles non affichées
3. ❌ Assurance : changements non sauvegardés
4. ❌ Équipements : pas de bouton modifier
5. ❌ Kilométrage : nouveau km non affiché
6. ❌ Documents : erreur lors de l'upload

## ✅ Solution complète

### ÉTAPE 1 : Exécuter le diagnostic

Dans Supabase SQL Editor, exécuter :

```sql
-- Copier/coller le contenu de DIAGNOSTIC-COMPLET-VEHICULES.sql
```

**Ce que ça fait :**
- Vérifie que toutes les tables existent
- Vérifie que toutes les colonnes existent
- Liste les policies RLS
- Affiche les buckets storage
- Donne un rapport complet

**Résultat attendu :**
```
✓ Configuration complète
Colonnes étendues vehicule: 14 / 14
Tables créées: 2 / 2
```

### ÉTAPE 2 : Exécuter le fix complet

Dans Supabase SQL Editor, exécuter :

```sql
-- Copier/coller le contenu de FIX-COMPLET-MODULE-VEHICULES.sql
```

**Ce que ça fait :**
- ✅ Crée le bucket `documents-vehicules` avec policies
- ✅ Crée le bucket `vehicle-photos` avec policies
- ✅ Vérifie/Crée les policies UPDATE sur table `vehicule`
- ✅ Vérifie/Crée les policies SELECT sur table `vehicule`
- ✅ Vérifie/Crée les policies INSERT sur table `vehicule`

**Résultat attendu :**
```
✓ Tous les éléments sont en place !
Bucket documents-vehicules: ✓
Bucket vehicle-photos: ✓
Policies RLS vehicule: 3+
```

### ÉTAPE 3 : Tester dans l'application

#### Test 1 : Modifications (Onglet Informations)

1. Ouvrir un véhicule
2. Cliquer "Modifier"
3. Changer la marque, le modèle, etc.
4. Cliquer "Enregistrer"
5. **Ouvrir la console (F12)** et chercher :

```
[handleSave] Début sauvegarde pour vehicule ID: ...
[handleSave] Données à envoyer: {...}
[handleSave] UPDATE réussi, données retournées: {...}
[fetchVehicleDetails] Début refetch pour vehicule ID: ...
[fetchVehicleDetails] Données reçues: {...}
[fetchVehicleDetails] État mis à jour avec succès
[handleSave] Mode édition désactivé
```

6. ✅ Si vous voyez ces logs → OK
7. ❌ Si erreur → Noter l'erreur exacte et vérifier les policies RLS

#### Test 2 : Assurance

1. Ouvrir un véhicule → Onglet "Assurance"
2. Cliquer "Modifier"
3. Changer type assurance, compagnie, etc.
4. Cliquer "Enregistrer"
5. **Vérifier les mêmes logs que Test 1**
6. ✅ Les modifications doivent être visibles instantanément

#### Test 3 : Équipements

1. Ouvrir un véhicule → Onglet "Équipements"
2. **Maintenant il y a un bouton "Modifier" !**
3. Cliquer "Modifier"
4. Changer le fournisseur de carte essence, numéro, etc.
5. Cliquer "Enregistrer"
6. ✅ Les modifications sont enregistrées instantanément

#### Test 4 : Kilométrage

1. Ouvrir un véhicule → Onglet "Kilométrage"
2. Cliquer "Mettre à jour"
3. Saisir un nouveau km (ex: 50000)
4. Cliquer "Enregistrer"
5. **Vérifier dans la console :**

```
[fetchVehicleDetails] Début refetch pour vehicule ID: ...
[fetchVehicleDetails] Données reçues: { kilometrage_actuel: 50000, ... }
```

6. ✅ Le km doit s'afficher immédiatement dans le modal
7. ✅ Fermer et rouvrir le modal → le km est bien là

#### Test 5 : Documents

1. Ouvrir un véhicule → Onglet "Documents"
2. Sélectionner un type de document (ex: "Assurance")
3. Cliquer "Choisir un fichier" et sélectionner un PDF
4. Cliquer "Uploader"
5. **Vérifier dans la console :**

```
[VehicleDocuments] Début upload fichier: ...
[VehicleDocuments] Upload vers storage, chemin: ...
[VehicleDocuments] Upload storage OK, insertion en DB...
[VehicleDocuments] Document enregistré avec succès
```

6. ✅ Message "Document ajouté avec succès"
7. ✅ Le document apparaît dans la liste

#### Test 6 : Attributions actuelles

1. Ouvrir un véhicule → Onglet "Attributions actuelles"
2. **Si vide** : C'est normal, il n'y a pas d'attribution active
3. Pour créer une attribution :
   - Cliquer "Nouvelle attribution"
   - Sélectionner un chauffeur
   - Définir les dates
   - Enregistrer
4. ✅ L'attribution doit apparaître dans l'onglet

## 🔍 Diagnostic des erreurs

### Erreur "UPDATE failed" ou "permission denied"

**Cause :** Policies RLS manquantes ou restrictives

**Solution :**
```sql
-- Vérifier les policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'vehicule';

-- Si aucune policy UPDATE, exécuter FIX-COMPLET-MODULE-VEHICULES.sql
```

### Erreur "Bucket not found" ou 404

**Cause :** Bucket storage n'existe pas

**Solution :**
```sql
-- Vérifier les buckets
SELECT id, name FROM storage.buckets WHERE id LIKE '%vehicule%';

-- Si vide, exécuter FIX-COMPLET-MODULE-VEHICULES.sql
```

### Erreur "Column does not exist"

**Cause :** Colonne manquante en DB

**Solution :**
```sql
-- Vérifier les colonnes
SELECT column_name FROM information_schema.columns
WHERE table_name = 'vehicule'
  AND column_name IN (
    'carte_essence_fournisseur',
    'assurance_type',
    'assurance_compagnie'
  );

-- Si colonnes manquantes, exécuter SQL-A-EXECUTER-VEHICULES-COMPLET.sql
```

### Modifications non visibles après "Enregistrer"

**Cause :** Problème de refetch ou d'état React

**Solution :**
1. Ouvrir console (F12)
2. Chercher `[fetchVehicleDetails]`
3. Vérifier si les données sont bien reçues
4. Si oui mais pas affichées → bug d'état React (recharger la page)
5. Si non → problème de SELECT (vérifier policies RLS)

## 📋 Checklist complète

- [ ] Exécuté DIAGNOSTIC-COMPLET-VEHICULES.sql
- [ ] Toutes les colonnes présentes (14/14)
- [ ] Tables historique_kilometrage et document_vehicule créées
- [ ] Exécuté FIX-COMPLET-MODULE-VEHICULES.sql
- [ ] Bucket documents-vehicules créé
- [ ] Bucket vehicle-photos créé
- [ ] Policies RLS sur vehicule (3+)
- [ ] Test modification onglet Info → ✅
- [ ] Test modification onglet Assurance → ✅
- [ ] Test modification onglet Équipements → ✅
- [ ] Test mise à jour kilométrage → ✅
- [ ] Test upload document → ✅
- [ ] Logs détaillés dans console → ✅

## 🎯 Résultat attendu final

Après avoir suivi toutes les étapes :

1. ✅ Toutes les modifications sont enregistrées instantanément
2. ✅ Le modal reste ouvert sur le même onglet après "Enregistrer"
3. ✅ Les données sont rafraîchies automatiquement
4. ✅ Pas besoin de fermer/rouvrir pour voir les changements
5. ✅ Upload de documents fonctionne
6. ✅ Mise à jour du kilométrage visible immédiatement
7. ✅ Bouton "Modifier" présent dans tous les onglets éditables
8. ✅ Messages de succès après chaque action

## 📁 Fichiers SQL à exécuter

1. **DIAGNOSTIC-COMPLET-VEHICULES.sql** ← Exécuter en 1er pour diagnostiquer
2. **FIX-COMPLET-MODULE-VEHICULES.sql** ← Exécuter en 2ème pour corriger
3. **SQL-A-EXECUTER-VEHICULES-COMPLET.sql** ← Si colonnes manquantes

## 💡 Astuce

**Toujours vérifier la console (F12) en premier !**

Les logs commencent par :
- `[handleSave]` pour les sauvegardes
- `[fetchVehicleDetails]` pour les refetch
- `[VehicleDocuments]` pour les documents
- `[UpdateKilometrageModal]` pour le kilométrage

Si vous ne voyez AUCUN log → problème de configuration ou cache navigateur.
