/*
  # Create Incidents System for Expired Documents

  1. New Tables
    - `incident`
      - `id` (uuid, primary key)
      - `type` (text) - Type: titre_sejour, visite_medicale, permis_conduire, contrat_cdd
      - `profil_id` (uuid) - Reference to employee
      - `date_expiration_originale` (date) - Original expiration date
      - `date_creation_incident` (date) - When incident was created
      - `statut` (text) - Status: actif, en_cours, resolu, ignore
      - `date_changement_statut` (timestamptz) - Last status change
      - `date_resolution` (timestamptz) - When resolved
      - `ancienne_date_validite` (date) - Old expiration date (before resolution)
      - `nouvelle_date_validite` (date) - New expiration date (after resolution)
      - `resolu_par` (uuid) - Who resolved it
      - `notes` (text) - Additional notes
      - `metadata` (jsonb) - Extra information
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `incident_historique`
      - `id` (uuid, primary key)
      - `incident_id` (uuid) - Reference to incident
      - `action` (text) - Action type: creation, changement_statut, resolution, mise_a_jour
      - `ancien_statut` (text) - Previous status
      - `nouveau_statut` (text) - New status
      - `ancienne_date` (date) - Old date
      - `nouvelle_date` (date) - New date
      - `effectue_par` (uuid) - Who performed the action
      - `notes` (text) - Action notes
      - `metadata` (jsonb) - Additional data
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users

  3. Indexes
    - Index on profil_id, statut, type for fast filtering
    - Index on date_creation_incident for sorting
    - Index on incident_id in historique

  4. Triggers
    - Auto-update updated_at on incident changes
    - Auto-create historique entry on incident changes
*/

-- Create incident table
CREATE TABLE IF NOT EXISTS incident (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('titre_sejour', 'visite_medicale', 'permis_conduire', 'contrat_cdd')),
  profil_id uuid NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  date_expiration_originale date NOT NULL,
  date_creation_incident date NOT NULL DEFAULT CURRENT_DATE,
  statut text DEFAULT 'actif' CHECK (statut IN ('actif', 'en_cours', 'resolu', 'ignore')),
  date_changement_statut timestamptz DEFAULT now(),
  date_resolution timestamptz,
  ancienne_date_validite date,
  nouvelle_date_validite date,
  resolu_par uuid REFERENCES auth.users(id),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create incident_historique table
CREATE TABLE IF NOT EXISTS incident_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('creation', 'changement_statut', 'resolution', 'mise_a_jour', 'email_envoye')),
  ancien_statut text,
  nouveau_statut text,
  ancienne_date date,
  nouvelle_date date,
  effectue_par uuid REFERENCES auth.users(id),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incident_profil ON incident(profil_id);
CREATE INDEX IF NOT EXISTS idx_incident_statut ON incident(statut);
CREATE INDEX IF NOT EXISTS idx_incident_type ON incident(type);
CREATE INDEX IF NOT EXISTS idx_incident_date_creation ON incident(date_creation_incident);
CREATE INDEX IF NOT EXISTS idx_incident_date_expiration ON incident(date_expiration_originale);
CREATE INDEX IF NOT EXISTS idx_incident_historique_incident ON incident_historique(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_historique_date ON incident_historique(created_at);

-- Enable RLS
ALTER TABLE incident ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_historique ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users full access
CREATE POLICY "Allow read for authenticated users" ON incident
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON incident
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON incident
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow delete for authenticated users" ON incident
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON incident_historique
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON incident_historique
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_incident_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
DROP TRIGGER IF EXISTS incident_updated_at ON incident;
CREATE TRIGGER incident_updated_at
  BEFORE UPDATE ON incident
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_updated_at();

-- Function to automatically create historique entry on incident changes
CREATE OR REPLACE FUNCTION log_incident_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO incident_historique (
      incident_id,
      action,
      nouveau_statut,
      nouvelle_date,
      effectue_par,
      notes,
      metadata
    ) VALUES (
      NEW.id,
      'creation',
      NEW.statut,
      NEW.date_expiration_originale,
      NEW.resolu_par,
      NEW.notes,
      jsonb_build_object('type', NEW.type, 'auto_created', true)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.statut != NEW.statut THEN
      INSERT INTO incident_historique (
        incident_id,
        action,
        ancien_statut,
        nouveau_statut,
        effectue_par,
        notes,
        metadata
      ) VALUES (
        NEW.id,
        CASE
          WHEN NEW.statut = 'resolu' THEN 'resolution'
          ELSE 'changement_statut'
        END,
        OLD.statut,
        NEW.statut,
        NEW.resolu_par,
        NEW.notes,
        jsonb_build_object('date_changement', now())
      );
    END IF;

    IF OLD.nouvelle_date_validite IS NULL AND NEW.nouvelle_date_validite IS NOT NULL THEN
      INSERT INTO incident_historique (
        incident_id,
        action,
        ancienne_date,
        nouvelle_date,
        effectue_par,
        notes,
        metadata
      ) VALUES (
        NEW.id,
        'mise_a_jour',
        OLD.date_expiration_originale,
        NEW.nouvelle_date_validite,
        NEW.resolu_par,
        NEW.notes,
        jsonb_build_object('document_updated', true)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log all incident changes
DROP TRIGGER IF EXISTS log_incident_changes ON incident;
CREATE TRIGGER log_incident_changes
  AFTER INSERT OR UPDATE ON incident
  FOR EACH ROW
  EXECUTE FUNCTION log_incident_change();

-- Add incident_id column to notification table for bidirectional link
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification' AND column_name = 'incident_id'
  ) THEN
    ALTER TABLE notification ADD COLUMN incident_id uuid REFERENCES incident(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_notification_incident ON notification(incident_id);
  END IF;
END $$;
