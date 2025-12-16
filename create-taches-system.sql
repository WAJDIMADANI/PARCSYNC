/*
  # Système de Tâches / Inbox

  1. Nouvelle table
    - `taches`
      - `id` (uuid, primary key)
      - `expediteur_id` (uuid, référence à app_utilisateur)
      - `assignee_id` (uuid, référence à app_utilisateur)
      - `titre` (text)
      - `contenu` (text)
      - `statut` (enum: en_attente, en_cours, completee)
      - `priorite` (enum: haute, normal, basse)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur la table `taches`
    - Politique : Un utilisateur ne voit que les tâches où il est assignee ou expéditeur
    - Politique : Seul l'assignee peut changer le statut
    - Politique : Tout le monde peut créer une tâche

  3. Real-time
    - Activer la publication real-time pour la table
*/

-- Créer les types enum
CREATE TYPE statut_tache AS ENUM ('en_attente', 'en_cours', 'completee');
CREATE TYPE priorite_tache AS ENUM ('haute', 'normal', 'basse');

-- Créer la table taches
CREATE TABLE IF NOT EXISTS taches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediteur_id uuid REFERENCES app_utilisateur(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES app_utilisateur(id) ON DELETE CASCADE,
  titre text NOT NULL,
  contenu text,
  statut statut_tache DEFAULT 'en_attente' NOT NULL,
  priorite priorite_tache DEFAULT 'normal' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_taches_assignee ON taches(assignee_id);
CREATE INDEX IF NOT EXISTS idx_taches_expediteur ON taches(expediteur_id);
CREATE INDEX IF NOT EXISTS idx_taches_statut ON taches(statut);
CREATE INDEX IF NOT EXISTS idx_taches_created_at ON taches(created_at DESC);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_taches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER taches_updated_at
  BEFORE UPDATE ON taches
  FOR EACH ROW
  EXECUTE FUNCTION update_taches_updated_at();

-- Activer RLS
ALTER TABLE taches ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Voir les tâches où je suis assignee ou expéditeur
CREATE POLICY "Users can view tasks assigned to them or sent by them"
  ON taches FOR SELECT
  TO authenticated
  USING (
    auth.uid() = assignee_id OR auth.uid() = expediteur_id
  );

-- Politique INSERT : Tout le monde peut créer une tâche
CREATE POLICY "Users can create tasks"
  ON taches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = expediteur_id);

-- Politique UPDATE : Seul l'assignee peut modifier la tâche (notamment le statut)
CREATE POLICY "Assignee can update their tasks"
  ON taches FOR UPDATE
  TO authenticated
  USING (auth.uid() = assignee_id)
  WITH CHECK (auth.uid() = assignee_id);

-- Politique DELETE : L'expéditeur ou l'assignee peuvent supprimer
CREATE POLICY "Users can delete tasks they are involved in"
  ON taches FOR DELETE
  TO authenticated
  USING (auth.uid() = assignee_id OR auth.uid() = expediteur_id);

-- Activer real-time
ALTER PUBLICATION supabase_realtime ADD TABLE taches;

-- Créer une vue pour faciliter les requêtes avec les noms des utilisateurs
-- Note: Les vues héritent automatiquement des politiques RLS des tables sous-jacentes
CREATE OR REPLACE VIEW taches_avec_utilisateurs AS
SELECT
  t.*,
  e.nom as expediteur_nom,
  e.prenom as expediteur_prenom,
  e.email as expediteur_email,
  a.nom as assignee_nom,
  a.prenom as assignee_prenom,
  a.email as assignee_email
FROM taches t
LEFT JOIN app_utilisateur e ON t.expediteur_id = e.id
LEFT JOIN app_utilisateur a ON t.assignee_id = a.id;
