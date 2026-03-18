-- Vérification de l'import des marques et modèles de véhicules

-- 1. Statistiques globales
SELECT
  '=== STATISTIQUES GLOBALES ===' as section;

SELECT
  'Marques' as type,
  COUNT(*) as total,
  COUNT(DISTINCT source) as sources_distinctes,
  MIN(created_at) as premiere_insertion,
  MAX(created_at) as derniere_insertion
FROM vehicle_reference_brands

UNION ALL

SELECT
  'Modèles' as type,
  COUNT(*) as total,
  COUNT(DISTINCT source) as sources_distinctes,
  MIN(created_at) as premiere_insertion,
  MAX(created_at) as derniere_insertion
FROM vehicle_reference_models;

-- 2. Détail par source
SELECT
  '=== DÉTAIL PAR SOURCE ===' as section;

SELECT
  'Marques' as type,
  source,
  COUNT(*) as total
FROM vehicle_reference_brands
GROUP BY source
ORDER BY total DESC;

SELECT
  'Modèles' as type,
  source,
  COUNT(*) as total
FROM vehicle_reference_models
GROUP BY source
ORDER BY total DESC;

-- 3. Top 20 marques avec le plus de modèles
SELECT
  '=== TOP 20 MARQUES (par nombre de modèles) ===' as section;

SELECT
  b.name as marque,
  b.source,
  COUNT(m.id) as nombre_modeles
FROM vehicle_reference_brands b
LEFT JOIN vehicle_reference_models m ON m.brand_id = b.id
GROUP BY b.id, b.name, b.source
ORDER BY nombre_modeles DESC
LIMIT 20;

-- 4. Marques sans modèles
SELECT
  '=== MARQUES SANS MODÈLES ===' as section;

SELECT
  COUNT(*) as total_marques_sans_modeles
FROM vehicle_reference_brands b
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_reference_models m WHERE m.brand_id = b.id
);

-- 5. Exemples de modèles par type de véhicule
SELECT
  '=== RÉPARTITION PAR TYPE DE VÉHICULE ===' as section;

SELECT
  COALESCE(vehicle_type, 'Non spécifié') as type_vehicule,
  COUNT(*) as nombre_modeles
FROM vehicle_reference_models
GROUP BY vehicle_type
ORDER BY nombre_modeles DESC
LIMIT 10;

-- 6. Vérification des doublons
SELECT
  '=== VÉRIFICATION DES DOUBLONS ===' as section;

SELECT
  'Marques avec source_id dupliqué' as type,
  COUNT(*) as total
FROM (
  SELECT source_id
  FROM vehicle_reference_brands
  WHERE source_id IS NOT NULL
  GROUP BY source_id
  HAVING COUNT(*) > 1
) as duplicates

UNION ALL

SELECT
  'Modèles avec source_id dupliqué' as type,
  COUNT(*) as total
FROM (
  SELECT source_id
  FROM vehicle_reference_models
  WHERE source_id IS NOT NULL
  GROUP BY source_id
  HAVING COUNT(*) > 1
) as duplicates;

-- 7. Dernières marques insérées
SELECT
  '=== 10 DERNIÈRES MARQUES INSÉRÉES ===' as section;

SELECT
  name,
  source,
  source_id,
  created_at
FROM vehicle_reference_brands
ORDER BY created_at DESC
LIMIT 10;

-- 8. Derniers modèles insérés
SELECT
  '=== 10 DERNIERS MODÈLES INSÉRÉS ===' as section;

SELECT
  m.name as modele,
  b.name as marque,
  m.vehicle_type,
  m.source,
  m.created_at
FROM vehicle_reference_models m
JOIN vehicle_reference_brands b ON b.id = m.brand_id
ORDER BY m.created_at DESC
LIMIT 10;
