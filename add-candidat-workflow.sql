/*
  # Add candidate workflow tracking columns

  1. Changes
    - Add `statut_candidature` column to candidat table
      - Values: 'candidature_recue', 'entretien', 'pre_embauche', 'salarie'
      - Default: 'candidature_recue' (automatically set when candidate applies)

    - Add `code_couleur_rh` column to candidat table
      - Values: 'vert', 'jaune', 'rouge', 'bleu', null
      - Used for internal RH color coding (manual)

    - Add `poste` column to candidat table
      - Stores the position/role the candidate is applying for

  2. Notes
    - statut_candidature tracks the candidate journey automatically/manually
    - code_couleur_rh is purely for RH internal tracking
    - Both columns are independent from the existing 'pipeline' column
*/

-- Add statut_candidature column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'statut_candidature'
  ) THEN
    ALTER TABLE candidat ADD COLUMN statut_candidature text DEFAULT 'candidature_recue';
  END IF;
END $$;

-- Add code_couleur_rh column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'code_couleur_rh'
  ) THEN
    ALTER TABLE candidat ADD COLUMN code_couleur_rh text;
  END IF;
END $$;

-- Add poste column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'poste'
  ) THEN
    ALTER TABLE candidat ADD COLUMN poste text;
  END IF;
END $$;

-- Update existing candidates to have the default status
UPDATE candidat SET statut_candidature = 'candidature_recue' WHERE statut_candidature IS NULL;
