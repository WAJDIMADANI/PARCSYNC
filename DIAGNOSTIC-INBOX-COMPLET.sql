-- DIAGNOSTIC COMPLET DU SYSTÈME INBOX
-- Exécutez ce script pour diagnostiquer tous les problèmes

-- ===============================================
-- 1. VÉRIFIER LA TABLE TACHES
-- ===============================================
SELECT 'TABLE TACHES' as diagnostic;

-- Vérifier que la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'taches'
) as table_taches_existe;

-- ===============================================
-- 2. VÉRIFIER LES POLITIQUES RLS SUR TACHES
-- ===============================================
SELECT 'POLITIQUES RLS TACHES' as diagnostic;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'taches'
ORDER BY policyname;

-- ===============================================
-- 3. VÉRIFIER LA TABLE TACHES_MESSAGES
-- ===============================================
SELECT 'TABLE TACHES_MESSAGES' as diagnostic;

-- Vérifier que la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'taches_messages'
) as table_taches_messages_existe;

-- Si la table n'existe pas, c'est le problème !
-- Exécutez le fichier: create-taches-messages-system.sql

-- ===============================================
-- 4. VÉRIFIER LES POLITIQUES RLS SUR TACHES_MESSAGES
-- ===============================================
SELECT 'POLITIQUES RLS TACHES_MESSAGES' as diagnostic;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'taches_messages'
ORDER BY policyname;

-- ===============================================
-- 5. LISTER TOUTES LES TÂCHES
-- ===============================================
SELECT 'TOUTES LES TÂCHES' as diagnostic;

SELECT
  t.id,
  t.titre,
  t.statut,
  t.priorite,
  exp.email as expediteur_email,
  exp.nom as expediteur_nom,
  ass.email as assignee_email,
  ass.nom as assignee_nom,
  t.created_at
FROM taches t
LEFT JOIN app_utilisateur exp ON t.expediteur_id = exp.id
LEFT JOIN app_utilisateur ass ON t.assignee_id = ass.id
ORDER BY t.created_at DESC
LIMIT 10;

-- ===============================================
-- 6. VÉRIFIER LA LIAISON AUTH <-> APP_UTILISATEUR
-- ===============================================
SELECT 'LIAISON AUTH USER -> APP UTILISATEUR' as diagnostic;

SELECT
  au.id as app_user_id,
  au.email,
  au.nom,
  au.prenom,
  au.auth_user_id,
  CASE
    WHEN au.auth_user_id IS NULL THEN '❌ PAS DE AUTH_USER_ID'
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = au.auth_user_id) THEN '✅ OK'
    ELSE '❌ AUTH_USER_ID INVALIDE'
  END as statut
FROM app_utilisateur au
ORDER BY au.email;

-- ===============================================
-- 7. COMPTER LES MESSAGES PAR TÂCHE
-- ===============================================
SELECT 'MESSAGES PAR TÂCHE' as diagnostic;

SELECT
  t.titre,
  t.statut,
  COUNT(tm.id) as nombre_messages
FROM taches t
LEFT JOIN taches_messages tm ON t.id = tm.tache_id
GROUP BY t.id, t.titre, t.statut
ORDER BY t.created_at DESC;

-- ===============================================
-- RÉSUMÉ DU DIAGNOSTIC
-- ===============================================
SELECT 'RÉSUMÉ' as diagnostic;

SELECT
  (SELECT COUNT(*) FROM taches) as nombre_taches,
  (SELECT COUNT(*) FROM taches_messages) as nombre_messages,
  (SELECT COUNT(*) FROM app_utilisateur WHERE auth_user_id IS NOT NULL) as utilisateurs_avec_auth,
  (SELECT COUNT(*) FROM app_utilisateur WHERE auth_user_id IS NULL) as utilisateurs_sans_auth;
