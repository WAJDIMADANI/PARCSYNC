/*
  # Script complet de résolution du problème d'accès

  Ce script va :
  1. Diagnostiquer l'état actuel des tables
  2. Désactiver temporairement RLS
  3. Nettoyer complètement les tables
  4. Réactiver RLS
  5. Afficher l'état final

  IMPORTANT: Après avoir exécuté ce script:
  - Videz le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
  - Déconnectez-vous de l'application
  - Reconnectez-vous
  - L'interface FirstAdminSetup devrait apparaître
*/

-- =====================================================
-- ÉTAPE 1: DIAGNOSTIC INITIAL
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC INITIAL';
  RAISE NOTICE '========================================';
END $$;

-- Vérifier le nombre d'utilisateurs
SELECT
  'app_utilisateur' as table_name,
  COUNT(*) as nombre_lignes
FROM app_utilisateur;

-- Vérifier le nombre de permissions
SELECT
  'utilisateur_permissions' as table_name,
  COUNT(*) as nombre_lignes
FROM utilisateur_permissions;

-- Vérifier les utilisateurs Auth
SELECT
  'auth.users' as table_name,
  COUNT(*) as nombre_utilisateurs_auth
FROM auth.users;

-- Vérifier l'état de RLS
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_active
FROM pg_tables
WHERE tablename IN ('app_utilisateur', 'utilisateur_permissions');

-- =====================================================
-- ÉTAPE 2: DÉSACTIVER TEMPORAIREMENT RLS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DÉSACTIVATION TEMPORAIRE DE RLS';
  RAISE NOTICE '========================================';
END $$;

ALTER TABLE app_utilisateur DISABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateur_permissions DISABLE ROW LEVEL SECURITY;

SELECT 'RLS désactivé sur app_utilisateur et utilisateur_permissions' as status;

-- =====================================================
-- ÉTAPE 3: NETTOYAGE COMPLET
-- =====================================================
DO $$
DECLARE
  v_count_perms integer;
  v_count_users integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NETTOYAGE DES TABLES';
  RAISE NOTICE '========================================';

  -- Compter avant suppression
  SELECT COUNT(*) INTO v_count_perms FROM utilisateur_permissions;
  SELECT COUNT(*) INTO v_count_users FROM app_utilisateur;

  RAISE NOTICE 'Permissions à supprimer: %', v_count_perms;
  RAISE NOTICE 'Utilisateurs à supprimer: %', v_count_users;

  -- Supprimer
  DELETE FROM utilisateur_permissions;
  DELETE FROM app_utilisateur;

  -- Vérifier après suppression
  SELECT COUNT(*) INTO v_count_perms FROM utilisateur_permissions;
  SELECT COUNT(*) INTO v_count_users FROM app_utilisateur;

  RAISE NOTICE '';
  RAISE NOTICE 'Après suppression:';
  RAISE NOTICE '- Permissions restantes: %', v_count_perms;
  RAISE NOTICE '- Utilisateurs restants: %', v_count_users;

  IF v_count_perms = 0 AND v_count_users = 0 THEN
    RAISE NOTICE '✓ Tables nettoyées avec succès';
  ELSE
    RAISE WARNING '⚠ Attention: Des données sont encore présentes!';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 4: RÉACTIVER RLS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉACTIVATION DE RLS';
  RAISE NOTICE '========================================';
END $$;

ALTER TABLE app_utilisateur ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateur_permissions ENABLE ROW LEVEL SECURITY;

SELECT 'RLS réactivé sur app_utilisateur et utilisateur_permissions' as status;

-- =====================================================
-- ÉTAPE 5: VÉRIFICATION FINALE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION FINALE';
  RAISE NOTICE '========================================';
END $$;

-- État final des tables
SELECT
  'ÉTAT FINAL' as titre,
  '' as separator;

SELECT
  'app_utilisateur' as table_name,
  COUNT(*) as nombre_lignes,
  CASE WHEN COUNT(*) = 0 THEN '✓ Vide (OK)' ELSE '⚠ Non vide' END as status
FROM app_utilisateur
UNION ALL
SELECT
  'utilisateur_permissions' as table_name,
  COUNT(*) as nombre_lignes,
  CASE WHEN COUNT(*) = 0 THEN '✓ Vide (OK)' ELSE '⚠ Non vide' END as status
FROM utilisateur_permissions;

-- Vérifier les politiques RLS
SELECT
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN cmd = 'SELECT' THEN 'Lecture'
    WHEN cmd = 'INSERT' THEN 'Création'
    WHEN cmd = 'UPDATE' THEN 'Modification'
    WHEN cmd = 'DELETE' THEN 'Suppression'
    ELSE cmd
  END as type_operation
FROM pg_policies
WHERE tablename IN ('app_utilisateur', 'utilisateur_permissions')
ORDER BY tablename, cmd;

-- =====================================================
-- INSTRUCTIONS FINALES
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PROCHAINES ÉTAPES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Videz le cache du navigateur:';
  RAISE NOTICE '   - Windows/Linux: Ctrl + Shift + R';
  RAISE NOTICE '   - Mac: Cmd + Shift + R';
  RAISE NOTICE '   - OU ouvrez en navigation privée';
  RAISE NOTICE '';
  RAISE NOTICE '2. Déconnectez-vous de l''application';
  RAISE NOTICE '';
  RAISE NOTICE '3. Reconnectez-vous avec vos identifiants';
  RAISE NOTICE '';
  RAISE NOTICE '4. L''interface "Configuration initiale" devrait apparaître';
  RAISE NOTICE '';
  RAISE NOTICE '5. Remplissez vos nom et prénom';
  RAISE NOTICE '';
  RAISE NOTICE '6. Vous obtiendrez toutes les permissions !';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Si FirstAdminSetup ne s''affiche toujours pas:';
  RAISE NOTICE '- Vérifiez la console du navigateur (F12)';
  RAISE NOTICE '- Utilisez le script: CREATE-ADMIN-DIRECTLY.sql';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
