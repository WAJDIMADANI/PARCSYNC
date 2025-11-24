/*
  # URGENT: Fix RLS Policies for All Tables

  ## Problème
    - Aucun salarié ne s'affiche (table profil)
    - Aucun contrat ne s'affiche (table contrat)
    - Les modèles de contrats peuvent ne pas être accessibles (table modeles_contrats)
    - Les politiques RLS bloquent l'accès aux données

  ## Solution
    - Supprimer les anciennes politiques restrictives
    - Créer des politiques permissives pour les utilisateurs authentifiés
    - Permettre la lecture publique des modèles de contrats

  ## Instructions d'exécution
    1. Aller sur https://supabase.com/dashboard
    2. Sélectionner votre projet
    3. Aller dans "SQL Editor"
    4. Copier-coller ce script complet
    5. Cliquer sur "Run"
*/

-- ========================================
-- FIX PROFIL TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "auth_all" ON profil;
DROP POLICY IF EXISTS "Anonymous can view profiles" ON profil;

CREATE POLICY "Authenticated users can view all profiles"
  ON profil FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert profiles"
  ON profil FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update profiles"
  ON profil FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete profiles"
  ON profil FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- FIX CONTRAT TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "auth_all" ON contrat;
DROP POLICY IF EXISTS "Allow anonymous contrat updates" ON contrat;
DROP POLICY IF EXISTS "Allow public contrat reads" ON contrat;

CREATE POLICY "Authenticated users can view all contracts"
  ON contrat FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contracts"
  ON contrat FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
  ON contrat FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contracts"
  ON contrat FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- FIX MODELES_CONTRATS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Allow public read modeles_contrats" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can manage templates" ON modeles_contrats;

CREATE POLICY "Anyone can view contract templates"
  ON modeles_contrats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert templates"
  ON modeles_contrats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates"
  ON modeles_contrats FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete templates"
  ON modeles_contrats FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- VERIFICATION
-- ========================================

-- Vérifier que RLS est activé
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('profil', 'contrat', 'modeles_contrats');

-- Lister toutes les politiques créées
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profil', 'contrat', 'modeles_contrats')
ORDER BY tablename, cmd;
