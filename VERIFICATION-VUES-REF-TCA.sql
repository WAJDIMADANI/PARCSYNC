-- ============================================================
-- VÉRIFICATION: Toutes les vues incluent ref_tca
-- ============================================================

-- 1. Lister toutes les vues qui utilisent la table vehicule
SELECT
  table_name AS vue,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    view_definition ILIKE '%vehicule%'
    OR table_name ILIKE '%vehicle%'
  )
ORDER BY table_name;

-- 2. Vérifier les colonnes de v_vehicles_list
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list'
ORDER BY ordinal_position;

-- 3. Vérifier les colonnes de v_vehicles_list_ui
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list_ui'
ORDER BY ordinal_position;

-- 4. Tester un SELECT sur v_vehicles_list avec ref_tca
SELECT
  id,
  immatriculation,
  ref_tca,
  marque,
  modele
FROM v_vehicles_list
LIMIT 3;

-- 5. Tester un SELECT sur v_vehicles_list_ui avec ref_tca
SELECT
  id,
  immatriculation,
  ref_tca,
  marque,
  modele
FROM v_vehicles_list_ui
LIMIT 3;

-- 6. Vérifier que les attributions utilisent vehicule_id
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'attribution_vehicule'
  AND column_name IN ('vehicule_id', 'immatriculation', 'ref_tca')
ORDER BY column_name;

-- 7. Vérifier la contrainte FK sur attribution_vehicule
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'attribution_vehicule'
  AND kcu.column_name = 'vehicule_id';

-- ============================================================
-- RÉSULTAT ATTENDU:
-- ✅ ref_tca présent dans vehicule
-- ✅ ref_tca présent dans v_vehicles_list
-- ✅ ref_tca présent dans v_vehicles_list_ui
-- ✅ attribution_vehicule a une FK sur vehicule_id (UUID)
-- ✅ attribution_vehicule n'a PAS de colonnes immatriculation ou ref_tca
-- ============================================================
