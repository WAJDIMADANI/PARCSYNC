/*
  # Fix Contract Table Schema for CSV Import

  1. Problem
    - The ImportSalariesBulk component tries to insert contracts with old schema columns
    - Current table has new schema with modele_id (required)
    - This causes import failures that appear as "date errors"

  2. Solution
    - Add missing columns to support both old and new schema
    - Make modele_id nullable to allow imports without templates
    - Add columns: type, date_debut, date_fin, esign, source

  3. Changes
    - ALTER modele_id to be nullable (was NOT NULL)
    - ADD type column (text)
    - ADD date_debut column (date)
    - ADD date_fin column (date)
    - ADD esign column (text)
    - ADD source column (text) for tracking import source
*/

-- Make modele_id nullable to allow imports without template
ALTER TABLE contrat ALTER COLUMN modele_id DROP NOT NULL;

-- Add type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'type'
  ) THEN
    ALTER TABLE contrat ADD COLUMN type text;
  END IF;
END $$;

-- Add date_debut column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'date_debut'
  ) THEN
    ALTER TABLE contrat ADD COLUMN date_debut date;
  END IF;
END $$;

-- Add date_fin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'date_fin'
  ) THEN
    ALTER TABLE contrat ADD COLUMN date_fin date;
  END IF;
END $$;

-- Add esign column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'esign'
  ) THEN
    ALTER TABLE contrat ADD COLUMN esign text DEFAULT 'pending';
  END IF;
END $$;

-- Add source column if it doesn't exist (for tracking import source)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'source'
  ) THEN
    ALTER TABLE contrat ADD COLUMN source text;
  END IF;
END $$;

-- Create index on type for faster queries
CREATE INDEX IF NOT EXISTS idx_contrat_type ON contrat(type);

-- Create index on date_debut for date range queries
CREATE INDEX IF NOT EXISTS idx_contrat_date_debut ON contrat(date_debut);

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contrat'
ORDER BY ordinal_position;
