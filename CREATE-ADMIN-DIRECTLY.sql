/*
  # Création directe d'un compte administrateur

  Ce script crée directement votre compte avec toutes les permissions
  sans passer par l'interface FirstAdminSetup.

  Utilisez ce script si FirstAdminSetup ne s'affiche toujours pas
  après avoir exécuté FIX-ADMIN-SETUP-COMPLETE.sql

  INSTRUCTIONS:
  1. Remplacez 'admin@test.com' par votre email si différent
  2. Remplacez 'Admin' et 'Système' par vos vrais prénom et nom
  3. Exécutez ce script dans Supabase SQL Editor
  4. Videz le cache (Ctrl+Shift+R)
  5. Rechargez la page
*/

-- =====================================================
-- ÉTAPE 1: RÉCUPÉRER VOTRE AUTH USER ID
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉCUPÉRATION DE VOTRE ID AUTH';
  RAISE NOTICE '========================================';
END $$;

-- Afficher votre utilisateur Auth
SELECT
  'Votre compte Auth:' as info,
  id as auth_user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'admin@test.com';  -- MODIFIER ICI si votre email est différent

-- Si l'email est différent, décommentez et utilisez ceci:
-- SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- =====================================================
-- ÉTAPE 2: CRÉER VOTRE UTILISATEUR APP
-- =====================================================
DO $$
DECLARE
  v_auth_user_id uuid;
  v_user_id uuid;
  v_email text := 'admin@test.com';  -- MODIFIER ICI
  v_prenom text := 'Admin';           -- MODIFIER ICI
  v_nom text := 'Système';            -- MODIFIER ICI
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRÉATION DE VOTRE COMPTE APP';
  RAISE NOTICE '========================================';

  -- Récupérer l'auth_user_id
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur Auth trouvé avec l''email: %', v_email;
  END IF;

  RAISE NOTICE 'Auth User ID trouvé: %', v_auth_user_id;

  -- Vérifier si l'utilisateur existe déjà
  SELECT id INTO v_user_id
  FROM app_utilisateur
  WHERE auth_user_id = v_auth_user_id;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Utilisateur existe déjà avec ID: %', v_user_id;
    RAISE NOTICE 'Suppression de l''utilisateur existant...';

    DELETE FROM utilisateur_permissions WHERE utilisateur_id = v_user_id;
    DELETE FROM app_utilisateur WHERE id = v_user_id;

    v_user_id := NULL;
  END IF;

  -- Créer l'utilisateur
  INSERT INTO app_utilisateur (auth_user_id, email, nom, prenom, actif)
  VALUES (v_auth_user_id, v_email, v_nom, v_prenom, true)
  RETURNING id INTO v_user_id;

  RAISE NOTICE 'Utilisateur créé: % % (%) avec ID: %', v_prenom, v_nom, v_email, v_user_id;

  -- =====================================================
  -- ÉTAPE 3: ATTRIBUER TOUTES LES PERMISSIONS
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ATTRIBUTION DES PERMISSIONS';
  RAISE NOTICE '========================================';

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

  RAISE NOTICE '✓ 19 permissions attribuées avec succès';

  -- =====================================================
  -- ÉTAPE 4: VÉRIFICATION
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION';
  RAISE NOTICE '========================================';

END $$;

-- Afficher le résultat final
SELECT
  'VOTRE COMPTE ADMIN:' as titre,
  '' as separator;

SELECT
  u.prenom,
  u.nom,
  u.email,
  u.actif,
  COUNT(p.id) as nombre_permissions,
  CASE
    WHEN COUNT(p.id) = 19 THEN '✓ Toutes les permissions (ADMIN COMPLET)'
    WHEN COUNT(p.id) > 0 THEN '⚠ Permissions partielles'
    ELSE '✗ Aucune permission'
  END as status
FROM app_utilisateur u
LEFT JOIN utilisateur_permissions p ON p.utilisateur_id = u.id AND p.actif = true
WHERE u.email = 'admin@test.com'  -- MODIFIER ICI si email différent
GROUP BY u.id, u.prenom, u.nom, u.email, u.actif;

-- Liste détaillée des permissions
SELECT
  'LISTE DES PERMISSIONS:' as titre,
  '' as separator;

SELECT
  up.section_id as permission,
  up.actif,
  CASE
    WHEN up.section_id LIKE 'rh/%' THEN 'RH'
    WHEN up.section_id LIKE 'parc/%' THEN 'Parc'
    WHEN up.section_id LIKE 'admin/%' THEN 'Administration'
    ELSE 'Autre'
  END as categorie
FROM utilisateur_permissions up
JOIN app_utilisateur u ON u.id = up.utilisateur_id
WHERE u.email = 'admin@test.com'  -- MODIFIER ICI si email différent
ORDER BY categorie, up.section_id;

-- =====================================================
-- INSTRUCTIONS FINALES
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 COMPTE CRÉÉ AVEC SUCCÈS !';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'PROCHAINES ÉTAPES:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Videz le cache du navigateur:';
  RAISE NOTICE '   - Ctrl + Shift + R (Windows/Linux)';
  RAISE NOTICE '   - Cmd + Shift + R (Mac)';
  RAISE NOTICE '';
  RAISE NOTICE '2. Rechargez la page de l''application';
  RAISE NOTICE '';
  RAISE NOTICE '3. Vous devriez maintenant avoir accès à:';
  RAISE NOTICE '   ✓ Toutes les pages RH';
  RAISE NOTICE '   ✓ Toutes les pages Parc';
  RAISE NOTICE '   ✓ Toutes les pages Administration';
  RAISE NOTICE '';
  RAISE NOTICE '4. Vous pouvez maintenant:';
  RAISE NOTICE '   - Accéder à "Gestion des Utilisateurs"';
  RAISE NOTICE '   - Créer d''autres utilisateurs';
  RAISE NOTICE '   - Gérer leurs permissions';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
