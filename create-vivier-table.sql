/*
  # Création de la table vivier pour gérer les candidats en vivier

  1. Nouvelle Table
    - `vivier`
      - `id` (uuid, primary key) - Identifiant unique
      - `candidat_id` (uuid, foreign key) - Référence au candidat
      - `date_disponibilite` (date, nullable) - Date complète de disponibilité
      - `mois_disponibilite` (text, nullable) - Mois de disponibilité (format: "YYYY-MM")
      - `nom` (text) - Nom du candidat (dénormalisé pour faciliter l'affichage)
      - `prenom` (text) - Prénom du candidat
      - `telephone` (text, nullable) - Téléphone du candidat
      - `email` (text, nullable) - Email du candidat
      - `poste_souhaite` (text, nullable) - Poste souhaité
      - `created_at` (timestamptz) - Date d'ajout au vivier
      - `updated_at` (timestamptz) - Date de dernière modification
      - `notification_envoyee` (boolean) - Flag pour savoir si notification 1 mois avant a été envoyée

  2. Security
    - Enable RLS sur la table `vivier`
    - Policy pour que les utilisateurs authentifiés puissent lire
    - Policy pour que les utilisateurs authentifiés puissent insérer
    - Policy pour que les utilisateurs authentifiés puissent mettre à jour
    - Policy pour que les utilisateurs authentifiés puissent supprimer

  3. Indexes
    - Index sur `candidat_id` pour les jointures rapides
    - Index sur `date_disponibilite` pour les filtres et notifications
    - Index sur `mois_disponibilite` pour les filtres
    - Index sur `notification_envoyee` pour le système de notifications

  4. Notes importantes
    - La table vivier est SÉPARÉE de la table candidat
    - Quand un candidat passe en vivier, on COPIE ses données dans cette table
    - Les données sont dénormalisées pour éviter des jointures constantes
    - Un candidat peut avoir soit date_disponibilite, soit mois_disponibilite, soit les deux
*/

-- Création de la table vivier
CREATE TABLE IF NOT EXISTS vivier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id uuid REFERENCES candidat(id) ON DELETE CASCADE,
  date_disponibilite date,
  mois_disponibilite text,
  nom text NOT NULL,
  prenom text NOT NULL,
  telephone text,
  email text,
  poste_souhaite text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notification_envoyee boolean DEFAULT false,
  CONSTRAINT date_ou_mois_requis CHECK (
    date_disponibilite IS NOT NULL OR mois_disponibilite IS NOT NULL
  )
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_vivier_candidat_id ON vivier(candidat_id);
CREATE INDEX IF NOT EXISTS idx_vivier_date_disponibilite ON vivier(date_disponibilite);
CREATE INDEX IF NOT EXISTS idx_vivier_mois_disponibilite ON vivier(mois_disponibilite);
CREATE INDEX IF NOT EXISTS idx_vivier_notification ON vivier(notification_envoyee, date_disponibilite);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_vivier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vivier_updated_at_trigger
  BEFORE UPDATE ON vivier
  FOR EACH ROW
  EXECUTE FUNCTION update_vivier_updated_at();

-- Enable Row Level Security
ALTER TABLE vivier ENABLE ROW LEVEL SECURITY;

-- Policy pour SELECT - Les utilisateurs authentifiés peuvent voir tous les candidats du vivier
CREATE POLICY "Utilisateurs authentifiés peuvent voir le vivier"
  ON vivier
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy pour INSERT - Les utilisateurs authentifiés peuvent ajouter au vivier
CREATE POLICY "Utilisateurs authentifiés peuvent ajouter au vivier"
  ON vivier
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy pour UPDATE - Les utilisateurs authentifiés peuvent mettre à jour
CREATE POLICY "Utilisateurs authentifiés peuvent mettre à jour le vivier"
  ON vivier
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy pour DELETE - Les utilisateurs authentifiés peuvent supprimer
CREATE POLICY "Utilisateurs authentifiés peuvent supprimer du vivier"
  ON vivier
  FOR DELETE
  TO authenticated
  USING (true);

-- Fonction pour obtenir les candidats du vivier dont la date de disponibilité approche (1 mois)
-- Cette fonction sera utilisée pour générer les notifications
CREATE OR REPLACE FUNCTION get_vivier_notifications()
RETURNS TABLE (
  id uuid,
  candidat_id uuid,
  nom text,
  prenom text,
  date_disponibilite date,
  mois_disponibilite text,
  jours_avant_disponibilite integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.candidat_id,
    v.nom,
    v.prenom,
    v.date_disponibilite,
    v.mois_disponibilite,
    CASE
      WHEN v.date_disponibilite IS NOT NULL
      THEN (v.date_disponibilite - CURRENT_DATE)::integer
      ELSE NULL
    END as jours_avant_disponibilite
  FROM vivier v
  WHERE
    v.notification_envoyee = false
    AND (
      -- Si date complète : vérifier si c'est dans environ 30 jours
      (v.date_disponibilite IS NOT NULL AND v.date_disponibilite <= CURRENT_DATE + INTERVAL '35 days' AND v.date_disponibilite >= CURRENT_DATE)
      OR
      -- Si mois seulement : vérifier si c'est le mois prochain ou ce mois-ci
      (v.mois_disponibilite IS NOT NULL AND v.date_disponibilite IS NULL AND
       v.mois_disponibilite IN (
         TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
         TO_CHAR(CURRENT_DATE + INTERVAL '1 month', 'YYYY-MM')
       ))
    )
  ORDER BY
    CASE
      WHEN v.date_disponibilite IS NOT NULL
      THEN v.date_disponibilite
      ELSE (v.mois_disponibilite || '-01')::date
    END ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
