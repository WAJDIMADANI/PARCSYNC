/*
  # Fix RLS Policy pour UPDATE sur table profil

  ## Problème
    - Erreur 403 lors de la mise à jour de l'adresse ou autres champs du profil
    - Les policies RLS bloquent les opérations UPDATE

  ## Solution
    - Vérifier les policies existantes
    - S'assurer que la policy UPDATE pour authenticated existe
    - Permettre les UPDATE pour tous les utilisateurs authentifiés

  ## Instructions
    1. Ouvrir https://supabase.com/dashboard
    2. Aller dans SQL Editor
    3. Copier-coller ce script
    4. Cliquer sur "Run"
*/

-- ========================================
-- DIAGNOSTIC: Vérifier l'état actuel
-- ========================================

-- 1. Vérifier si RLS est activé sur profil
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profil';

-- 2. Lister toutes les policies existantes sur profil
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'profil'
ORDER BY cmd;

-- ========================================
-- CORRECTION: Recréer les policies UPDATE
-- ========================================

-- Supprimer les anciennes policies qui pourraient bloquer
DROP POLICY IF EXISTS "auth_all" ON profil;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profil;
DROP POLICY IF EXISTS "Users can update own profile" ON profil;
DROP POLICY IF EXISTS "Allow authenticated updates" ON profil;

-- Supprimer toutes les policies restrictives
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profil' AND cmd = 'UPDATE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profil', policy_record.policyname);
    END LOOP;
END $$;

-- Créer les policies nécessaires pour profil
-- SELECT
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profil;
CREATE POLICY "Authenticated users can view all profiles"
  ON profil FOR SELECT
  TO authenticated
  USING (true);

-- INSERT
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profil;
CREATE POLICY "Authenticated users can insert profiles"
  ON profil FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE (CRITIQUE)
CREATE POLICY "Authenticated users can update profiles"
  ON profil FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON profil;
CREATE POLICY "Authenticated users can delete profiles"
  ON profil FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- VERIFICATION FINALE
-- ========================================

-- Vérifier que la policy UPDATE existe bien
SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profil' AND cmd = 'UPDATE';

-- Compter le nombre de policies par opération
SELECT
  cmd as operation,
  COUNT(*) as nombre_policies
FROM pg_policies
WHERE tablename = 'profil'
GROUP BY cmd
ORDER BY cmd;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Policies RLS corrigées pour la table profil';
  RAISE NOTICE '✅ Les utilisateurs authentifiés peuvent maintenant UPDATE les profils';
END $$;
