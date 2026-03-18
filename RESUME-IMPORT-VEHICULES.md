# ✅ Script d'Import Massif Véhicules Créé

## Fichiers créés

### Script principal
- **`scripts/import-vehicle-brands-models.mjs`** : Script Node.js pour import massif

### SQL
- **`allow-vehicle-reference-insert.sql`** : Migration pour activer les permissions d'insertion
- **`scripts/verify-import.sql`** : Script de vérification détaillé

### Documentation
- **`scripts/README-IMPORT.md`** : Documentation complète
- **`IMPORT-VEHICULES-QUICK-START.md`** : Guide de démarrage rapide

## Commandes

### 1. Activer les permissions (une seule fois)

Exécutez dans Supabase SQL Editor :
```bash
cat allow-vehicle-reference-insert.sql
```

### 2. Lancer l'import
```bash
node scripts/import-vehicle-brands-models.mjs
```

### 3. Vérifier l'import
```bash
cat scripts/verify-import.sql
```
Puis exécutez dans Supabase SQL Editor

## Caractéristiques

✅ **12 000+ marques** depuis NHTSA API
✅ **Des milliers de modèles** pour chaque marque
✅ **Gestion automatique des doublons**
✅ **Traitement par lots** (100 items/batch)
✅ **Rate limiting** (150ms entre requêtes)
✅ **Gestion d'erreurs robuste**
✅ **Logs détaillés** en temps réel
✅ **Reprise possible** (détecte l'existant)

## Tables remplies

- `vehicle_reference_brands` (name, source, source_id)
- `vehicle_reference_models` (brand_id, name, source, source_id, vehicle_type)

## Ce qui n'est PAS touché

❌ Interface utilisateur (aucun bouton)
❌ Modal véhicule
❌ Finitions (trims)
❌ Tables existantes de véhicules

## Durée estimée

- **Marques** : ~30 secondes
- **Modèles** : ~25-45 minutes
- **Total** : ~30-45 minutes

## Sécurité

Le script nécessite :
- Un utilisateur authentifié (via ANON_KEY ou SERVICE_ROLE_KEY)
- Les permissions RLS activées via `allow-vehicle-reference-insert.sql`

## Dépendances ajoutées

- `dotenv` : pour lire les variables d'environnement

## Build

✅ `npm run build` réussi sans erreur

## Notes importantes

1. Le script utilise la clé ANON par défaut (ou SERVICE_ROLE si disponible)
2. Les RLS policies doivent être activées avant le premier import
3. Le script peut être relancé à tout moment sans risque de doublon
4. Les erreurs n'arrêtent pas l'import (continue avec les autres)

## Exemple de résultat

```
✅ Import terminé avec succès !
⏱️  Durée : 2745s

📊 Statistiques :
   - Marques insérées : 12172
   - Marques ignorées : 0
   - Modèles insérés : 45231
   - Modèles ignorés : 0
```

## Vérification rapide

```sql
SELECT COUNT(*) FROM vehicle_reference_brands; -- ~12000
SELECT COUNT(*) FROM vehicle_reference_models; -- ~45000+
```

## En cas de problème

### Erreur RLS
Exécutez `allow-vehicle-reference-insert.sql`

### Timeout
Relancez le script, il reprend où il s'était arrêté

### Variables manquantes
Vérifiez que `.env` contient `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
