/*
  # Fix RLS Policies for courrier_genere

  This migration fixes Row Level Security policies for the courrier_genere table
  to allow authenticated users to insert generated letters.

  ## Changes
  - Drop existing policies if they exist
  - Create new policies for SELECT, INSERT, UPDATE, DELETE
  - Allow all authenticated users to create letters
  - Allow users to view all generated letters
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Authenticated users can create generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Users can update their generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Users can delete their generated letters" ON courrier_genere;

-- Policy: All authenticated users can view generated letters
CREATE POLICY "Users can view generated letters"
  ON courrier_genere
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can insert generated letters
CREATE POLICY "Authenticated users can create generated letters"
  ON courrier_genere
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own generated letters or if they have admin permissions
CREATE POLICY "Users can update their generated letters"
  ON courrier_genere
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'gestion_utilisateurs'
      AND up.actif = true
    )
  );

-- Policy: Users can delete their own generated letters or if they have admin permissions
CREATE POLICY "Users can delete their generated letters"
  ON courrier_genere
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'gestion_utilisateurs'
      AND up.actif = true
    )
  );
