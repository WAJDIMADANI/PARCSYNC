-- ============================================================
-- VÉRIFICATION COLONNE ref_tca
-- ============================================================

-- 1. Vérifier que la colonne existe dans la table vehicule
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vehicule'
  AND column_name = 'ref_tca';

-- 2. Vérifier que la vue v_vehicles_list contient ref_tca
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list'
  AND column_name = 'ref_tca';

-- 3. Vérifier que la vue v_vehicles_list_ui contient ref_tca
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list_ui'
  AND column_name = 'ref_tca';

-- 4. Tester un SELECT avec ref_tca
SELECT
  id,
  immatriculation,
  ref_tca,
  marque,
  modele
FROM vehicule
LIMIT 5;

-- 5. Vérifier les attributions utilisent vehicule_id (UUID)
SELECT
  av.id,
  av.vehicule_id,
  v.immatriculation,
  v.ref_tca,
  av.date_debut,
  av.date_fin
FROM attribution_vehicule av
JOIN vehicule v ON v.id = av.vehicule_id
LIMIT 5;

-- ============================================================
-- RÉSULTAT ATTENDU:
-- - La colonne ref_tca existe dans vehicule, v_vehicles_list et v_vehicles_list_ui
-- - Les attributions sont bien liées via vehicule_id (UUID)
-- - Pas de filtre sur immatriculation ou ref_tca dans attribution_vehicule
-- ============================================================
