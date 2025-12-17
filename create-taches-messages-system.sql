/*
  # Système de Messages pour les Tâches (Style Gmail)

  1. Nouvelle table
    - `taches_messages`
      - `id` (uuid, primary key)
      - `tache_id` (uuid, référence à taches)
      - `auteur_id` (uuid, référence à app_utilisateur)
      - `contenu` (text)
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur la table `taches_messages`
    - Politique : Un utilisateur peut voir les messages des tâches auxquelles il a accès
    - Politique : Un utilisateur peut créer des messages sur les tâches auxquelles il participe

  3. Real-time
    - Activer la publication real-time pour la table
*/

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

-- Activer RLS
ALTER TABLE taches_messages ENABLE ROW LEVEL SECURITY;

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

-- Activer real-time
ALTER PUBLICATION supabase_realtime ADD TABLE taches_messages;

-- Vue pour faciliter les requêtes avec les noms des auteurs
CREATE OR REPLACE VIEW taches_messages_avec_auteurs AS
SELECT
  tm.*,
  au.nom as auteur_nom,
  au.prenom as auteur_prenom,
  au.email as auteur_email
FROM taches_messages tm
LEFT JOIN app_utilisateur au ON tm.auteur_id = au.id;
