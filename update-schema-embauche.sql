/*
  # Add onboarding fields and document table

  1. Changes to candidat table
    - Add IBAN field for bank account
    - Add NIR (Numéro de Sécurité Sociale) field
    - Add permis_categorie for driver's license category
    - Add permis_points for driver's license points (declarative)
    - Add consent_rgpd_at timestamp for RGPD consent tracking

  2. New Tables
    - `document`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, reference to candidat or profil)
      - `owner_type` (text, 'candidat' or 'profil')
      - `type_document` (text: 'cni', 'carte_vitale', 'rib', 'permis_recto', 'permis_verso', 'casier_judiciaire', 'attestation_points', 'cv', 'lettre_motivation')
      - `file_url` (text)
      - `file_name` (text)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on document table
    - Add policies for authenticated users only
*/

-- Add new fields to candidat table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'iban'
  ) THEN
    ALTER TABLE candidat ADD COLUMN iban text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'nir'
  ) THEN
    ALTER TABLE candidat ADD COLUMN nir text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'permis_categorie'
  ) THEN
    ALTER TABLE candidat ADD COLUMN permis_categorie text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'permis_points'
  ) THEN
    ALTER TABLE candidat ADD COLUMN permis_points integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'consent_rgpd_at'
  ) THEN
    ALTER TABLE candidat ADD COLUMN consent_rgpd_at timestamptz;
  END IF;
END $$;

-- Create document table
CREATE TABLE IF NOT EXISTS document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  owner_type text NOT NULL CHECK (owner_type IN ('candidat', 'profil')),
  type_document text NOT NULL CHECK (type_document IN (
    'cni_recto', 'cni_verso', 'carte_vitale', 'rib',
    'permis_recto', 'permis_verso', 'casier_judiciaire',
    'attestation_points', 'cv', 'lettre_motivation'
  )),
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on document table
ALTER TABLE document ENABLE ROW LEVEL SECURITY;

-- Policies for document table (authenticated users only)
CREATE POLICY "Authenticated users can read all documents"
  ON document
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON document
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their documents"
  ON document
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete documents"
  ON document
  FOR DELETE
  TO authenticated
  USING (true);

-- Add same fields to profil table for employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'iban'
  ) THEN
    ALTER TABLE profil ADD COLUMN iban text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'nir'
  ) THEN
    ALTER TABLE profil ADD COLUMN nir text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'permis_categorie'
  ) THEN
    ALTER TABLE profil ADD COLUMN permis_categorie text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'permis_points'
  ) THEN
    ALTER TABLE profil ADD COLUMN permis_points integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'adresse'
  ) THEN
    ALTER TABLE profil ADD COLUMN adresse text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'code_postal'
  ) THEN
    ALTER TABLE profil ADD COLUMN code_postal text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'ville'
  ) THEN
    ALTER TABLE profil ADD COLUMN ville text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'date_naissance'
  ) THEN
    ALTER TABLE profil ADD COLUMN date_naissance date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'nationalite'
  ) THEN
    ALTER TABLE profil ADD COLUMN nationalite text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'date_permis_conduire'
  ) THEN
    ALTER TABLE profil ADD COLUMN date_permis_conduire date;
  END IF;
END $$;
