/*
  # Create Contract Workflow System

  1. New Tables
    - `contrat`
      - `id` (uuid, primary key) - Unique identifier
      - `profil_id` (uuid, FK) - Reference to employee profile
      - `modele_id` (uuid, FK) - Reference to contract template
      - `site_id` (uuid, FK) - Work site
      - `variables` (jsonb) - All contract variables filled by RH
      - `fichier_contrat_url` (text) - Generated contract PDF URL
      - `fichier_signe_url` (text) - Signed contract PDF URL
      - `certificat_medical_id` (uuid, FK) - Reference to medical certificate document
      - `dpae_id` (uuid, FK) - Reference to DPAE document
      - `date_envoi` (timestamptz) - Date contract was sent
      - `date_signature` (timestamptz) - Date contract was signed
      - `statut` (text) - Contract status: envoye, signe, valide
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Updates
    - Add `contrat_envoye` status to profil table if needed

  3. Security
    - Enable RLS on `contrat` table
    - Add policies for authenticated users to manage contracts

  4. Workflow Statuses
    - Profil: en_attente_contrat → contrat_envoye → actif
    - Contrat: envoye → signe → valide
*/

-- Create contrat table
CREATE TABLE IF NOT EXISTS contrat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  modele_id uuid NOT NULL REFERENCES modeles_contrats(id),
  site_id uuid REFERENCES site(id),
  variables jsonb DEFAULT '{}'::jsonb,
  fichier_contrat_url text,
  fichier_signe_url text,
  certificat_medical_id uuid REFERENCES document(id),
  dpae_id uuid REFERENCES document(id),
  date_envoi timestamptz DEFAULT now(),
  date_signature timestamptz,
  statut text NOT NULL DEFAULT 'envoye' CHECK (statut IN ('envoye', 'signe', 'valide')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_contrat_profil_id ON contrat(profil_id);
CREATE INDEX IF NOT EXISTS idx_contrat_statut ON contrat(statut);

-- Enable RLS
ALTER TABLE contrat ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON contrat;

-- Create policies
CREATE POLICY "Authenticated users can view contracts"
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contrat_updated_at ON contrat;

CREATE TRIGGER update_contrat_updated_at
  BEFORE UPDATE ON contrat
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
