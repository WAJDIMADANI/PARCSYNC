-- ============================================================
-- VÉRIFICATION APRÈS FIX: Vue v_vehicles_list_ui
-- ============================================================
-- À exécuter APRÈS avoir appliqué FIX-VUE-VEHICLES-FINAL.sql
-- ============================================================

-- Test 1: La vue existe
SELECT
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE viewname = 'v_vehicles_list_ui';
-- ✅ Attendu: 1 ligne (public, v_vehicles_list_ui, postgres)

-- Test 2: La colonne ref_tca existe dans la vue
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list_ui'
  AND column_name = 'ref_tca';
-- ✅ Attendu: 1 ligne (ref_tca, text)

-- Test 3: SELECT fonctionne sans erreur
SELECT
  id,
  immatriculation,
  ref_tca,
  marque,
  modele,
  locataire_affiche,
  nb_chauffeurs_actifs
FROM v_vehicles_list_ui
LIMIT 5;
-- ✅ Attendu: 0 à 5 lignes de véhicules

-- Test 4: Vérifier la structure complète de la vue
SELECT
  column_name,
  data_type,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list_ui'
ORDER BY ordinal_position;
-- ✅ Attendu: ~40-50 colonnes incluant ref_tca

-- Test 5: Vérifier les colonnes clés
SELECT
  COUNT(*) FILTER (WHERE column_name = 'id') AS has_id,
  COUNT(*) FILTER (WHERE column_name = 'ref_tca') AS has_ref_tca,
  COUNT(*) FILTER (WHERE column_name = 'immatriculation') AS has_immat,
  COUNT(*) FILTER (WHERE column_name = 'locataire_affiche') AS has_locataire,
  COUNT(*) FILTER (WHERE column_name = 'chauffeurs_actifs') AS has_chauffeurs,
  COUNT(*) FILTER (WHERE column_name = 'nb_chauffeurs_actifs') AS has_nb_chauffeurs
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list_ui';
-- ✅ Attendu: Tous = 1

-- Test 6: Vérifier qu'il n'y a pas de colonne deleted_at
SELECT
  COUNT(*) AS deleted_at_found
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list_ui'
  AND column_name = 'deleted_at';
-- ✅ Attendu: 0 (la colonne ne doit PAS exister)

-- Test 7: Test avec filtres (comme dans VehicleListNew.tsx)
SELECT
  COUNT(*) AS total_vehicules,
  COUNT(*) FILTER (WHERE ref_tca IS NOT NULL) AS avec_ref_tca,
  COUNT(*) FILTER (WHERE ref_tca IS NULL) AS sans_ref_tca
FROM v_vehicles_list_ui;
-- ✅ Attendu: total_vehicules > 0

-- Test 8: Vérifier les chauffeurs actifs (JSON)
SELECT
  immatriculation,
  ref_tca,
  nb_chauffeurs_actifs,
  chauffeurs_actifs::text AS chauffeurs_json
FROM v_vehicles_list_ui
WHERE nb_chauffeurs_actifs > 0
LIMIT 3;
-- ✅ Attendu: Véhicules avec attributions

-- Test 9: Vérifier locataire_affiche
SELECT
  immatriculation,
  ref_tca,
  locataire_type,
  locataire_affiche
FROM v_vehicles_list_ui
LIMIT 10;
-- ✅ Attendu: locataire_affiche rempli pour tous

-- Test 10: Performance de la vue
EXPLAIN ANALYZE
SELECT * FROM v_vehicles_list_ui;
-- ✅ Vérifier que le temps d'exécution est raisonnable (< 1 seconde)

-- ============================================================
-- RÉSULTATS ATTENDUS
-- ============================================================
/*
✅ Test 1: Vue existe
✅ Test 2: ref_tca présent
✅ Test 3: SELECT fonctionne
✅ Test 4: ~40-50 colonnes
✅ Test 5: Toutes les colonnes clés = 1
✅ Test 6: deleted_at_found = 0
✅ Test 7: total_vehicules > 0
✅ Test 8: JSON valide
✅ Test 9: locataire_affiche rempli
✅ Test 10: Performance acceptable

Si tous les tests passent → VUE CORRIGÉE ✅
Si un test échoue → Voir ACTION-IMMEDIATE-FIX-VUE.md
*/
