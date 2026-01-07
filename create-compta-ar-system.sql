/*
  # Système de gestion des Absences & Retards (A&R)

  1. Nouvelle Table
    - `compta_ar_events`
      - `id` (uuid, primary key)
      - `profil_id` (uuid, foreign key to profil)
      - `ar_type` (text) - 'ABSENCE' ou 'RETARD'
      - `start_date` (date) - Date de début ou date du retard
      - `end_date` (date) - Date de fin pour les absences (NULL pour retards)
      - `retard_minutes` (integer) - Nombre de minutes de retard (NULL pour absences)
      - `justifie` (boolean) - Si l'événement est justifié ou non
      - `note` (text) - Note additionnelle
      - `justificatif_file_path` (text) - Chemin vers le fichier justificatif
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to auth.users)
      - `updated_at` (timestamptz)

  2. Vue
    - `v_compta_ar` - Vue enrichie avec les informations du salarié

  3. Sécurité
    - Enable RLS on `compta_ar_events` table
    - Policies for authenticated users with compta/ar permission
*/

-- Create the compta_ar_events table
CREATE TABLE IF NOT EXISTS compta_ar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  ar_type text NOT NULL CHECK (ar_type IN ('ABSENCE', 'RETARD')),
  start_date date NOT NULL,
  end_date date,
  retard_minutes integer,
  justifie boolean DEFAULT false,
  note text,
  justificatif_file_path text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_retard CHECK (
    (ar_type = 'RETARD' AND retard_minutes IS NOT NULL AND end_date IS NULL) OR
    (ar_type = 'ABSENCE' AND end_date IS NOT NULL AND retard_minutes IS NULL)
  ),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_compta_ar_events_profil_id ON compta_ar_events(profil_id);
CREATE INDEX IF NOT EXISTS idx_compta_ar_events_start_date ON compta_ar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_compta_ar_events_ar_type ON compta_ar_events(ar_type);

-- Enable RLS
ALTER TABLE compta_ar_events ENABLE ROW LEVEL SECURITY;

-- Policies for compta_ar_events
CREATE POLICY "Users with compta/ar permission can view AR events"
  ON compta_ar_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      WHERE au.user_id = auth.uid()
      AND au.permissions ? 'compta/ar'
    )
  );

CREATE POLICY "Users with compta/ar permission can insert AR events"
  ON compta_ar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      WHERE au.user_id = auth.uid()
      AND au.permissions ? 'compta/ar'
    )
  );

CREATE POLICY "Users with compta/ar permission can update AR events"
  ON compta_ar_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      WHERE au.user_id = auth.uid()
      AND au.permissions ? 'compta/ar'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      WHERE au.user_id = auth.uid()
      AND au.permissions ? 'compta/ar'
    )
  );

CREATE POLICY "Users with compta/ar permission can delete AR events"
  ON compta_ar_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      WHERE au.user_id = auth.uid()
      AND au.permissions ? 'compta/ar'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_compta_ar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compta_ar_events_updated_at
  BEFORE UPDATE ON compta_ar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_compta_ar_events_updated_at();

-- Create the view v_compta_ar
CREATE OR REPLACE VIEW v_compta_ar AS
SELECT
  ae.id,
  ae.profil_id,
  p.matricule,
  p.nom,
  p.prenom,
  ae.ar_type,
  ae.start_date,
  ae.end_date,
  ae.retard_minutes,
  ROUND(ae.retard_minutes::numeric / 60, 2) as retard_hours,
  CASE
    WHEN ae.ar_type = 'ABSENCE' THEN ae.end_date - ae.start_date + 1
    ELSE NULL
  END as absence_days,
  ae.justifie,
  ae.note,
  ae.justificatif_file_path,
  ae.created_at,
  ae.created_by,
  ae.updated_at
FROM compta_ar_events ae
JOIN profil p ON ae.profil_id = p.id;

-- Grant access to the view
GRANT SELECT ON v_compta_ar TO authenticated;
