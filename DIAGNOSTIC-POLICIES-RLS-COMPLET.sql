/*
  # DIAGNOSTIC COMPLET DES POLICIES RLS

  Ce script va :
  1. Lister TOUTES les policies RLS existantes
  2. Afficher les définitions complètes (USING et WITH CHECK)
  3. Identifier les policies récursives
  4. Afficher l'état de RLS sur chaque table
  5. Compter les données actuelles
  6. Tester la vue utilisateur_avec_permissions

  EXÉCUTEZ CE SCRIPT DANS L'ÉDITEUR SQL DE SUPABASE
*/

-- =====================================================
-- SECTION 1: LISTE DES POLICIES RLS EXISTANTES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECTION 1: POLICIES RLS EXISTANTES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Afficher toutes les policies sur les tables critiques
SELECT
  '📋 POLICIES SUR LES TABLES CRITIQUES' as titre;

SELECT
  tablename as "Table",
  policyname as "Policy Name",
  CASE cmd
    WHEN 'SELECT' THEN '🔍 SELECT'
    WHEN 'INSERT' THEN '➕ INSERT'
    WHEN 'UPDATE' THEN '✏️ UPDATE'
    WHEN 'DELETE' THEN '🗑️ DELETE'
    WHEN '*' THEN '🔓 ALL'
    ELSE cmd
  END as "Operation",
  roles::text as "Roles"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('app_utilisateur', 'utilisateur_permissions', 'demande_standard')
ORDER BY tablename, cmd, policyname;

-- =====================================================
-- SECTION 2: DÉTAILS COMPLETS DES POLICIES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECTION 2: DÉTAILS COMPLETS DES POLICIES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Policies sur app_utilisateur avec définitions complètes
SELECT
  '🔧 POLICIES SUR app_utilisateur' as titre;

SELECT
  policyname as "Policy Name",
  CASE cmd
    WHEN 'SELECT' THEN 'SELECT'
    WHEN 'INSERT' THEN 'INSERT'
    WHEN 'UPDATE' THEN 'UPDATE'
    WHEN 'DELETE' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as "Operation",
  CASE
    WHEN qual IS NOT NULL THEN pg_get_expr(qual, 'app_utilisateur'::regclass)
    ELSE 'N/A'
  END as "USING Clause",
  CASE
    WHEN with_check IS NOT NULL THEN pg_get_expr(with_check, 'app_utilisateur'::regclass)
    ELSE 'N/A'
  END as "WITH CHECK Clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'app_utilisateur'
ORDER BY cmd, policyname;

-- Policies sur utilisateur_permissions
SELECT
  '🔧 POLICIES SUR utilisateur_permissions' as titre;

SELECT
  policyname as "Policy Name",
  CASE cmd
    WHEN 'SELECT' THEN 'SELECT'
    WHEN 'INSERT' THEN 'INSERT'
    WHEN 'UPDATE' THEN 'UPDATE'
    WHEN 'DELETE' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as "Operation",
  CASE
    WHEN qual IS NOT NULL THEN pg_get_expr(qual, 'utilisateur_permissions'::regclass)
    ELSE 'N/A'
  END as "USING Clause",
  CASE
    WHEN with_check IS NOT NULL THEN pg_get_expr(with_check, 'utilisateur_permissions'::regclass)
    ELSE 'N/A'
  END as "WITH CHECK Clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'utilisateur_permissions'
ORDER BY cmd, policyname;

-- Policies sur demande_standard
SELECT
  '🔧 POLICIES SUR demande_standard' as titre;

SELECT
  policyname as "Policy Name",
  CASE cmd
    WHEN 'SELECT' THEN 'SELECT'
    WHEN 'INSERT' THEN 'INSERT'
    WHEN 'UPDATE' THEN 'UPDATE'
    WHEN 'DELETE' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as "Operation",
  CASE
    WHEN qual IS NOT NULL THEN pg_get_expr(qual, 'demande_standard'::regclass)
    ELSE 'N/A'
  END as "USING Clause",
  CASE
    WHEN with_check IS NOT NULL THEN pg_get_expr(with_check, 'demande_standard'::regclass)
    ELSE 'N/A'
  END as "WITH CHECK Clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'demande_standard'
ORDER BY cmd, policyname;

-- =====================================================
-- SECTION 3: ÉTAT DE RLS SUR LES TABLES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECTION 3: ÉTAT DE RLS SUR LES TABLES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

SELECT
  '📊 ÉTAT RLS' as titre;

SELECT
  tablename as "Table",
  CASE
    WHEN rowsecurity THEN '✅ ACTIVÉ'
    ELSE '❌ DÉSACTIVÉ'
  END as "RLS Status",
  (SELECT COUNT(*)
   FROM pg_policies
   WHERE pg_policies.schemaname = 'public'
   AND pg_policies.tablename = pg_tables.tablename) as "Nombre de Policies"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('app_utilisateur', 'utilisateur_permissions', 'demande_standard')
ORDER BY tablename;

-- =====================================================
-- SECTION 4: DÉTECTION DES RÉCURSIONS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECTION 4: DÉTECTION DES RÉCURSIONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

SELECT
  '⚠️ POLICIES POTENTIELLEMENT RÉCURSIVES' as titre;

-- Policies qui référencent app_utilisateur dans leur USING clause
SELECT
  tablename as "Table",
  policyname as "Policy Name",
  CASE
    WHEN qual IS NOT NULL THEN pg_get_expr(qual, tablename::regclass)
    ELSE 'N/A'
  END as "USING Clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('app_utilisateur', 'utilisateur_permissions', 'demande_standard')
  AND (
    (qual IS NOT NULL AND pg_get_expr(qual, tablename::regclass) LIKE '%app_utilisateur%')
    OR
    (with_check IS NOT NULL AND pg_get_expr(with_check, tablename::regclass) LIKE '%app_utilisateur%')
  )
ORDER BY tablename;

-- =====================================================
-- SECTION 5: COMPTAGE DES DONNÉES ACTUELLES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECTION 5: COMPTAGE DES DONNÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Désactiver temporairement RLS pour compter
SET LOCAL ROLE postgres;

SELECT
  '📈 COMPTAGE DES DONNÉES' as titre;

SELECT
  'app_utilisateur' as "Table",
  COUNT(*) as "Nombre de lignes"
FROM app_utilisateur
UNION ALL
SELECT
  'utilisateur_permissions' as "Table",
  COUNT(*) as "Nombre de lignes"
FROM utilisateur_permissions
UNION ALL
SELECT
  'demande_standard' as "Table",
  COUNT(*) as "Nombre de lignes"
FROM demande_standard;

-- Liste des utilisateurs
SELECT
  '👥 UTILISATEURS EXISTANTS' as titre;

SELECT
  id,
  email,
  nom,
  prenom,
  actif,
  auth_user_id,
  created_at
FROM app_utilisateur
ORDER BY created_at DESC;

-- Permissions par utilisateur
SELECT
  '🔐 PERMISSIONS PAR UTILISATEUR' as titre;

SELECT
  au.email as "Email",
  au.nom as "Nom",
  au.prenom as "Prénom",
  COUNT(up.id) as "Nb Permissions",
  string_agg(up.section_id, ', ' ORDER BY up.section_id) as "Sections"
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON au.id = up.utilisateur_id AND up.actif = true
GROUP BY au.id, au.email, au.nom, au.prenom
ORDER BY au.email;

-- =====================================================
-- SECTION 6: TEST DE LA VUE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECTION 6: TEST DE LA VUE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

SELECT
  '🔍 TEST utilisateur_avec_permissions' as titre;

-- Tenter de lire la vue
DO $$
DECLARE
  v_count integer;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO v_count FROM utilisateur_avec_permissions;
    RAISE NOTICE '✅ Vue accessible : % lignes', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERREUR lors de la lecture de la vue: %', SQLERRM;
  END;
END $$;

-- Si la vue fonctionne, afficher son contenu
SELECT
  id,
  email,
  nom,
  prenom,
  actif,
  array_length(permissions, 1) as "Nb Permissions",
  permissions
FROM utilisateur_avec_permissions
ORDER BY email;

-- =====================================================
-- SECTION 7: RÉSUMÉ ET RECOMMANDATIONS
-- =====================================================

DO $$
DECLARE
  v_nb_policies_app_utilisateur integer;
  v_nb_policies_utilisateur_permissions integer;
  v_nb_policies_demande_standard integer;
  v_rls_app_utilisateur boolean;
  v_rls_utilisateur_permissions boolean;
  v_nb_users integer;
  v_nb_permissions integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECTION 7: RÉSUMÉ ET RECOMMANDATIONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Compter les policies
  SELECT COUNT(*) INTO v_nb_policies_app_utilisateur
  FROM pg_policies
  WHERE tablename = 'app_utilisateur' AND schemaname = 'public';

  SELECT COUNT(*) INTO v_nb_policies_utilisateur_permissions
  FROM pg_policies
  WHERE tablename = 'utilisateur_permissions' AND schemaname = 'public';

  SELECT COUNT(*) INTO v_nb_policies_demande_standard
  FROM pg_policies
  WHERE tablename = 'demande_standard' AND schemaname = 'public';

  -- Vérifier l'état de RLS
  SELECT rowsecurity INTO v_rls_app_utilisateur
  FROM pg_tables
  WHERE tablename = 'app_utilisateur' AND schemaname = 'public';

  SELECT rowsecurity INTO v_rls_utilisateur_permissions
  FROM pg_tables
  WHERE tablename = 'utilisateur_permissions' AND schemaname = 'public';

  -- Compter les données
  SELECT COUNT(*) INTO v_nb_users FROM app_utilisateur;
  SELECT COUNT(*) INTO v_nb_permissions FROM utilisateur_permissions;

  RAISE NOTICE '📊 RÉSUMÉ:';
  RAISE NOTICE '---';
  RAISE NOTICE 'Policies sur app_utilisateur: %', v_nb_policies_app_utilisateur;
  RAISE NOTICE 'Policies sur utilisateur_permissions: %', v_nb_policies_utilisateur_permissions;
  RAISE NOTICE 'Policies sur demande_standard: %', v_nb_policies_demande_standard;
  RAISE NOTICE '';
  RAISE NOTICE 'RLS sur app_utilisateur: %', CASE WHEN v_rls_app_utilisateur THEN 'ACTIVÉ' ELSE 'DÉSACTIVÉ' END;
  RAISE NOTICE 'RLS sur utilisateur_permissions: %', CASE WHEN v_rls_utilisateur_permissions THEN 'ACTIVÉ' ELSE 'DÉSACTIVÉ' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Utilisateurs: %', v_nb_users;
  RAISE NOTICE 'Permissions: %', v_nb_permissions;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️ RECOMMANDATIONS:';
  RAISE NOTICE '========================================';

  IF v_nb_policies_app_utilisateur > 0 OR v_nb_policies_utilisateur_permissions > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ PROBLÈME DÉTECTÉ: Récursion infinie dans les policies RLS';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 SOLUTION:';
    RAISE NOTICE '1. Supprimer TOUTES les policies sur app_utilisateur';
    RAISE NOTICE '2. Supprimer TOUTES les policies sur utilisateur_permissions';
    RAISE NOTICE '3. Désactiver RLS sur utilisateur_permissions (table de permissions non sensible)';
    RAISE NOTICE '4. Créer des policies SIMPLES sur app_utilisateur (USING true pour authenticated)';
    RAISE NOTICE '5. Gérer les permissions au niveau applicatif (React)';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Utilisez le script: FIX-RECURSION-POLICIES-FINAL.sql';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Aucune policy détectée - RLS est sécurisé';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- FIN DU DIAGNOSTIC
-- =====================================================

SELECT
  '✅ Diagnostic terminé' as "Statut",
  'Vérifiez les résultats ci-dessus' as "Action";
