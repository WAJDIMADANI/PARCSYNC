/*
  Diagnostic complet - Problème historique_statut_vehicule
*/

-- ========================================
-- 1. Vérifier l'utilisateur problématique
-- ========================================

SELECT '=== 1. Utilisateur problématique ===' as etape;

-- Dans auth.users ?
SELECT
  'auth.users' as table_source,
  id,
  email,
  created_at,
  '✓ Existe' as statut
FROM auth.users
WHERE id = '4f087575-4771-4469-a876-7ae6199af546';

-- Dans app_utilisateur ?
SELECT
  'app_utilisateur' as table_source,
  id,
  auth_user_id,
  email,
  nom,
  prenom,
  CASE
    WHEN auth_user_id = '4f087575-4771-4469-a876-7ae6199af546' THEN '✓ Existe avec bon auth_user_id'
    WHEN id = '4f087575-4771-4469-a876-7ae6199af546' THEN '✓ Existe avec ID direct'
    ELSE '? Autre cas'
  END as statut
FROM app_utilisateur
WHERE auth_user_id = '4f087575-4771-4469-a876-7ae6199af546'
   OR id = '4f087575-4771-4469-a876-7ae6199af546';


-- ========================================
-- 2. Vérifier TOUS les utilisateurs non synchronisés
-- ========================================

SELECT '=== 2. Utilisateurs non synchronisés ===' as etape;

SELECT
  au.id as auth_user_id,
  au.email,
  au.created_at,
  CASE
    WHEN app.id IS NULL THEN '✗ MANQUANT dans app_utilisateur'
    ELSE '✓ Synchronisé'
  END as statut
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.auth_user_id = au.id
WHERE app.id IS NULL;


-- ========================================
-- 3. Vérifier la contrainte foreign key
-- ========================================

SELECT '=== 3. Contrainte Foreign Key ===' as etape;

SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'historique_statut_vehicule_modifie_par_fkey';


-- ========================================
-- 4. Vérifier les triggers sur vehicule
-- ========================================

SELECT '=== 4. Triggers sur table vehicule ===' as etape;

SELECT
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'vehicule'
ORDER BY trigger_name;


-- ========================================
-- 5. Vérifier la fonction get_app_user_id
-- ========================================

SELECT '=== 5. Fonction get_app_user_id ===' as etape;

SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_app_user_id';


-- ========================================
-- 6. Compter les entrées dans historique_statut_vehicule
-- ========================================

SELECT '=== 6. Historique statut véhicule ===' as etape;

SELECT
  COUNT(*) as total_entries,
  COUNT(DISTINCT vehicule_id) as unique_vehicles,
  COUNT(DISTINCT modifie_par) as unique_modifiers,
  MIN(date_changement) as first_change,
  MAX(date_changement) as last_change
FROM historique_statut_vehicule;


-- ========================================
-- 7. Vérifier les politiques RLS
-- ========================================

SELECT '=== 7. Politiques RLS historique_statut_vehicule ===' as etape;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'historique_statut_vehicule'
ORDER BY policyname;


-- ========================================
-- 8. Test de la fonction get_app_user_id (pour l'utilisateur actuel)
-- ========================================

SELECT '=== 8. Test fonction pour utilisateur actuel ===' as etape;

SELECT
  auth.uid() as current_auth_user_id,
  get_app_user_id() as app_user_id,
  CASE
    WHEN get_app_user_id() IS NOT NULL THEN '✓ Fonctionne'
    ELSE '✗ Retourne NULL'
  END as statut;


-- ========================================
-- 9. Dernières modifications de véhicules
-- ========================================

SELECT '=== 9. Dernières modifications véhicules ===' as etape;

SELECT
  v.immatriculation,
  v.statut,
  v.updated_at,
  hsv.date_changement as last_status_change,
  hsv.modifie_par,
  app.nom as modified_by_name,
  app.email as modified_by_email
FROM vehicule v
LEFT JOIN LATERAL (
  SELECT *
  FROM historique_statut_vehicule
  WHERE vehicule_id = v.id
  ORDER BY date_changement DESC
  LIMIT 1
) hsv ON true
LEFT JOIN app_utilisateur app ON app.id = hsv.modifie_par
ORDER BY v.updated_at DESC
LIMIT 10;


-- ========================================
-- RÉSUMÉ
-- ========================================

SELECT '=== RÉSUMÉ ===' as etape;

SELECT
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM app_utilisateur) as total_app_users,
  (SELECT COUNT(*) FROM auth.users au
   WHERE NOT EXISTS (
     SELECT 1 FROM app_utilisateur app WHERE app.auth_user_id = au.id
   )) as users_not_synced,
  (SELECT COUNT(*) FROM historique_statut_vehicule) as total_history_entries,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_app_user_id') THEN '✓'
    ELSE '✗'
  END as has_helper_function,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'track_vehicule_statut_changes'
    ) THEN '✓'
    ELSE '✗'
  END as has_trigger;
