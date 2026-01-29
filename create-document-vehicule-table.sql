/*
  # Create document_vehicule table

  1. New Tables
    - `document_vehicule`
      - `id` (uuid, primary key)
      - `vehicule_id` (uuid, foreign key to vehicule)
      - `type_document` (text) - Type of document (carte_grise, assurance, controle_technique, etc.)
      - `nom_fichier` (text) - Original filename
      - `fichier_url` (text) - Storage path/URL
      - `date_emission` (date) - Issue date
      - `date_expiration` (date) - Expiration date
      - `actif` (boolean) - Whether document is active (for soft delete)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `document_vehicule` table
    - Add policy for authenticated users to read active documents
    - Add policy for authenticated users to insert documents
    - Add policy for authenticated users to update documents (soft delete)

  3. Indexes
    - Index on vehicule_id for faster lookups
    - Index on type_document for filtering by document type
    - Index on date_expiration for expiration checks
*/

CREATE TABLE IF NOT EXISTS public.document_vehicule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES public.vehicule(id) ON DELETE CASCADE,
  type_document text NOT NULL,
  nom_fichier text NOT NULL,
  fichier_url text NOT NULL,
  date_emission date,
  date_expiration date,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_vehicule_vehicule_id ON public.document_vehicule(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_type_document ON public.document_vehicule(type_document);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_date_expiration ON public.document_vehicule(date_expiration);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_actif ON public.document_vehicule(actif);

-- Enable RLS
ALTER TABLE public.document_vehicule ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can read all documents"
  ON public.document_vehicule
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON public.document_vehicule
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
  ON public.document_vehicule
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_vehicule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_vehicule_updated_at_trigger
  BEFORE UPDATE ON public.document_vehicule
  FOR EACH ROW
  EXECUTE FUNCTION update_document_vehicule_updated_at();
