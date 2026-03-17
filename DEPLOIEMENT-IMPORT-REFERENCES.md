# Déploiement du système d'import massif de références véhicules

## Résumé

Ce guide explique comment déployer le système d'import massif de références véhicules.

## Prérequis

- Accès admin à Supabase
- Permission `super_admin` ou `manage_vehicle_references`
- Tables de référence déjà créées (vehicle_reference_brands, vehicle_reference_models, etc.)

## Étapes de déploiement

### 1. Migration base de données

Exécuter le script SQL via Supabase SQL Editor :

```sql
-- Copier/coller le contenu de add-source-columns-vehicle-references.sql
```

Le script ajoute :
- Colonne `source` (text, default 'manual')
- Colonne `source_id` (text)
- Colonne `vehicle_type` (text) sur models uniquement
- Index pour optimisation
- Contraintes d'unicité pour déduplication

**Vérification** :
```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_reference_brands'
AND column_name IN ('source', 'source_id');

-- Devrait retourner 2 lignes
```

### 2. Déployer l'Edge Function

**Important** : La fonction doit être déployée avec l'outil MCP Supabase.

Dans l'interface de chat :
```
Déploie l'edge function import-vehicle-references avec verify_jwt à true
```

Ou manuellement via l'outil :
```typescript
mcp__supabase__deploy_edge_function({
  slug: "import-vehicle-references",
  verify_jwt: true
})
```

**Vérification** :
```bash
# Tester que la fonction répond
curl -X POST \
  'https://VOTRE_PROJECT.supabase.co/functions/v1/import-vehicle-references' \
  -H 'Authorization: Bearer VOTRE_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"mode":"status"}'

# Devrait retourner les statistiques
```

### 3. Ajouter la permission à un admin

Via Supabase SQL Editor :

```sql
-- Remplacer UUID_ADMIN par l'UUID de votre utilisateur admin
INSERT INTO public.user_permissions (user_id, permission)
VALUES ('UUID_ADMIN', 'manage_vehicle_references')
ON CONFLICT (user_id, permission) DO NOTHING;
```

Pour trouver l'UUID de votre utilisateur :
```sql
SELECT id, email FROM auth.users WHERE email = 'votre-email@example.com';
```

**Vérification** :
```sql
-- Vérifier que la permission existe
SELECT u.email, up.permission
FROM auth.users u
JOIN public.user_permissions up ON u.id = up.user_id
WHERE up.permission = 'manage_vehicle_references';
```

### 4. Déployer le frontend

```bash
npm run build
# Les fichiers modifiés sont déjà inclus dans le build
```

Le build compile automatiquement :
- Le nouveau composant `ImportVehicleReferences`
- Les routes dans `Dashboard`
- Le menu dans `Sidebar`

### 5. Tester l'interface

1. Se connecter avec le compte admin
2. Aller dans le menu "Administration"
3. Cliquer sur "Import Références Véhicules"
4. Vérifier que les statistiques s'affichent
5. Cliquer sur "Lancer l'import depuis NHTSA"
6. Attendre la fin de l'import
7. Vérifier les résultats

**Résultat attendu** :
- Marques insérées : ~50
- Modèles insérés : ~1000-2000
- Aucune erreur bloquante

### 6. Vérifier les données importées

```sql
-- Compter les marques NHTSA
SELECT COUNT(*) FROM vehicle_reference_brands WHERE source = 'nhtsa';

-- Compter les modèles NHTSA
SELECT COUNT(*) FROM vehicle_reference_models WHERE source = 'nhtsa';

-- Voir quelques exemples
SELECT id, name, source, source_id
FROM vehicle_reference_brands
WHERE source = 'nhtsa'
LIMIT 10;

-- Voir quelques modèles avec leur marque
SELECT
  b.name as brand_name,
  m.name as model_name,
  m.vehicle_type,
  m.source_id
FROM vehicle_reference_models m
JOIN vehicle_reference_brands b ON m.brand_id = b.id
WHERE m.source = 'nhtsa'
LIMIT 20;
```

### 7. Tester le modal "Nouveau véhicule"

1. Aller dans "Parc > Véhicules"
2. Cliquer sur "Nouveau véhicule"
3. Dans le champ "Marque", commencer à taper (ex: "Ford")
4. Vérifier que les marques NHTSA apparaissent dans la liste
5. Sélectionner une marque NHTSA
6. Vérifier que les modèles se chargent automatiquement
7. Sélectionner un modèle
8. Vérifier que énergie et couleur affichent les options dynamiques
9. Créer le véhicule

**Résultat attendu** :
- Les combobox affichent les données NHTSA + manuelles
- Le véhicule se crée correctement
- Les champs marque/modèle sont bien remplis

## Rollback

Si besoin de revenir en arrière :

### Supprimer les données importées
```sql
-- Supprimer uniquement les données NHTSA
DELETE FROM vehicle_reference_models WHERE source = 'nhtsa';
DELETE FROM vehicle_reference_brands WHERE source = 'nhtsa';
```

### Supprimer les colonnes ajoutées
```sql
-- Attention : ceci supprime les données source/source_id de TOUTES les entrées
ALTER TABLE vehicle_reference_brands DROP COLUMN IF EXISTS source;
ALTER TABLE vehicle_reference_brands DROP COLUMN IF EXISTS source_id;
ALTER TABLE vehicle_reference_models DROP COLUMN IF EXISTS source;
ALTER TABLE vehicle_reference_models DROP COLUMN IF EXISTS source_id;
ALTER TABLE vehicle_reference_models DROP COLUMN IF EXISTS vehicle_type;
```

### Supprimer l'Edge Function

Via Supabase Dashboard :
1. Aller dans "Edge Functions"
2. Trouver "import-vehicle-references"
3. Cliquer sur "Delete"

### Masquer l'interface

Dans `Sidebar.tsx`, mettre `enabled: false` :
```typescript
{
  id: 'admin/import-vehicle-references',
  label: 'Import Références Véhicules',
  icon: Database,
  enabled: false  // Masquer sans supprimer
}
```

## Troubleshooting

### L'Edge Function ne répond pas

**Cause possible** : Fonction non déployée ou JWT mal configuré

**Solution** :
1. Vérifier dans Supabase Dashboard > Edge Functions
2. Vérifier les logs de la fonction
3. Re-déployer avec verify_jwt: true

### Permission denied

**Cause** : L'utilisateur n'a pas la permission

**Solution** :
```sql
-- Vérifier les permissions de l'utilisateur
SELECT permission FROM user_permissions WHERE user_id = 'UUID_USER';

-- Ajouter la permission
INSERT INTO user_permissions (user_id, permission)
VALUES ('UUID_USER', 'manage_vehicle_references');
```

### Pas de données importées

**Cause possible** : Import déjà effectué

**Solution** :
```sql
-- Vérifier les données existantes
SELECT source, COUNT(*) FROM vehicle_reference_brands GROUP BY source;
SELECT source, COUNT(*) FROM vehicle_reference_models GROUP BY source;
```

Si `source='nhtsa'` existe, c'est normal, les doublons sont ignorés.

### Erreur CORS

**Cause** : Headers CORS mal configurés

**Solution** :
Vérifier que l'Edge Function contient :
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
```

## Vérification post-déploiement

### Checklist

- [ ] Migration SQL exécutée avec succès
- [ ] Colonnes source/source_id existent
- [ ] Edge Function déployée
- [ ] Edge Function répond au mode status
- [ ] Permission ajoutée à au moins un admin
- [ ] Build frontend réussi
- [ ] Menu "Import Références Véhicules" visible
- [ ] Statistiques s'affichent correctement
- [ ] Import s'exécute sans erreur critique
- [ ] Données NHTSA présentes en base
- [ ] Modal "Nouveau véhicule" affiche les données NHTSA
- [ ] Création de véhicule fonctionne avec référentiels

### Commandes de vérification

```sql
-- Vérifier la structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('vehicle_reference_brands', 'vehicle_reference_models')
ORDER BY table_name, ordinal_position;

-- Vérifier les données
SELECT
  'brands' as table_name,
  source,
  COUNT(*) as count
FROM vehicle_reference_brands
GROUP BY source
UNION ALL
SELECT
  'models' as table_name,
  source,
  COUNT(*) as count
FROM vehicle_reference_models
GROUP BY source;

-- Vérifier les permissions
SELECT
  u.email,
  up.permission,
  up.actif
FROM user_permissions up
JOIN app_utilisateur au ON up.user_id = au.id
JOIN auth.users u ON au.auth_user_id = u.id
WHERE up.permission IN ('manage_vehicle_references', 'super_admin')
AND up.actif = true;
```

## Support

En cas de problème :

1. Consulter les logs de l'Edge Function dans Supabase Dashboard
2. Vérifier le guide complet : `GUIDE-IMPORT-MASSIF-REFERENCES-VEHICULES.md`
3. Vérifier la documentation d'intégration : `INTEGRATION-REFERENTIELS-VEHICULES.md`

---

**Date** : 2026-03-17
**Version** : 1.0
**Status** : ✅ Prêt pour déploiement
