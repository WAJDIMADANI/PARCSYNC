/*
  # CORRECTION COMPLÈTE DU SYSTÈME INBOX

  Ce script corrige tous les problèmes :
  1. Politiques RLS sur taches (pour que wajdi reçoive les tâches)
  2. Création de la table taches_messages (pour les réponses)
  3. Politiques RLS sur taches_messages
  4. Activation du real-time

  EXÉCUTEZ CE SCRIPT MAINTENANT DANS SUPABASE SQL EDITOR
*/

-- ===============================================
-- PARTIE 1 : CORRIGER LES POLITIQUES RLS TACHES
-- ===============================================

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

-- Politique INSERT : Tout le monde peut créer une tâche
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

-- Politique UPDATE : L'assignee ET l'expéditeur peuvent modifier
CREATE POLICY "Users can update their tasks"
  ON taches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND (app_utilisateur.id = assignee_id OR app_utilisateur.id = expediteur_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND (app_utilisateur.id = assignee_id OR app_utilisateur.id = expediteur_id)
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

-- ===============================================
-- PARTIE 2 : CRÉER LA TABLE TACHES_MESSAGES
-- ===============================================

-- Créer la table taches_messages
CREATE TABLE IF NOT EXISTS taches_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tache_id uuid REFERENCES taches(id) ON DELETE CASCADE NOT NULL,
  auteur_id uuid REFERENCES app_utilisateur(id) ON DELETE CASCADE NOT NULL,
  contenu text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_taches_messages_tache_id ON taches_messages(tache_id);
CREATE INDEX IF NOT EXISTS idx_taches_messages_auteur_id ON taches_messages(auteur_id);
CREATE INDEX IF NOT EXISTS idx_taches_messages_created_at ON taches_messages(created_at DESC);

-- ===============================================
-- PARTIE 3 : POLITIQUES RLS TACHES_MESSAGES
-- ===============================================

-- Activer RLS
ALTER TABLE taches_messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view messages of their tasks" ON taches_messages;
DROP POLICY IF EXISTS "Users can create messages on their tasks" ON taches_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON taches_messages;

-- Politique SELECT : Voir les messages des tâches où je suis impliqué
CREATE POLICY "Users can view messages of their tasks"
  ON taches_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM taches t
      INNER JOIN app_utilisateur au ON au.auth_user_id = auth.uid()
      WHERE t.id = taches_messages.tache_id
      AND (t.assignee_id = au.id OR t.expediteur_id = au.id)
    )
  );

-- Politique INSERT : Créer des messages sur les tâches où je suis impliqué
CREATE POLICY "Users can create messages on their tasks"
  ON taches_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM taches t
      INNER JOIN app_utilisateur au ON au.auth_user_id = auth.uid()
      WHERE t.id = tache_id
      AND (t.assignee_id = au.id OR t.expediteur_id = au.id)
      AND au.id = auteur_id
    )
  );

-- Politique DELETE : Supprimer ses propres messages
CREATE POLICY "Users can delete their own messages"
  ON taches_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND app_utilisateur.id = auteur_id
    )
  );

-- ===============================================
-- PARTIE 4 : ACTIVER REAL-TIME
-- ===============================================

-- Activer real-time pour les tâches
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS taches;

-- Activer real-time pour les messages
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS taches_messages;

-- ===============================================
-- VÉRIFICATION FINALE
-- ===============================================

-- Afficher les politiques créées
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('taches', 'taches_messages')
ORDER BY tablename, policyname;

-- Message de succès
SELECT '✅ INSTALLATION COMPLÈTE !' as resultat;
SELECT '✅ Les tâches devraient maintenant être visibles par les destinataires' as info;
SELECT '✅ Le bouton Répondre devrait apparaître dans l''interface' as info2;
