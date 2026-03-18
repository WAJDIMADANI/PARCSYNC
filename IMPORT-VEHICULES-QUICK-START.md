# Import Massif Véhicules - Démarrage Rapide

## 1. Activer les permissions d'insertion (une seule fois)

Exécutez ce SQL dans Supabase SQL Editor :

```bash
cat allow-vehicle-reference-insert.sql
```

Copiez le contenu et exécutez-le dans Supabase Dashboard > SQL Editor

## 2. Lancer l'import

```bash
node scripts/import-vehicle-brands-models.mjs
```

**Durée estimée** : 25-45 minutes pour importer 12 000+ marques et leurs modèles

## 3. Vérifier l'import

Exécutez dans Supabase SQL Editor :

```sql
-- Nombre total
SELECT 'Marques' as type, COUNT(*) as total FROM vehicle_reference_brands
UNION ALL
SELECT 'Modèles' as type, COUNT(*) as total FROM vehicle_reference_models;

-- Top 10 marques
SELECT b.name, COUNT(m.id) as nb_modeles
FROM vehicle_reference_brands b
LEFT JOIN vehicle_reference_models m ON m.brand_id = b.id
GROUP BY b.id, b.name
ORDER BY nb_modeles DESC
LIMIT 10;
```

Ou utilisez le script complet :

```bash
cat scripts/verify-import.sql
```

## En cas d'erreur RLS

Si vous voyez : `new row violates row-level security policy`

Exécutez `allow-vehicle-reference-insert.sql` dans Supabase SQL Editor

## Ce qui est importé

- ✅ **12 000+ marques** depuis NHTSA
- ✅ **Des milliers de modèles** pour chaque marque
- ✅ Source : NHTSA (officiel US Department of Transportation)
- ✅ Gestion automatique des doublons
- ✅ Type de véhicule quand disponible

## Ce qui n'est PAS importé

- ❌ Finitions (trims) - non géré pour l'instant
- ❌ Années de production
- ❌ Caractéristiques techniques

## Relancer l'import

Vous pouvez relancer le script à tout moment :

```bash
node scripts/import-vehicle-brands-models.mjs
```

Il détecte automatiquement les données existantes et n'insère que les nouvelles.

## Résultat attendu

```
✅ Import terminé avec succès !
⏱️  Durée : 2745s

📊 Statistiques :
   - Marques insérées : 12172
   - Marques ignorées : 0
   - Modèles insérés : 45231
   - Modèles ignorés : 0
```

## Documentation complète

Voir `scripts/README-IMPORT.md` pour tous les détails.
