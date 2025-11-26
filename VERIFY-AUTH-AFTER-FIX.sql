/*
  ============================================================================
  VÉRIFICATION POST-CORRECTION
  ============================================================================

  Exécutez ce script APRÈS avoir exécuté FIX-AUTH-SYNC-FINAL.sql
  pour vérifier que tout fonctionne correctement.

  ============================================================================
*/

-- =====================================================
-- TEST 1: Vérifier la synchronisation
-- =====================================================

SELECT '====== TEST 1: SYNCHRONISATION ======' as test;

SELECT
  au.email as "Email",
  au.nom as "Nom",
  au.prenom as "Prénom",
  au.actif as "Actif",
  CASE
    WHEN au.auth_user_id = authusers.id THEN '✓ OK'
    WHEN authusers.id IS NULL THEN '✗ Pas dans auth.users'
    ELSE '✗ UUID différent'
  END as "Statut Sync",
  au.auth_user_id::text as "UUID dans app_utilisateur",
  authusers.id::text as "UUID dans auth.users"
FROM app_utilisateur au
LEFT JOIN auth.users authusers ON authusers.email = au.email
ORDER BY au.created_at;

-- =====================================================
-- TEST 2: Vérifier le trigger
-- =====================================================

SELECT '====== TEST 2: TRIGGER ======' as test;

SELECT
  trigger_name as "Nom du Trigger",
  event_manipulation as "Événement",
  event_object_table as "Table",
  action_statement as "Action"
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Si pas de résultat, le trigger n'existe pas!

-- =====================================================
-- TEST 3: Vérifier les RLS policies
-- =====================================================

SELECT '====== TEST 3: RLS POLICIES ======' as test;

SELECT
  polname as "Nom de la Policy",
  polcmd as "Commande",
  CASE polpermissive
    WHEN true THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as "Type",
  roles.rolname as "Rôle"
FROM pg_policy
JOIN pg_class ON pg_policy.polrelid = pg_class.oid
JOIN pg_roles roles ON pg_policy.polroles @> ARRAY[roles.oid]
WHERE pg_class.relname = 'app_utilisateur'
ORDER BY polname;

-- =====================================================
-- TEST 4: Compter les utilisateurs
-- =====================================================

SELECT '====== TEST 4: STATISTIQUES ======' as test;

SELECT
  (SELECT COUNT(*) FROM auth.users) as "Users dans auth.users",
  (SELECT COUNT(*) FROM app_utilisateur) as "Users dans app_utilisateur",
  (SELECT COUNT(*) FROM app_utilisateur WHERE auth_user_id IN (SELECT id FROM auth.users)) as "Users synchronisés";

-- =====================================================
-- TEST 5: Vérifier les permissions
-- =====================================================

SELECT '====== TEST 5: PERMISSIONS ======' as test;

SELECT
  au.email as "Email",
  au.nom as "Nom",
  COUNT(DISTINCT up.section_id) as "Nb Permissions",
  array_agg(DISTINCT up.section_id ORDER BY up.section_id) FILTER (WHERE up.actif = true) as "Sections Autorisées"
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON up.utilisateur_id = au.id
GROUP BY au.id, au.email, au.nom
ORDER BY au.created_at;

-- =====================================================
-- TEST 6: Simuler une connexion
-- =====================================================

SELECT '====== TEST 6: SIMULATION CONNEXION ======' as test;

-- Pour chaque utilisateur, simuler auth.uid()
SELECT
  authuser.email as "Email de Test",
  authuser.id::text as "auth.uid() simulé",
  CASE
    WHEN EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE auth_user_id = authuser.id
    ) THEN '✓ Trouvé dans app_utilisateur'
    ELSE '✗ PAS TROUVÉ'
  END as "Résultat Lookup",
  (
    SELECT COUNT(*)
    FROM utilisateur_permissions up
    JOIN app_utilisateur au ON au.id = up.utilisateur_id
    WHERE au.auth_user_id = authuser.id
    AND up.actif = true
  ) as "Nb Permissions Actives"
FROM auth.users authuser
ORDER BY authuser.created_at;

-- =====================================================
-- TEST 7: Vérifier votre session actuelle
-- =====================================================

SELECT '====== TEST 7: MA SESSION ACTUELLE ======' as test;

SELECT
  CASE
    WHEN auth.uid() IS NULL THEN '⚠️ PAS CONNECTÉ (normal dans SQL Editor)'
    ELSE '✓ Connecté'
  END as "Statut",
  auth.uid()::text as "Mon UUID",
  (SELECT email FROM auth.users WHERE id = auth.uid()) as "Mon Email",
  (
    SELECT json_build_object(
      'nom', au.nom,
      'prenom', au.prenom,
      'actif', au.actif,
      'permissions', (
        SELECT COUNT(*) FROM utilisateur_permissions
        WHERE utilisateur_id = au.id AND actif = true
      )
    )
    FROM app_utilisateur au
    WHERE au.auth_user_id = auth.uid()
  ) as "Mes Infos";

-- Note: auth.uid() sera NULL si vous exécutez depuis le SQL Editor
-- car vous êtes connecté en tant qu'admin, pas en tant qu'utilisateur app

-- =====================================================
-- RÉSUMÉ
-- =====================================================

SELECT '====== RÉSUMÉ ======' as test;

DO $$
DECLARE
  v_auth_count INTEGER;
  v_app_count INTEGER;
  v_synced_count INTEGER;
  v_trigger_exists BOOLEAN;
  v_policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  SELECT COUNT(*) INTO v_app_count FROM app_utilisateur;
  SELECT COUNT(*) INTO v_synced_count
    FROM app_utilisateur
    WHERE auth_user_id IN (SELECT id FROM auth.users);

  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
  ) INTO v_trigger_exists;

  SELECT COUNT(*) INTO v_policies_count
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = 'app_utilisateur';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA VÉRIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Utilisateurs dans auth.users:      %', v_auth_count;
  RAISE NOTICE 'Utilisateurs dans app_utilisateur: %', v_app_count;
  RAISE NOTICE 'Utilisateurs synchronisés:         %', v_synced_count;
  RAISE NOTICE '';

  IF v_synced_count = v_auth_count AND v_auth_count = v_app_count THEN
    RAISE NOTICE '✓ SYNCHRONISATION: PARFAITE';
  ELSIF v_synced_count = v_app_count THEN
    RAISE NOTICE '✓ SYNCHRONISATION: OK (% users)', v_synced_count;
  ELSE
    RAISE NOTICE '✗ SYNCHRONISATION: PROBLÈME';
    RAISE NOTICE '  → % users non synchronisés', v_app_count - v_synced_count;
  END IF;

  RAISE NOTICE '';

  IF v_trigger_exists THEN
    RAISE NOTICE '✓ TRIGGER: Installé';
  ELSE
    RAISE NOTICE '✗ TRIGGER: Manquant!';
  END IF;

  RAISE NOTICE '';

  IF v_policies_count >= 2 THEN
    RAISE NOTICE '✓ RLS POLICIES: % policies actives', v_policies_count;
  ELSE
    RAISE NOTICE '⚠ RLS POLICIES: Seulement % policies', v_policies_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';

  IF v_synced_count = v_app_count AND v_trigger_exists AND v_policies_count >= 2 THEN
    RAISE NOTICE '✓✓✓ TOUT EST OK - PRÊT À L''UTILISATION';
  ELSE
    RAISE NOTICE '⚠ VÉRIFIEZ LES DÉTAILS CI-DESSUS';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END;
$$;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================

SELECT '====== PROCHAINES ÉTAPES ======' as test;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Si tous les tests sont OK:';
  RAISE NOTICE '  1. Ouvrez votre application React';
  RAISE NOTICE '  2. Connectez-vous avec: admin@test.com / Admin123!';
  RAISE NOTICE '  3. Vérifiez que vous voyez le tableau de bord';
  RAISE NOTICE '';
  RAISE NOTICE 'Si un test échoue:';
  RAISE NOTICE '  1. Relisez le fichier GUIDE-FIX-AUTH-SYNC.md';
  RAISE NOTICE '  2. Exécutez à nouveau FIX-AUTH-SYNC-FINAL.sql';
  RAISE NOTICE '  3. Ré-exécutez ce script de vérification';
  RAISE NOTICE '';
END;
$$;
