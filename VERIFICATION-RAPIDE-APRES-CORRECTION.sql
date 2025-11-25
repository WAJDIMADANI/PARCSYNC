/*
  # VÉRIFICATION RAPIDE APRÈS CORRECTION

  Script à exécuter après FIX-RECURSION-POLICIES-FINAL.sql
  pour vérifier que tout fonctionne correctement.

  Durée : ~5 secondes
*/

-- =====================================================
-- 1. ÉTAT DES POLICIES RLS
-- =====================================================

SELECT '🔒 ÉTAT DES POLICIES RLS' as titre;

SELECT
  tablename as "Table",
  COUNT(*) as "Nb Policies",
  CASE
    WHEN COUNT(*) = 0 THEN '⚠️ Aucune policy'
    WHEN COUNT(*) <= 5 THEN '✅ Policies simples'
    ELSE '⚠️ Trop de policies (risque de récursion)'
  END as "Statut"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('app_utilisateur', 'utilisateur_permissions', 'demande_standard')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 2. ÉTAT DE RLS
-- =====================================================

SELECT '🔐 ACTIVATION RLS' as titre;

SELECT
  tablename as "Table",
  CASE
    WHEN rowsecurity THEN '✅ ACTIVÉ'
    ELSE '❌ DÉSACTIVÉ'
  END as "RLS",
  CASE
    WHEN tablename = 'utilisateur_permissions' AND NOT rowsecurity THEN '✅ Correct (désactivé volontairement)'
    WHEN tablename IN ('app_utilisateur', 'demande_standard') AND rowsecurity THEN '✅ Correct'
    ELSE '⚠️ Vérifier la configuration'
  END as "Conformité"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('app_utilisateur', 'utilisateur_permissions', 'demande_standard')
ORDER BY tablename;

-- =====================================================
-- 3. UTILISATEURS EXISTANTS
-- =====================================================

SELECT '👥 UTILISATEURS' as titre;

SELECT
  email as "Email",
  nom as "Nom",
  prenom as "Prénom",
  CASE WHEN actif THEN '✅ Actif' ELSE '❌ Inactif' END as "Statut",
  CASE
    WHEN auth_user_id IS NOT NULL THEN '✅ Lié à auth'
    ELSE '⚠️ Non lié'
  END as "Auth"
FROM app_utilisateur
ORDER BY email;

-- =====================================================
-- 4. PERMISSIONS PAR UTILISATEUR
-- =====================================================

SELECT '🎯 PERMISSIONS' as titre;

SELECT
  au.email as "Email",
  COUNT(up.id) FILTER (WHERE up.actif = true) as "Nb Permissions Actives",
  CASE
    WHEN COUNT(up.id) FILTER (WHERE up.actif = true) >= 19 THEN '✅ Admin complet'
    WHEN COUNT(up.id) FILTER (WHERE up.actif = true) = 1 THEN '✅ Standardiste'
    WHEN COUNT(up.id) FILTER (WHERE up.actif = true) = 0 THEN '⚠️ Aucune permission'
    ELSE '✅ Permissions personnalisées'
  END as "Profil"
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
GROUP BY au.id, au.email
ORDER BY au.email;

-- =====================================================
-- 5. TEST DE LA VUE
-- =====================================================

SELECT '🔍 TEST VUE utilisateur_avec_permissions' as titre;

DO $$
DECLARE
  v_count integer;
  v_error text;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO v_count FROM utilisateur_avec_permissions;
    RAISE NOTICE '✅ Vue accessible : % lignes trouvées', v_count;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    RAISE NOTICE '❌ ERREUR : %', v_error;
  END;
END $$;

-- Afficher le contenu de la vue (si accessible)
SELECT
  email as "Email",
  array_length(permissions, 1) as "Nb Permissions",
  CASE
    WHEN array_length(permissions, 1) IS NULL THEN '⚠️ Aucune'
    WHEN array_length(permissions, 1) >= 19 THEN '✅ Admin complet'
    WHEN array_length(permissions, 1) = 1 THEN '✅ Standardiste'
    ELSE '✅ ' || array_length(permissions, 1)::text || ' permissions'
  END as "Statut"
FROM utilisateur_avec_permissions
ORDER BY email;

-- =====================================================
-- 6. VÉRIFICATION WAJDI ET ADMIN
-- =====================================================

SELECT '🎯 VÉRIFICATION COMPTES SPÉCIFIQUES' as titre;

DO $$
DECLARE
  v_wajdi_count integer;
  v_admin_count integer;
  v_wajdi_auth uuid;
  v_admin_auth uuid;
BEGIN
  -- Vérifier wajdi@mad-impact.com
  SELECT COUNT(*), MAX(auth_user_id)
  INTO v_wajdi_count, v_wajdi_auth
  FROM app_utilisateur
  WHERE email = 'wajdi@mad-impact.com';

  IF v_wajdi_count = 0 THEN
    RAISE NOTICE '❌ wajdi@mad-impact.com : NON TROUVÉ';
  ELSIF v_wajdi_auth IS NULL THEN
    RAISE NOTICE '⚠️ wajdi@mad-impact.com : Trouvé mais non lié à auth.users';
  ELSE
    SELECT COUNT(*) INTO v_wajdi_count
    FROM utilisateur_permissions up
    INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
    WHERE au.email = 'wajdi@mad-impact.com' AND up.actif = true;

    RAISE NOTICE '✅ wajdi@mad-impact.com : % permissions', v_wajdi_count;
  END IF;

  -- Vérifier admin@test.com
  SELECT COUNT(*), MAX(auth_user_id)
  INTO v_admin_count, v_admin_auth
  FROM app_utilisateur
  WHERE email = 'admin@test.com';

  IF v_admin_count = 0 THEN
    RAISE NOTICE '❌ admin@test.com : NON TROUVÉ';
  ELSIF v_admin_auth IS NULL THEN
    RAISE NOTICE '⚠️ admin@test.com : Trouvé mais non lié à auth.users';
  ELSE
    SELECT COUNT(*) INTO v_admin_count
    FROM utilisateur_permissions up
    INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
    WHERE au.email = 'admin@test.com' AND up.actif = true;

    RAISE NOTICE '✅ admin@test.com : % permission(s)', v_admin_count;
  END IF;
END $$;

-- =====================================================
-- 7. RÉSUMÉ FINAL
-- =====================================================

DO $$
DECLARE
  v_policies_app integer;
  v_policies_perms integer;
  v_rls_app boolean;
  v_rls_perms boolean;
  v_nb_users integer;
  v_nb_perms integer;
  v_vue_ok boolean := false;
  v_count integer;
BEGIN
  -- Récupérer les stats
  SELECT COUNT(*) INTO v_policies_app
  FROM pg_policies
  WHERE tablename = 'app_utilisateur' AND schemaname = 'public';

  SELECT COUNT(*) INTO v_policies_perms
  FROM pg_policies
  WHERE tablename = 'utilisateur_permissions' AND schemaname = 'public';

  SELECT rowsecurity INTO v_rls_app
  FROM pg_tables
  WHERE tablename = 'app_utilisateur' AND schemaname = 'public';

  SELECT rowsecurity INTO v_rls_perms
  FROM pg_tables
  WHERE tablename = 'utilisateur_permissions' AND schemaname = 'public';

  SELECT COUNT(*) INTO v_nb_users FROM app_utilisateur;
  SELECT COUNT(*) INTO v_nb_perms FROM utilisateur_permissions WHERE actif = true;

  -- Tester la vue
  BEGIN
    SELECT COUNT(*) INTO v_count FROM utilisateur_avec_permissions;
    v_vue_ok := true;
  EXCEPTION WHEN OTHERS THEN
    v_vue_ok := false;
  END;

  -- Afficher le résumé
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 RÉSUMÉ DE LA VÉRIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Configuration RLS:';
  RAISE NOTICE '  app_utilisateur:';
  RAISE NOTICE '    - RLS: %', CASE WHEN v_rls_app THEN '✅ ACTIVÉ' ELSE '❌ DÉSACTIVÉ' END;
  RAISE NOTICE '    - Policies: % %', v_policies_app, CASE WHEN v_policies_app BETWEEN 3 AND 5 THEN '✅' ELSE '⚠️' END;
  RAISE NOTICE '  utilisateur_permissions:';
  RAISE NOTICE '    - RLS: %', CASE WHEN NOT v_rls_perms THEN '✅ DÉSACTIVÉ (voulu)' ELSE '⚠️ ACTIVÉ' END;
  RAISE NOTICE '    - Policies: % %', v_policies_perms, CASE WHEN v_policies_perms = 0 THEN '✅' ELSE '⚠️' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Données:';
  RAISE NOTICE '  - Utilisateurs: %', v_nb_users;
  RAISE NOTICE '  - Permissions actives: %', v_nb_perms;
  RAISE NOTICE '';
  RAISE NOTICE 'Vue:';
  RAISE NOTICE '  - utilisateur_avec_permissions: %', CASE WHEN v_vue_ok THEN '✅ Accessible' ELSE '❌ Erreur' END;
  RAISE NOTICE '';

  -- Verdict final
  IF v_rls_app AND v_policies_app BETWEEN 3 AND 5
     AND NOT v_rls_perms AND v_policies_perms = 0
     AND v_vue_ok AND v_nb_users >= 1 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 SUCCÈS TOTAL !';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tout fonctionne correctement.';
    RAISE NOTICE 'Vous pouvez maintenant :';
    RAISE NOTICE '  1. Rafraîchir la page de l''application';
    RAISE NOTICE '  2. Aller sur "Gestion des Utilisateurs"';
    RAISE NOTICE '  3. Voir les utilisateurs sans erreur 500';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚠️ PROBLÈMES DÉTECTÉS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Vérifiez les points ci-dessus marqués ⚠️';
    RAISE NOTICE 'Vous devrez peut-être relancer le script de correction.';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- FIN DE LA VÉRIFICATION
-- =====================================================

SELECT
  '✅ Vérification terminée' as "Statut",
  'Consultez les messages ci-dessus' as "Action";
