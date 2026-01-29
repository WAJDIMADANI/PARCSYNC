# Guide complet - Module véhicules avec rafraîchissement instantané

## Problème résolu

Le module Parc Véhicules présentait plusieurs problèmes :
1. Tables manquantes en DB (`historique_kilometrage`, `document_vehicule`)
2. Colonne manquante `carte_essence_fournisseur`
3. Aucun rafraîchissement instantané après modification
4. Le kilométrage ne s'affichait pas après mise à jour
5. Impossible de tout modifier depuis le modal

## Solution implémentée

### 1. Base de données

**Tables créées :**
- ✅ `historique_kilometrage` - Suivi de l'évolution du kilométrage
- ✅ `document_vehicule` - Documents des véhicules (carte grise, assurance, etc.)

**Colonnes ajoutées à `vehicule` :**
- `reference_tca`
- `immat_norm` (immatriculation normalisée)
- `date_premiere_mise_en_circulation`
- `assurance_type` (tca/externe)
- `assurance_compagnie`
- `assurance_numero_contrat`
- `licence_transport_numero`
- `materiel_embarque` (JSONB)
- `carte_essence_fournisseur` ⭐ NOUVEAU
- `carte_essence_numero`
- `carte_essence_attribuee`
- `kilometrage_actuel`
- `derniere_maj_kilometrage`
- `photo_path`

### 2. Frontend - Rafraîchissement instantané

**Fonction `fetchVehicleDetails()` ajoutée**
Refetch les données du véhicule depuis la DB et met à jour l'état local sans fermer le modal.

**Appelée après chaque action :**
- ✅ Sauvegarde des modifications (bouton "Enregistrer")
- ✅ Upload d'une photo
- ✅ Suppression d'une photo
- ✅ Mise à jour du kilométrage

**Comportement :**
- Le modal reste ouvert
- On reste sur le même onglet
- Les données sont rafraîchies instantanément
- La liste des véhicules est aussi mise à jour (via `onUpdate()`)

### 3. Champs éditables dans le modal

**Onglet "Informations" :**
- Référence TCA
- Marque / Modèle / Année / Type
- Statut
- Date de mise en service / Fin de service
- Kilométrage actuel
- Photo du véhicule

**Onglet "Assurance" :**
- Type d'assurance (TCA / Externe)
- Compagnie d'assurance
- Numéro de contrat
- Numéro de licence de transport
- Date de 1ère mise en circulation
- Carte essence (fournisseur, numéro, attribuée)

**Onglet "Kilométrage" :**
- Bouton "Mettre à jour" qui ouvre un modal
- Affichage du kilométrage actuel
- Historique des relevés

**Onglet "Documents" :**
- Upload de documents (carte grise, assurance, etc.)
- Liste des documents avec dates d'expiration

## Installation

### Étape 1 : Exécuter le SQL

Dans l'éditeur SQL de Supabase, copier/coller et exécuter le contenu de :

```
SQL-A-EXECUTER-VEHICULES-COMPLET.sql
```

Ce script est **idempotent** : vous pouvez l'exécuter plusieurs fois sans problème.

Il va :
1. ✅ Vérifier et ajouter toutes les colonnes manquantes à `vehicule`
2. ✅ Créer `historique_kilometrage` avec RLS et index
3. ✅ Créer `document_vehicule` avec RLS et index
4. ✅ Créer les contraintes et triggers
5. ✅ Afficher un rapport de vérification finale

**Résultat attendu :**
```
NOTICE:  ========================================
NOTICE:  VÉRIFICATION FINALE
NOTICE:  ========================================
NOTICE:  Colonnes vehicule présentes: 14 / 14
NOTICE:  Tables créées: 2 / 2
NOTICE:  ✓ Installation complète réussie !
NOTICE:  ========================================
```

### Étape 2 : Vérifier l'installation

```sql
-- Vérifier les colonnes de vehicule
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicule'
ORDER BY column_name;

-- Vérifier les tables
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('historique_kilometrage', 'document_vehicule')
  AND table_schema = 'public';

-- Vérifier les policies RLS
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('historique_kilometrage', 'document_vehicule')
ORDER BY tablename, cmd;
```

### Étape 3 : Tester dans l'application

#### Test 1 : Création de véhicule
1. Parc Véhicules → "Nouveau véhicule"
2. Remplir tous les champs
3. Ajouter un kilométrage initial
4. Cliquer "Créer"
5. ✅ Plus d'erreur 400 ou 404
6. ✅ Le véhicule apparaît dans la liste

#### Test 2 : Modification instantanée
1. Cliquer sur un véhicule pour ouvrir le modal
2. Onglet "Informations" → Cliquer "Modifier"
3. Changer le kilométrage, la référence TCA, etc.
4. Cliquer "Enregistrer"
5. ✅ Le modal reste ouvert
6. ✅ On reste sur l'onglet "Informations"
7. ✅ Les modifications sont visibles instantanément
8. ✅ Cliquer "Annuler" ou fermer puis rouvrir : les données sont bien enregistrées

#### Test 3 : Kilométrage
1. Ouvrir un véhicule
2. Onglet "Kilométrage" → "Mettre à jour"
3. Saisir un nouveau kilométrage
4. Cliquer "Enregistrer"
5. ✅ Le modal de saisie se ferme
6. ✅ Le kilométrage actuel est mis à jour instantanément dans le modal principal
7. ✅ Pas besoin de fermer/rouvrir le modal

#### Test 4 : Photo
1. Ouvrir un véhicule
2. Onglet "Informations" → "Ajouter une photo"
3. Sélectionner une image
4. ✅ La photo s'affiche instantanément
5. ✅ Le modal reste ouvert
6. Tester "Supprimer la photo"
7. ✅ La photo disparaît instantanément

#### Test 5 : Documents
1. Ouvrir un véhicule
2. Onglet "Documents"
3. Uploader une carte grise
4. ✅ Plus d'erreur 404
5. ✅ Le document apparaît dans la liste

#### Test 6 : Assurance et carte essence
1. Ouvrir un véhicule
2. Onglet "Assurance" → Cliquer "Modifier"
3. Changer le type d'assurance, la compagnie, etc.
4. Saisir fournisseur et numéro de carte essence
5. Cliquer "Enregistrer"
6. ✅ Tout est enregistré instantanément
7. ✅ Le modal reste ouvert sur l'onglet "Assurance"

## Architecture technique

### Flux de rafraîchissement

```
Action utilisateur (Save, Upload photo, Update km)
           ↓
      Mise à jour DB (via supabase.from().update())
           ↓
   fetchVehicleDetails() - Refetch depuis DB
           ↓
    setVehicle(nouvelles données)
    setEditedVehicle(nouvelles données)
           ↓
     React re-render automatique
           ↓
   Interface mise à jour INSTANTANÉMENT
           ↓
    onUpdate() - Refetch liste aussi
```

### Avantages de cette approche

1. **Source unique de vérité** : La DB est toujours la référence
2. **Pas de désync** : On refetch après chaque action
3. **UX fluide** : Le modal reste ouvert, même onglet
4. **Fiabilité** : Les données affichées sont garanties être à jour
5. **Simplicité** : Pas de gestion complexe d'état local

## Logs et debugging

Tous les composants ont des logs détaillés :

```javascript
console.error('Erreur [contexte]:', JSON.stringify(error, null, 2));
console.error('Erreur détaillée:', error);
```

En cas d'erreur, ouvrir la console du navigateur pour voir :
- L'erreur complète en JSON formaté
- Le contexte de l'erreur
- Les détails du payload envoyé

## Rollback

Si nécessaire, pour supprimer les tables et colonnes créées :

```sql
-- Supprimer les tables
DROP TABLE IF EXISTS public.document_vehicule CASCADE;
DROP TABLE IF EXISTS public.historique_kilometrage CASCADE;

-- Supprimer les colonnes de vehicule (exemple)
ALTER TABLE vehicule
DROP COLUMN IF EXISTS carte_essence_fournisseur,
DROP COLUMN IF EXISTS carte_essence_numero,
DROP COLUMN IF EXISTS carte_essence_attribuee;
```

## Performance

- Index créés sur toutes les foreign keys
- Index sur les colonnes fréquemment filtrées
- RLS policies optimisées
- Pas de N+1 queries
- Refetch uniquement le véhicule concerné (pas toute la liste)

## Sécurité

- ✅ RLS activé sur toutes les tables
- ✅ Policies restrictives (authenticated users only)
- ✅ Validation des contraintes en DB
- ✅ Soft delete pour documents (colonne `actif`)
- ✅ Triggers pour `updated_at` automatique

## Support

En cas de problème :

1. Vérifier que le SQL a été exécuté correctement
2. Vérifier les logs dans la console du navigateur
3. Vérifier les policies RLS dans Supabase
4. Tester les requêtes SQL manuellement dans l'éditeur SQL

## Fichiers modifiés

### SQL
- `SQL-A-EXECUTER-VEHICULES-COMPLET.sql` - Script d'installation complet

### Frontend
- `src/components/VehicleDetailModal.tsx` - Ajout de fetchVehicleDetails() et rafraîchissement instantané
- `src/components/VehicleDocuments.tsx` - Amélioration des logs d'erreur
- `src/components/UpdateKilometrageModal.tsx` - Appel de onSuccess pour refetch

### Documentation
- `GUIDE-COMPLET-VEHICULES-INSTANTANE.md` - Ce guide
- `DEPLOIEMENT-TABLES-VEHICULES.md` - Guide technique détaillé
- `EXECUTER-MAINTENANT-TABLES-VEHICULES.md` - Instructions rapides
