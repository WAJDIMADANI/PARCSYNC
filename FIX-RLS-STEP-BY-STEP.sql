/*
  # Fix RLS Policies - Version Corrigée

  Ce script supprime TOUTES les anciennes politiques et en crée de nouvelles.
  Exécutez ce script dans le SQL Editor de Supabase.

  IMPORTANT: Exécutez d'abord DIAGNOSE-RLS-PROBLEM.sql pour voir les noms exacts
  des politiques existantes, puis adaptez ce script si nécessaire.
*/

-- ========================================
-- ÉTAPE 1: Supprimer TOUTES les politiques existantes
-- ========================================

-- Profil table
DROP POLICY IF EXISTS "auth_all" ON profil;
DROP POLICY IF EXISTS "Anonymous can view profiles" ON profil;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profil;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profil;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profil;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON profil;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir tous les profils" ON profil;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent insérer des profils" ON profil;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent mettre à jour les profils" ON profil;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent supprimer des profils" ON profil;

-- Contrat table
DROP POLICY IF EXISTS "auth_all" ON contrat;
DROP POLICY IF EXISTS "Allow anonymous contrat updates" ON contrat;
DROP POLICY IF EXISTS "Allow public contrat reads" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can view all contracts" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON contrat;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir tous les contrats" ON contrat;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent insérer des contrats" ON contrat;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent mettre à jour les contrats" ON contrat;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent supprimer des contrats" ON contrat;

-- Modeles_contrats table
DROP POLICY IF EXISTS "Allow public read modeles_contrats" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can manage templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Anyone can view contract templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Tout le monde peut voir les modèles de contrats" ON modeles_contrats;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent insérer des modèles" ON modeles_contrats;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent mettre à jour les modèles" ON modeles_contrats;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent supprimer des modèles" ON modeles_contrats;

-- Candidat table (au cas où)
DROP POLICY IF EXISTS "auth_all" ON candidat;
DROP POLICY IF EXISTS "Authenticated users can view all candidates" ON candidat;
DROP POLICY IF EXISTS "Authenticated users can insert candidates" ON candidat;
DROP POLICY IF EXISTS "Authenticated users can update candidates" ON candidat;
DROP POLICY IF EXISTS "Authenticated users can delete candidates" ON candidat;

-- ========================================
-- ÉTAPE 2: Créer de nouvelles politiques SIMPLES
-- ========================================

-- PROFIL: Politiques pour utilisateurs authentifiés
CREATE POLICY "profil_select_policy"
  ON profil FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profil_insert_policy"
  ON profil FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "profil_update_policy"
  ON profil FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "profil_delete_policy"
  ON profil FOR DELETE
  TO authenticated
  USING (true);

-- CONTRAT: Politiques pour utilisateurs authentifiés
CREATE POLICY "contrat_select_policy"
  ON contrat FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contrat_insert_policy"
  ON contrat FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "contrat_update_policy"
  ON contrat FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "contrat_delete_policy"
  ON contrat FOR DELETE
  TO authenticated
  USING (true);

-- MODELES_CONTRATS: Lecture publique, modifications authentifiées
CREATE POLICY "modeles_contrats_select_policy"
  ON modeles_contrats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "modeles_contrats_insert_policy"
  ON modeles_contrats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "modeles_contrats_update_policy"
  ON modeles_contrats FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "modeles_contrats_delete_policy"
  ON modeles_contrats FOR DELETE
  TO authenticated
  USING (true);

-- CANDIDAT: Politiques pour utilisateurs authentifiés
CREATE POLICY "candidat_select_policy"
  ON candidat FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "candidat_insert_policy"
  ON candidat FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "candidat_update_policy"
  ON candidat FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "candidat_delete_policy"
  ON candidat FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- ÉTAPE 3: Vérification
-- ========================================

-- Afficher toutes les nouvelles politiques
SELECT
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename IN ('profil', 'contrat', 'modeles_contrats', 'candidat')
ORDER BY tablename, cmd;
