/*
  DIAGNOSTIC COMPLET - Module Véhicules

  Ce script vérifie :
  1. Existence des tables et colonnes
  2. Policies RLS
  3. Permissions utilisateur authentifié
  4. Exemples de requêtes
*/

-- ============================================================================
-- 1. VÉRIFIER LES TABLES ET COLONNES
-- ============================================================================

-- Vérifier table vehicule et ses colonnes
SELECT 'Table vehicule' as verification,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicule')
       THEN '✓ Existe' ELSE '✗ Manquante' END as statut;

-- Lister toutes les colonnes de vehicule
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicule'
ORDER BY ordinal_position;

-- Vérifier colonnes spécifiques requises
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'reference_tca') THEN '✓' ELSE '✗' END as reference_tca,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'immat_norm') THEN '✓' ELSE '✗' END as immat_norm,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'kilometrage_actuel') THEN '✓' ELSE '✗' END as kilometrage_actuel,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'carte_essence_fournisseur') THEN '✓' ELSE '✗' END as carte_essence_fournisseur,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'assurance_type') THEN '✓' ELSE '✗' END as assurance_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'assurance_compagnie') THEN '✓' ELSE '✗' END as assurance_compagnie;

-- Vérifier table historique_kilometrage
SELECT 'Table historique_kilometrage' as verification,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'historique_kilometrage')
       THEN '✓ Existe' ELSE '✗ Manquante' END as statut;

-- Vérifier table document_vehicule
SELECT 'Table document_vehicule' as verification,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_vehicule')
       THEN '✓ Existe' ELSE '✗ Manquante' END as statut;

-- ============================================================================
-- 2. VÉRIFIER LES POLICIES RLS
-- ============================================================================

-- Policies sur vehicule
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'vehicule'
ORDER BY cmd;

-- Policies sur historique_kilometrage
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'historique_kilometrage'
ORDER BY cmd;

-- Policies sur document_vehicule
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'document_vehicule'
ORDER BY cmd;

-- Vérifier si RLS est activé
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('vehicule', 'historique_kilometrage', 'document_vehicule')
ORDER BY tablename;

-- ============================================================================
-- 3. TESTER LES PERMISSIONS (en tant qu'utilisateur authentifié)
-- ============================================================================

-- Test SELECT sur vehicule (doit retourner au moins 1 ligne si des véhicules existent)
SELECT
  COUNT(*) as nb_vehicules,
  'Test SELECT vehicule' as test
FROM vehicule;

-- Test UPDATE sur vehicule (simulé - pas exécuté)
-- Ceci montre juste qu'on peut faire un UPDATE
SELECT 'Test UPDATE vehicule - à tester manuellement avec un vrai ID' as note;

-- Exemple de requête UPDATE à tester :
-- UPDATE vehicule SET marque = 'Test' WHERE id = 'VOTRE_ID_ICI';

-- ============================================================================
-- 4. VÉRIFIER LES INDEX
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('vehicule', 'historique_kilometrage', 'document_vehicule')
ORDER BY tablename, indexname;

-- ============================================================================
-- 5. VÉRIFIER LES CONTRAINTES
-- ============================================================================

SELECT
  conname as constraint_name,
  contype as constraint_type,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid::regclass::text IN ('vehicule', 'historique_kilometrage', 'document_vehicule')
ORDER BY table_name, constraint_type;

-- ============================================================================
-- 6. EXEMPLE DE DONNÉE - UN VÉHICULE
-- ============================================================================

-- Afficher un véhicule avec toutes ses colonnes
SELECT *
FROM vehicule
LIMIT 1;

-- ============================================================================
-- 7. RÉCAPITULATIF
-- ============================================================================

DO $$
DECLARE
  v_vehicule_exists boolean;
  v_historique_exists boolean;
  v_document_exists boolean;
  v_col_count integer;
  v_policies_count integer;
BEGIN
  -- Vérifier tables
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicule') INTO v_vehicule_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'historique_kilometrage') INTO v_historique_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_vehicule') INTO v_document_exists;

  -- Compter colonnes véhicule
  SELECT COUNT(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_name = 'vehicule'
    AND column_name IN (
      'reference_tca', 'immat_norm', 'kilometrage_actuel', 'carte_essence_fournisseur',
      'assurance_type', 'assurance_compagnie', 'assurance_numero_contrat',
      'licence_transport_numero', 'carte_essence_numero', 'carte_essence_attribuee',
      'date_premiere_mise_en_circulation', 'materiel_embarque', 'derniere_maj_kilometrage', 'photo_path'
    );

  -- Compter policies
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE tablename IN ('vehicule', 'historique_kilometrage', 'document_vehicule');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉCAPITULATIF DIAGNOSTIC';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Table vehicule: %', CASE WHEN v_vehicule_exists THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Table historique_kilometrage: %', CASE WHEN v_historique_exists THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Table document_vehicule: %', CASE WHEN v_document_exists THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Colonnes étendues vehicule: % / 14', v_col_count;
  RAISE NOTICE 'Policies RLS totales: %', v_policies_count;
  RAISE NOTICE '========================================';

  IF v_vehicule_exists AND v_historique_exists AND v_document_exists AND v_col_count = 14 THEN
    RAISE NOTICE '✓ Configuration complète';
  ELSE
    RAISE WARNING '⚠ Configuration incomplète - voir détails ci-dessus';
  END IF;
END $$;
