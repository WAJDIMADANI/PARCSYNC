/*
  # Attribution des permissions complètes pour wajdi@mad-impact.com

  Ce script ajoute toutes les permissions nécessaires pour accéder à toutes les sections
  de l'application pour l'utilisateur wajdi@mad-impact.com

  INSTRUCTIONS:
  1. Ouvrir Supabase Dashboard > SQL Editor
  2. Copier/coller ce script
  3. Cliquer sur "Run"
  4. Vider le cache du navigateur (Ctrl+Shift+R)
  5. Rafraichir l'application
*/

-- =====================================================
-- ÉTAPE 1: Vérification de l'utilisateur
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'wajdi@mad-impact.com';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION DE L''UTILISATEUR';
  RAISE NOTICE '========================================';

  -- Récupérer l'ID utilisateur
  SELECT id INTO v_user_id
  FROM app_utilisateur
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur % non trouvé dans app_utilisateur', v_email;
  END IF;

  RAISE NOTICE 'Utilisateur trouvé: %', v_email;
  RAISE NOTICE 'ID utilisateur: %', v_user_id;

END $$;

-- =====================================================
-- ÉTAPE 2: Suppression des permissions existantes
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NETTOYAGE DES PERMISSIONS EXISTANTES';
  RAISE NOTICE '========================================';

  SELECT id INTO v_user_id
  FROM app_utilisateur
  WHERE email = 'wajdi@mad-impact.com';

  DELETE FROM utilisateur_permissions
  WHERE utilisateur_id = v_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Permissions supprimées: %', v_deleted_count;

END $$;

-- =====================================================
-- ÉTAPE 3: Insertion des 19 permissions complètes
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AJOUT DES PERMISSIONS';
  RAISE NOTICE '========================================';

  SELECT id INTO v_user_id
  FROM app_utilisateur
  WHERE email = 'wajdi@mad-impact.com';

  -- Insertion des 19 permissions
  INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
  VALUES
    -- Permissions RH (10)
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

    -- Permissions Parc (3)
    (v_user_id, 'parc/vehicules', true),
    (v_user_id, 'parc/ct-assurance', true),
    (v_user_id, 'parc/maintenance', true),

    -- Permissions Admin (6)
    (v_user_id, 'admin/sites', true),
    (v_user_id, 'admin/secteurs', true),
    (v_user_id, 'admin/postes', true),
    (v_user_id, 'admin/modeles', true),
    (v_user_id, 'admin/modeles-contrats', true),
    (v_user_id, 'admin/utilisateurs', true);

  RAISE NOTICE '✓ 19 permissions ajoutées avec succès';

END $$;

-- =====================================================
-- ÉTAPE 4: Vérification finale
-- =====================================================

SELECT
  '=== VÉRIFICATION DES PERMISSIONS ===' as titre;

-- Vue d'ensemble
SELECT
  u.email,
  u.nom,
  u.prenom,
  COUNT(p.id) as nombre_permissions,
  CASE
    WHEN COUNT(p.id) = 19 THEN '✓ TOUTES LES PERMISSIONS (ADMIN COMPLET)'
    WHEN COUNT(p.id) > 0 THEN '⚠ Permissions partielles'
    ELSE '✗ Aucune permission'
  END as status
FROM app_utilisateur u
LEFT JOIN utilisateur_permissions p ON p.utilisateur_id = u.id AND p.actif = true
WHERE u.email = 'wajdi@mad-impact.com'
GROUP BY u.id, u.email, u.nom, u.prenom;

-- Liste détaillée des permissions par catégorie
SELECT
  '=== DÉTAIL DES PERMISSIONS ===' as titre;

SELECT
  CASE
    WHEN up.section_id LIKE 'rh/%' THEN 'RH'
    WHEN up.section_id LIKE 'parc/%' THEN 'Parc'
    WHEN up.section_id LIKE 'admin/%' THEN 'Administration'
    ELSE 'Autre'
  END as categorie,
  up.section_id as permission,
  up.actif,
  up.created_at
FROM utilisateur_permissions up
JOIN app_utilisateur u ON u.id = up.utilisateur_id
WHERE u.email = 'wajdi@mad-impact.com'
ORDER BY categorie, up.section_id;

-- Test de la vue utilisateur_avec_permissions
SELECT
  '=== TEST VUE utilisateur_avec_permissions ===' as titre;

SELECT
  email,
  nom,
  prenom,
  actif,
  array_length(permissions, 1) as nombre_permissions_vue,
  permissions
FROM utilisateur_avec_permissions
WHERE email = 'wajdi@mad-impact.com';

-- =====================================================
-- INSTRUCTIONS FINALES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 PERMISSIONS CONFIGURÉES AVEC SUCCÈS !';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'PROCHAINES ÉTAPES:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Videz le cache du navigateur:';
  RAISE NOTICE '   - Appuyez sur Ctrl + Shift + R (Windows/Linux)';
  RAISE NOTICE '   - Appuyez sur Cmd + Shift + R (Mac)';
  RAISE NOTICE '';
  RAISE NOTICE '2. Rafraichissez la page de l''application';
  RAISE NOTICE '';
  RAISE NOTICE '3. Vous devriez maintenant voir:';
  RAISE NOTICE '   ✓ Toutes les sections RH dans la sidebar';
  RAISE NOTICE '   ✓ Toutes les sections Parc dans la sidebar';
  RAISE NOTICE '   ✓ Toutes les sections Administration dans la sidebar';
  RAISE NOTICE '';
  RAISE NOTICE '4. Vous avez maintenant un accès COMPLET:';
  RAISE NOTICE '   - Gérer les candidats et salariés';
  RAISE NOTICE '   - Gérer les contrats et courriers';
  RAISE NOTICE '   - Gérer les véhicules';
  RAISE NOTICE '   - Créer et gérer les utilisateurs';
  RAISE NOTICE '   - Attribuer des permissions à d''autres utilisateurs';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
