# Déploiement des tables manquantes pour le module Parc Véhicules

## Contexte

Le front-end du module Parc Véhicules utilise deux tables qui n'existent pas en base de données :
- `historique_kilometrage` (erreur PGRST205 404)
- `document_vehicule` (erreur PGRST205 404)

## Actions réalisées

### 1. Migrations SQL créées

**Fichier 1 : `create-historique-kilometrage-table.sql`**
- Crée la table `historique_kilometrage` avec :
  - Colonnes : id, vehicule_id, date_releve, kilometrage, source, notes, saisi_par, created_at
  - Index sur vehicule_id et date_releve
  - RLS activé avec policies pour lecture/insertion/modification

**Fichier 2 : `create-document-vehicule-table.sql`**
- Crée la table `document_vehicule` avec :
  - Colonnes : id, vehicule_id, type_document, nom_fichier, fichier_url, date_emission, date_expiration, actif, created_at, updated_at
  - Index sur vehicule_id, type_document, date_expiration, actif
  - RLS activé avec policies pour lecture/insertion/modification
  - Trigger pour mettre à jour updated_at automatiquement

### 2. Amélioration de VehicleDetailModal

**Champs ajoutés en mode édition :**
- Date de première mise en circulation
- Carte essence (fournisseur, numéro, attribuée)
- Licence de transport
- Kilométrage actuel

**Modifications techniques :**
- Interface `Vehicle` étendue avec tous les nouveaux champs
- Fonction `cleanPayloadForUpdate` améliorée pour gérer tous les types de données
- Logs d'erreur détaillés avec `JSON.stringify(error, null, 2)`

### 3. Amélioration de VehicleCreateModal

**Nettoyage des données :**
- Fonction `cleanPayloadForInsert` pour convertir les chaînes vides en null
- Gestion correcte des dates, entiers et JSONB
- Logs d'erreur détaillés

### 4. Logs détaillés ajoutés

Tous les composants suivants ont maintenant des logs d'erreur détaillés :
- `VehicleCreateModal` : création de véhicule
- `VehicleDetailModal` : modification de véhicule
- `VehicleDocuments` : chargement et insertion de documents

## Instructions de déploiement

### Étape 1 : Appliquer les migrations SQL

Dans l'éditeur SQL de Supabase, exécuter dans l'ordre :

```bash
# 1. Créer la table historique_kilometrage
# Exécuter le contenu de create-historique-kilometrage-table.sql

# 2. Créer la table document_vehicule
# Exécuter le contenu de create-document-vehicule-table.sql
```

### Étape 2 : Vérifier les tables créées

```sql
-- Vérifier historique_kilometrage
SELECT * FROM information_schema.tables
WHERE table_name = 'historique_kilometrage';

-- Vérifier document_vehicule
SELECT * FROM information_schema.tables
WHERE table_name = 'document_vehicule';

-- Vérifier les policies RLS
SELECT * FROM pg_policies
WHERE tablename IN ('historique_kilometrage', 'document_vehicule');
```

### Étape 3 : Build et test

```bash
npm run build
```

### Étape 4 : Tests fonctionnels

1. **Test création de véhicule :**
   - Créer un nouveau véhicule avec tous les champs remplis
   - Vérifier qu'il n'y a plus d'erreur 400 code 22007
   - Vérifier que le kilométrage est enregistré dans `historique_kilometrage`

2. **Test modification de véhicule :**
   - Ouvrir le modal de détails d'un véhicule
   - Cliquer sur "Modifier"
   - Modifier tous les nouveaux champs (carte essence, licence, kilométrage)
   - Sauvegarder et vérifier que tout est bien enregistré

3. **Test documents véhicule :**
   - Accéder à l'onglet "Documents" d'un véhicule
   - Uploader un document (carte grise, assurance, etc.)
   - Vérifier qu'il n'y a plus d'erreur 404 sur `document_vehicule`
   - Vérifier que le document apparaît dans la liste

4. **Test kilométrage :**
   - Accéder à l'onglet "Kilométrage" d'un véhicule
   - Cliquer sur "Mettre à jour"
   - Ajouter un nouveau relevé kilométrique
   - Vérifier qu'il n'y a plus d'erreur 404 sur `historique_kilometrage`
   - Vérifier que l'historique s'affiche correctement

## Surveillance des erreurs

En cas d'erreur, consulter la console du navigateur. Les logs détaillés afficheront :
- L'erreur complète en JSON formaté
- L'objet erreur complet
- Le contexte de l'erreur (création, modification, etc.)

Format des logs :
```javascript
console.error('Erreur [contexte]:', JSON.stringify(error, null, 2));
console.error('Erreur détaillée:', error);
```

## Rollback

Si nécessaire, pour supprimer les tables créées :

```sql
-- Supprimer les tables dans l'ordre inverse
DROP TABLE IF EXISTS public.document_vehicule CASCADE;
DROP TABLE IF EXISTS public.historique_kilometrage CASCADE;
```

## Notes importantes

- Les tables sont protégées par RLS
- Tous les utilisateurs authentifiés peuvent lire/insérer/modifier
- Les documents ont un soft delete (colonne `actif`)
- Les triggers mettent automatiquement à jour `updated_at`
- Les index optimisent les requêtes fréquentes
