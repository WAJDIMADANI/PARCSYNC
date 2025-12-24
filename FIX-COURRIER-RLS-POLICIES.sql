/*
  Correction des Policies RLS pour courrier_genere

  Problème : Les policies comparaient created_by = auth.uid()
  Mais created_by stocke app_utilisateur.id, pas auth.uid()

  Solution : Utiliser une subquery pour faire le lien via auth_user_id
*/

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Authenticated users can create generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Users can update their generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Users can delete their generated letters" ON courrier_genere;

-- Policy SELECT : Tous les utilisateurs authentifiés peuvent voir tous les courriers
CREATE POLICY "Users can view generated letters"
  ON courrier_genere
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy INSERT : Vérifie que created_by correspond à l'app_utilisateur.id du user connecté
CREATE POLICY "Authenticated users can create generated letters"
  ON courrier_genere
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.id = courrier_genere.created_by
      AND app_utilisateur.auth_user_id = auth.uid()
    )
  );

-- Policy UPDATE : Vérifie ownership via subquery OU permission admin
CREATE POLICY "Users can update their generated letters"
  ON courrier_genere
  FOR UPDATE
  TO authenticated
  USING (
    -- L'utilisateur est le créateur du courrier
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.id = courrier_genere.created_by
      AND app_utilisateur.auth_user_id = auth.uid()
    )
    OR
    -- OU l'utilisateur a la permission gestion_utilisateurs
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'gestion_utilisateurs'
      AND up.actif = true
    )
  );

-- Policy DELETE : Vérifie ownership via subquery OU permission admin
CREATE POLICY "Users can delete their generated letters"
  ON courrier_genere
  FOR DELETE
  TO authenticated
  USING (
    -- L'utilisateur est le créateur du courrier
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.id = courrier_genere.created_by
      AND app_utilisateur.auth_user_id = auth.uid()
    )
    OR
    -- OU l'utilisateur a la permission gestion_utilisateurs
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'gestion_utilisateurs'
      AND up.actif = true
    )
  );

-- Vérifier que les policies ont bien été créées
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
WHERE tablename = 'courrier_genere'
ORDER BY policyname;
