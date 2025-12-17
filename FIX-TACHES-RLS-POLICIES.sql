/*
  # Correction des politiques RLS pour la table taches

  Problème : Les politiques actuelles comparent auth.uid() avec les IDs de app_utilisateur
  Solution : Utiliser une sous-requête pour trouver l'ID dans app_utilisateur correspondant à auth.uid()

  Les politiques doivent vérifier que l'utilisateur authentifié correspond à
  l'entrée dans app_utilisateur via la colonne auth_user_id.
*/

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view tasks assigned to them or sent by them" ON taches;
DROP POLICY IF EXISTS "Users can create tasks" ON taches;
DROP POLICY IF EXISTS "Assignee can update their tasks" ON taches;
DROP POLICY IF EXISTS "Users can delete tasks they are involved in" ON taches;

-- Politique SELECT : Voir les tâches où je suis assignee ou expéditeur
CREATE POLICY "Users can view tasks assigned to them or sent by them"
  ON taches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND (app_utilisateur.id = taches.assignee_id OR app_utilisateur.id = taches.expediteur_id)
    )
  );

-- Politique INSERT : Tout le monde peut créer une tâche (vérifie que l'expéditeur est bien l'utilisateur)
CREATE POLICY "Users can create tasks"
  ON taches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND app_utilisateur.id = expediteur_id
    )
  );

-- Politique UPDATE : Seul l'assignee peut modifier la tâche (notamment le statut)
CREATE POLICY "Assignee can update their tasks"
  ON taches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND app_utilisateur.id = assignee_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND app_utilisateur.id = assignee_id
    )
  );

-- Politique DELETE : L'expéditeur ou l'assignee peuvent supprimer
CREATE POLICY "Users can delete tasks they are involved in"
  ON taches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND (app_utilisateur.id = assignee_id OR app_utilisateur.id = expediteur_id)
    )
  );
