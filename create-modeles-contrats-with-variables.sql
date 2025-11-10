/*
  # Create contract templates table with variables

  1. New Tables
    - `modeles_contrats`
      - `id` (uuid, primary key) - Unique identifier
      - `nom` (text) - Template name
      - `type_contrat` (text) - Contract type (CDI, CDD, etc.)
      - `fichier_url` (text) - PDF file URL in storage
      - `fichier_nom` (text) - Original filename
      - `variables` (jsonb) - Contract variables for merge fields
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `modeles_contrats` table
    - Add policy for authenticated users to manage templates

  3. Variables Structure
    The `variables` field stores all contract merge fields including:
    - Employer information (name, address, SIREN, SIRET, NAF)
    - Employee placeholders (name, birthday, address, nationality, ID)
    - Contract details (job title, group, coefficient, dates, hours, rate)
    - Work location details (site, area)
    - Annex information (schedule details)
*/

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS modeles_contrats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  type_contrat text NOT NULL,
  fichier_url text NOT NULL,
  fichier_nom text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add variables column if table already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modeles_contrats' AND column_name = 'variables'
  ) THEN
    ALTER TABLE modeles_contrats ADD COLUMN variables jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE modeles_contrats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON modeles_contrats;

-- Create policies
CREATE POLICY "Authenticated users can view templates"
  ON modeles_contrats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert templates"
  ON modeles_contrats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates"
  ON modeles_contrats FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete templates"
  ON modeles_contrats FOR DELETE
  TO authenticated
  USING (true);
