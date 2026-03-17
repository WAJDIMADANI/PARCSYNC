# Guide d'import massif des références véhicules

## Vue d'ensemble

Système d'import massif sécurisé pour alimenter automatiquement les référentiels de marques et modèles de véhicules depuis la base NHTSA vPIC (National Highway Traffic Safety Administration).

## Objectifs

✅ Importer massivement les marques et modèles depuis NHTSA
✅ Utiliser une Edge Function sécurisée (pas d'appel direct depuis le navigateur)
✅ Déduplication automatique via source + source_id
✅ Import par batch pour éviter les timeouts
✅ Logs détaillés avec statistiques
✅ Mode relançable si l'import s'arrête
✅ Interface admin avec bouton manuel
✅ Aucune modification du modal "Nouveau véhicule" existant

## Architecture

### 1. Modifications base de données

#### Nouvelles colonnes ajoutées

**vehicle_reference_brands**
- `source` (text, default 'manual') : Origine de la donnée (nhtsa, manual)
- `source_id` (text) : ID externe de la source

**vehicle_reference_models**
- `source` (text, default 'manual')
- `source_id` (text)
- `vehicle_type` (text) : Type de véhicule si disponible

#### Index et contraintes
```sql
-- Index pour optimiser les recherches
CREATE INDEX idx_vehicle_brands_source ON vehicle_reference_brands(source);
CREATE INDEX idx_vehicle_brands_source_id ON vehicle_reference_brands(source_id);

-- Contrainte unique pour éviter les doublons
CREATE UNIQUE INDEX idx_vehicle_brands_source_unique
  ON vehicle_reference_brands(source, source_id)
  WHERE source_id IS NOT NULL;
```

### 2. Edge Function : import-vehicle-references

**Emplacement** : `supabase/functions/import-vehicle-references/index.ts`

#### Permissions requises
- Permission `manage_vehicle_references` OU `super_admin`
- Authentification obligatoire

#### Endpoints

**Mode status** : Récupère les statistiques actuelles
```json
POST /functions/v1/import-vehicle-references
{
  "mode": "status"
}

Response:
{
  "totalBrands": 150,
  "totalModels": 3500,
  "nhtsaBrands": 120,
  "nhtsaModels": 3200
}
```

**Mode import** : Lance l'import massif
```json
POST /functions/v1/import-vehicle-references
{
  "mode": "import"
}

Response:
{
  "success": true,
  "stats": {
    "brandsInserted": 50,
    "brandsSkipped": 100,
    "modelsInserted": 1200,
    "modelsSkipped": 200,
    "errors": []
  },
  "message": "Import completed: 50 brands, 1200 models inserted"
}
```

#### Flux d'import

1. **Vérification des permissions**
   - Récupération du token depuis Authorization header
   - Vérification que l'utilisateur a `manage_vehicle_references` ou `super_admin`

2. **Import des marques**
   - Fetch depuis `https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json`
   - Récupération des marques existantes avec source='nhtsa'
   - Filtrage des nouvelles marques
   - Insert par batch de 100

3. **Import des modèles**
   - Pour chaque marque (limité aux 50 premières)
   - Fetch depuis `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/{makeId}?format=json`
   - Mapping avec brand_id depuis la DB
   - Récupération des modèles existants avec source='nhtsa'
   - Filtrage des nouveaux modèles
   - Insert par batch de 100
   - Délai de 200ms entre chaque appel API

4. **Gestion des erreurs**
   - Logs détaillés dans la console
   - Array d'erreurs retourné dans les stats
   - Continue l'import même en cas d'erreur partielle

#### Caractéristiques techniques

**Timeouts**
- API NHTSA makes : 30 secondes
- API NHTSA models : 10 secondes par marque

**Rate limiting**
- Délai de 200ms entre chaque appel API modèles
- Permet d'éviter les 429 Too Many Requests

**Batch processing**
- Insert par lot de 100 enregistrements
- Évite les timeouts Supabase
- Meilleure performance

**Déduplication**
- Utilise la contrainte unique (source, source_id)
- Skip automatique si déjà existant
- Compteur de "skipped" dans les stats

### 3. Composant admin : ImportVehicleReferences

**Emplacement** : `src/components/ImportVehicleReferences.tsx`

#### Features

**Statistiques en temps réel**
- Total marques / modèles dans la DB
- Marques / modèles NHTSA
- Bouton de rafraîchissement

**Bouton d'import**
- Lance l'import depuis NHTSA
- Loading state avec spinner
- Affichage des résultats détaillés

**Affichage des résultats**
```
✅ Import réussi
  Marques insérées : 50
  Marques ignorées : 100
  Modèles insérés : 1200
  Modèles ignorés : 200

⚠️ Erreurs rencontrées :
  - Models for make 123: Timeout
  - Models batch 500: Connection error
```

**Informations utilisateur**
- Encart jaune avec informations importantes
- Durée estimée
- Détection automatique des doublons
- Possibilité de relancer
- N'affecte pas le modal existant

**Section "Comment ça marche ?"**
- Explication du processus étape par étape
- Clarification de la source NHTSA
- Lien vers l'API publique

#### États du composant
```typescript
const [loading, setLoading] = useState(false);
const [stats, setStats] = useState<ImportStats | null>(null);
const [error, setError] = useState<string>('');
const [success, setSuccess] = useState(false);
const [status, setStatus] = useState<StatusData | null>(null);
const [loadingStatus, setLoadingStatus] = useState(false);
```

## Intégration dans l'interface

### Dashboard.tsx
```typescript
import { ImportVehicleReferences } from './ImportVehicleReferences';

// Dans renderView()
case 'admin/import-vehicle-references':
  return <ImportVehicleReferences />;

// Dans le titre
{view === 'admin/import-vehicle-references' && 'Import Références Véhicules'}
```

### Sidebar.tsx
```typescript
export type View =
  | ...
  | 'admin/import-vehicle-references';

// Dans la section Administration
{
  id: 'admin/import-vehicle-references',
  label: 'Import Références Véhicules',
  icon: Database,
  enabled: true
}
```

## Déploiement

### 1. Migration SQL

Exécuter le script :
```bash
psql < add-source-columns-vehicle-references.sql
```

Ou via Supabase SQL Editor :
- Copier le contenu de `add-source-columns-vehicle-references.sql`
- Coller dans SQL Editor
- Exécuter

### 2. Déployer l'Edge Function

La fonction doit être déployée avec l'outil MCP Supabase :
```typescript
mcp__supabase__deploy_edge_function({
  slug: "import-vehicle-references",
  verify_jwt: true
})
```

La fonction sera automatiquement déployée avec :
- JWT verification activée
- Accès aux variables d'environnement Supabase
- CORS configuré correctement

### 3. Permission utilisateur

Ajouter la permission à un utilisateur admin :
```sql
INSERT INTO public.user_permissions (user_id, permission)
VALUES ('uuid-de-l-admin', 'manage_vehicle_references')
ON CONFLICT (user_id, permission) DO NOTHING;
```

Ou utiliser la permission existante `super_admin`.

## Utilisation

### 1. Accéder à l'interface

1. Se connecter en tant qu'admin
2. Aller dans le menu "Administration"
3. Cliquer sur "Import Références Véhicules"

### 2. Vérifier les statistiques

Au chargement, les statistiques s'affichent :
- Nombre total de marques/modèles
- Nombre de marques/modèles NHTSA

### 3. Lancer l'import

1. Cliquer sur "Lancer l'import depuis NHTSA"
2. Attendre la fin de l'import (quelques minutes)
3. Consulter les résultats détaillés

### 4. Résultats

L'import affiche :
- Nombre de marques insérées
- Nombre de marques ignorées (déjà présentes)
- Nombre de modèles insérés
- Nombre de modèles ignorés
- Liste des erreurs éventuelles

### 5. Relancer si nécessaire

Si l'import s'arrête ou échoue partiellement :
1. Consulter les erreurs dans les résultats
2. Cliquer à nouveau sur "Lancer l'import"
3. Les doublons seront automatiquement ignorés
4. Seules les nouvelles données seront insérées

## API NHTSA vPIC

### Source officielle
https://vpic.nhtsa.dot.gov/api/

### Endpoints utilisés

**Get All Makes**
```
GET https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json

Response:
{
  "Results": [
    {
      "Make_ID": 440,
      "Make_Name": "ASTON MARTIN"
    },
    ...
  ]
}
```

**Get Models For Make ID**
```
GET https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/440?format=json

Response:
{
  "Results": [
    {
      "Model_ID": 1868,
      "Model_Name": "DB7",
      "Make_ID": 440,
      "Make_Name": "ASTON MARTIN"
    },
    ...
  ]
}
```

### Caractéristiques API

- **Gratuite** : API publique sans clé requise
- **Limite** : Pas de limite stricte, mais rate limiting recommandé
- **Timeout** : Peut être lent, utiliser des timeouts
- **Données** : Marques et modèles américains principalement
- **Mise à jour** : Base régulièrement mise à jour par la NHTSA

## Sécurité

### Vérifications implémentées

1. **Authentication**
   - Token JWT requis dans Authorization header
   - Vérification via `supabase.auth.getUser()`

2. **Authorization**
   - Permission `manage_vehicle_references` OU `super_admin` requise
   - Requête à `user_permissions` pour validation

3. **Edge Function côté serveur**
   - Pas d'appel API direct depuis le navigateur
   - Clés et URLs contrôlées côté serveur
   - Logs serveur pour audit

4. **CORS**
   - Configuré pour autoriser uniquement les appels depuis l'app
   - Headers sécurisés

5. **Rate limiting**
   - Délai entre appels API
   - Évite les abus

6. **Validation des données**
   - Vérification que Make_Name existe
   - Vérification que Model_Name existe
   - Trim des espaces

### Contraintes base de données

```sql
-- Unicité par source
UNIQUE INDEX (source, source_id) WHERE source_id IS NOT NULL

-- Toujours un nom
name text NOT NULL

-- Source par défaut
source text DEFAULT 'manual'
```

## Compatibilité

### ✅ Existant préservé

- Modal "Nouveau véhicule" fonctionne sans modification
- Combobox marque/modèle utilisent tous les référentiels (NHTSA + manual)
- Les véhicules existants ne sont pas affectés
- Pas de migration de données nécessaire
- Fonctionnalité additionnelle, pas de breaking change

### ✅ Coexistence des sources

Les référentiels peuvent contenir :
- Données NHTSA (source='nhtsa', source_id renseigné)
- Données manuelles (source='manual', source_id null)
- Les combobox affichent TOUTES les données, quelle que soit la source

## Performance

### Optimisations

1. **Index**
   - Sur `source` pour filtrage rapide
   - Sur `source_id` pour déduplication
   - Sur `brand_id` pour jointures

2. **Batch insert**
   - Lot de 100 enregistrements
   - Réduit les appels DB
   - Meilleure performance

3. **Rate limiting**
   - 200ms entre appels API
   - Évite les 429
   - Pas de blocage IP

4. **Limitation du scope**
   - 50 premières marques pour les modèles
   - Peut être ajusté dans le code
   - Évite les très longs imports

### Métriques estimées

Pour un import complet (50 marques) :
- **Durée** : 2-5 minutes
- **Marques** : ~50 insérées
- **Modèles** : ~1000-2000 insérés
- **Appels API** : ~51 (1 makes + 50 models)
- **Données** : Quelques KB

## Troubleshooting

### Erreur : Permission denied

**Cause** : L'utilisateur n'a pas la permission `manage_vehicle_references`

**Solution** :
```sql
INSERT INTO public.user_permissions (user_id, permission)
VALUES ('uuid-utilisateur', 'manage_vehicle_references');
```

### Erreur : NHTSA API error 429

**Cause** : Trop d'appels à l'API NHTSA

**Solution** :
- Attendre quelques minutes
- Relancer l'import
- Le rate limiting devrait éviter ce problème

### Erreur : Timeout

**Cause** : L'API NHTSA est lente ou indisponible

**Solution** :
- Relancer l'import
- Les données déjà insérées seront ignorées
- Seules les nouvelles données seront ajoutées

### Erreur : Duplicate key

**Cause** : Tentative d'insertion d'un doublon

**Solution** :
- Normal et géré automatiquement
- Les doublons sont comptés dans "skipped"
- Aucune action nécessaire

### Pas de nouvelles données

**Cause** : Import déjà effectué précédemment

**Solution** :
- Vérifier les statistiques
- Si tout est déjà importé, c'est normal
- Les stats montrent le nombre de données existantes

## Extensions futures

### Import complet

Actuellement limité à 50 marques pour les modèles. Pour importer TOUTES les marques :

```typescript
// Dans index.ts, ligne ~160
for (const make of makes.slice(0, 50)) {
  // Remplacer par :
for (const make of makes) {
```

### Import incrémental

Ajouter un système de date de dernière mise à jour :
- Colonne `last_synced_at` dans les tables
- Ne fetch que les nouvelles données
- Mise à jour différentielle

### Import d'autres sources

Ajouter d'autres sources de données :
- API constructeurs (Renault, PSA, etc.)
- Bases européennes
- Données personnalisées

### Webhook automatique

Déclencher l'import automatiquement :
- Cron job Supabase
- Webhook depuis NHTSA (si disponible)
- Import périodique (1x par mois)

## Fichiers du système

| Fichier | Description |
|---------|-------------|
| `add-source-columns-vehicle-references.sql` | Migration : ajout colonnes source/source_id |
| `supabase/functions/import-vehicle-references/index.ts` | Edge Function d'import |
| `src/components/ImportVehicleReferences.tsx` | Interface admin d'import |
| `src/components/Dashboard.tsx` | Routing vers le composant |
| `src/components/Sidebar.tsx` | Menu navigation admin |

## Résumé

✅ Système d'import massif fonctionnel et sécurisé
✅ Interface admin intuitive avec statistiques
✅ Déduplication automatique via source + source_id
✅ Import par batch avec gestion d'erreurs
✅ Mode relançable si interruption
✅ Logs détaillés avec résultats
✅ Aucune modification du modal existant
✅ Compatible avec les données manuelles
✅ Build réussi sans erreur

---

**Date** : 2026-03-17
**Version** : 1.0
**Status** : ✅ Prêt pour déploiement
