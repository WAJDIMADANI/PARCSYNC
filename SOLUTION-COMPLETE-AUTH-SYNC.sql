/*
  # Solution complète: Synchroniser auth.users avec app_utilisateur et corriger les politiques RLS

  Problème: 
  - auth.uid() retourne l'ID de auth.users
  - Les tables référencent app_utilisateur(id) qui est différent
  - Les politiques RLS comparent auth.uid() avec app_utilisateur.id → toujours false

  Solution:
  1. Synchroniser auth_user_id dans app_utilisateur
  2. Corriger les politiques RLS pour utiliser auth_user_id
*/

-- ========================================
-- ÉTAPE 1: Synchroniser auth_user_id
-- ========================================

UPDATE app_utilisateur
SET auth_user_id = au.id
FROM auth.users au
WHERE app_utilisateur.email = au.email;

-- Vérifier la synchronisation
SELECT
  au.email,
  au.id as auth_id,
  app.auth_user_id,
  CASE
    WHEN app.auth_user_id = au.id THEN '✓ Synchronisé'
    ELSE '✗ Problème'
  END as statut
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.email = au.email;


-- ========================================
-- ÉTAPE 2: Corriger les politiques RLS de la table taches
-- ========================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view tasks assigned to them or sent by them" ON taches;
DROP POLICY IF EXISTS "Users can create tasks" ON taches;
DROP POLICY IF EXISTS "Assignee can update their tasks" ON taches;
DROP POLICY IF EXISTS "Users can delete tasks they are involved in" ON taches;

-- Créer les nouvelles politiques avec auth_user_id
CREATE POLICY "Users can view tasks assigned to them or sent by them"
  ON taches FOR SELECT
  TO authenticated
  USING (
    assignee_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
    OR
    expediteur_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create tasks"
  ON taches FOR INSERT
  TO authenticated
  WITH CHECK (
    expediteur_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Assignee can update their tasks"
  ON taches FOR UPDATE
  TO authenticated
  USING (
    assignee_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    assignee_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can delete tasks they are involved in"
  ON taches FOR DELETE
  TO authenticated
  USING (
    assignee_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
    OR
    expediteur_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
  );


-- ========================================
-- ÉTAPE 3: Créer une fonction helper pour obtenir l'ID app_utilisateur
-- ========================================

CREATE OR REPLACE FUNCTION get_app_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$;


-- ========================================
-- ÉTAPE 4: Vérification finale
-- ========================================

-- Test: Vérifier que la fonction fonctionne
SELECT get_app_user_id();

-- Vérifier les politiques
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'taches';
