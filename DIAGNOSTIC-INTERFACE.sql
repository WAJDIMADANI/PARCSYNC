/*
  # Script de diagnostic pour comprendre pourquoi FirstAdminSetup ne s'affiche pas

  Ce script va vérifier tous les aspects du système pour identifier le problème.
*/

-- =====================================================
-- DIAGNOSTIC COMPLET
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC COMPLET DU SYSTÈME';
  RAISE NOTICE '========================================';
END $$;

-- 1. Vérifier les utilisateurs Auth
SELECT
  '1. UTILISATEURS AUTH' as section,
  '' as separator;

SELECT
  id as auth_user_id,
  email,
  created_at,
  last_sign_in_at,
  CASE
    WHEN email = 'admin@test.com' THEN '← VOUS'
    ELSE ''
  END as note
FROM auth.users
ORDER BY created_at;

-- 2. Vérifier les utilisateurs App
SELECT
  '2. UTILISATEURS APP' as section,
  '' as separator;

SELECT
  COUNT(*) as nombre_utilisateurs_app,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ Table vide - FirstAdminSetup DEVRAIT s''afficher'
    WHEN COUNT(*) = 1 THEN '⚠ 1 utilisateur - FirstAdminSetup ne s''affichera PAS'
    ELSE '⚠ ' || COUNT(*) || ' utilisateurs - FirstAdminSetup ne s''affichera PAS'
  END as status
FROM app_utilisateur;

-- Liste des utilisateurs app
SELECT
  id as user_id,
  auth_user_id,
  email,
  prenom,
  nom,
  actif,
  created_at
FROM app_utilisateur
ORDER BY created_at;

-- 3. Vérifier les permissions
SELECT
  '3. PERMISSIONS' as section,
  '' as separator;

SELECT
  COUNT(*) as nombre_total_permissions,
  COUNT(DISTINCT utilisateur_id) as utilisateurs_avec_permissions
FROM utilisateur_permissions
WHERE actif = true;

-- Permissions par utilisateur
SELECT
  u.email,
  u.prenom,
  u.nom,
  COUNT(p.id) as nombre_permissions,
  array_agg(p.section_id ORDER BY p.section_id) as permissions
FROM app_utilisateur u
LEFT JOIN utilisateur_permissions p ON p.utilisateur_id = u.id AND p.actif = true
GROUP BY u.id, u.email, u.prenom, u.nom
ORDER BY u.created_at;

-- 4. Vérifier les politiques RLS
SELECT
  '4. POLITIQUES RLS' as section,
  '' as separator;

SELECT
  tablename as table_name,
  policyname as policy_name,
  cmd as operation,
  roles as pour_roles,
  CASE
    WHEN cmd = 'SELECT' THEN 'Lecture'
    WHEN cmd = 'INSERT' THEN 'Création'
    WHEN cmd = 'UPDATE' THEN 'Modification'
    WHEN cmd = 'DELETE' THEN 'Suppression'
    WHEN cmd = 'ALL' THEN 'Toutes opérations'
    ELSE cmd
  END as type
FROM pg_policies
WHERE tablename IN ('app_utilisateur', 'utilisateur_permissions')
ORDER BY tablename, cmd;

-- 5. Vérifier l'état de RLS
SELECT
  '5. ÉTAT DE ROW LEVEL SECURITY' as section,
  '' as separator;

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_actif,
  CASE
    WHEN rowsecurity THEN '✓ RLS activé'
    ELSE '✗ RLS désactivé'
  END as status
FROM pg_tables
WHERE tablename IN ('app_utilisateur', 'utilisateur_permissions');

-- 6. Vérifier si votre compte existe
SELECT
  '6. VOTRE COMPTE (admin@test.com)' as section,
  '' as separator;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM auth.users WHERE email = 'admin@test.com'
    ) THEN '✓ Compte Auth existe'
    ELSE '✗ Compte Auth n''existe pas'
  END as auth_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM app_utilisateur WHERE email = 'admin@test.com'
    ) THEN '⚠ Compte App existe (FirstAdminSetup ne s''affichera PAS)'
    ELSE '✓ Compte App n''existe pas (FirstAdminSetup DEVRAIT s''afficher)'
  END as app_status;

-- Détails de votre compte si il existe
SELECT
  'Détails de votre compte:' as info,
  u.id,
  u.auth_user_id,
  u.email,
  u.prenom,
  u.nom,
  u.actif,
  COUNT(p.id) as nombre_permissions
FROM app_utilisateur u
LEFT JOIN utilisateur_permissions p ON p.utilisateur_id = u.id AND p.actif = true
WHERE u.email = 'admin@test.com'
GROUP BY u.id, u.auth_user_id, u.email, u.prenom, u.nom, u.actif;

-- =====================================================
-- CONCLUSION ET RECOMMANDATIONS
-- =====================================================
DO $$
DECLARE
  v_count_users integer;
  v_has_admin_account boolean;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONCLUSION';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO v_count_users FROM app_utilisateur;

  SELECT EXISTS (
    SELECT 1 FROM app_utilisateur WHERE email = 'admin@test.com'
  ) INTO v_has_admin_account;

  RAISE NOTICE '';
  RAISE NOTICE 'Nombre d''utilisateurs dans app_utilisateur: %', v_count_users;
  RAISE NOTICE 'Votre compte (admin@test.com) existe dans app_utilisateur: %',
    CASE WHEN v_has_admin_account THEN 'OUI' ELSE 'NON' END;
  RAISE NOTICE '';

  IF v_count_users = 0 THEN
    RAISE NOTICE '✓ SITUATION NORMALE:';
    RAISE NOTICE '  - La table app_utilisateur est vide';
    RAISE NOTICE '  - FirstAdminSetup DEVRAIT s''afficher';
    RAISE NOTICE '';
    RAISE NOTICE 'Si FirstAdminSetup ne s''affiche pas:';
    RAISE NOTICE '  1. Videz le cache du navigateur (Ctrl+Shift+R)';
    RAISE NOTICE '  2. Ouvrez la console navigateur (F12) et cherchez des erreurs';
    RAISE NOTICE '  3. Déconnectez-vous et reconnectez-vous';
    RAISE NOTICE '  4. Si toujours rien, utilisez: CREATE-ADMIN-DIRECTLY.sql';

  ELSIF v_has_admin_account THEN
    RAISE NOTICE '⚠ PROBLÈME IDENTIFIÉ:';
    RAISE NOTICE '  - Votre compte existe déjà dans app_utilisateur';
    RAISE NOTICE '  - FirstAdminSetup ne s''affichera JAMAIS';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUTION:';
    RAISE NOTICE '  Option 1 - Vérifier vos permissions actuelles:';
    RAISE NOTICE '    → Rechargez la page et vérifiez si vous avez accès';
    RAISE NOTICE '';
    RAISE NOTICE '  Option 2 - Supprimer votre compte et recommencer:';
    RAISE NOTICE '    → Exécutez: FIX-ADMIN-SETUP-COMPLETE.sql';
    RAISE NOTICE '';
    RAISE NOTICE '  Option 3 - Ajouter les permissions manquantes:';
    RAISE NOTICE '    → Voir ci-dessous le script de correction';

  ELSE
    RAISE NOTICE '⚠ SITUATION ANORMALE:';
    RAISE NOTICE '  - La table app_utilisateur contient % utilisateurs', v_count_users;
    RAISE NOTICE '  - Mais votre compte (admin@test.com) n''existe pas';
    RAISE NOTICE '  - FirstAdminSetup ne s''affichera PAS car la table n''est pas vide';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUTIONS:';
    RAISE NOTICE '  Option 1 - Supprimer tous les utilisateurs et recommencer:';
    RAISE NOTICE '    → Exécutez: FIX-ADMIN-SETUP-COMPLETE.sql';
    RAISE NOTICE '';
    RAISE NOTICE '  Option 2 - Créer directement votre compte:';
    RAISE NOTICE '    → Exécutez: CREATE-ADMIN-DIRECTLY.sql';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Script de correction si votre compte existe mais n'a pas les permissions
DO $$
DECLARE
  v_user_id uuid;
  v_perm_count integer;
BEGIN
  -- Vérifier si votre compte existe
  SELECT id INTO v_user_id
  FROM app_utilisateur
  WHERE email = 'admin@test.com';

  IF v_user_id IS NOT NULL THEN
    -- Compter les permissions
    SELECT COUNT(*) INTO v_perm_count
    FROM utilisateur_permissions
    WHERE utilisateur_id = v_user_id AND actif = true;

    IF v_perm_count < 19 THEN
      RAISE NOTICE '';
      RAISE NOTICE '========================================';
      RAISE NOTICE 'CORRECTION DES PERMISSIONS';
      RAISE NOTICE '========================================';
      RAISE NOTICE '';
      RAISE NOTICE 'Votre compte a seulement % permissions sur 19', v_perm_count;
      RAISE NOTICE 'Correction en cours...';

      -- Supprimer les anciennes permissions
      DELETE FROM utilisateur_permissions WHERE utilisateur_id = v_user_id;

      -- Ajouter toutes les permissions
      INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
      VALUES
        (v_user_id, 'rh/candidats', true),
        (v_user_id, 'rh/salaries', true),
        (v_user_id, 'rh/contrats', true),
        (v_user_id, 'rh/courriers', true),
        (v_user_id, 'rh/alertes', true),
        (v_user_id, 'rh/notifications', true),
        (v_user_id, 'rh/incidents', true),
        (v_user_id, 'rh/incidents-historique', true),
        (v_user_id, 'rh/vivier', true),
        (v_user_id, 'rh/demandes', true),
        (v_user_id, 'parc/vehicules', true),
        (v_user_id, 'parc/ct-assurance', true),
        (v_user_id, 'parc/maintenance', true),
        (v_user_id, 'admin/sites', true),
        (v_user_id, 'admin/secteurs', true),
        (v_user_id, 'admin/postes', true),
        (v_user_id, 'admin/modeles', true),
        (v_user_id, 'admin/modeles-contrats', true),
        (v_user_id, 'admin/utilisateurs', true);

      RAISE NOTICE '✓ Permissions corrigées: 19/19';
      RAISE NOTICE '';
      RAISE NOTICE 'Rechargez la page (Ctrl+Shift+R) et vous devriez avoir accès !';
      RAISE NOTICE '';
    END IF;
  END IF;
END $$;
