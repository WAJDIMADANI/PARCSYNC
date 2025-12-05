/*
  # Add avenant date columns to profil table

  1. New columns in profil table
    - `avenant_1_date_debut` (date) - Start date of amendment 1
    - `avenant_1_date_fin` (date) - End date of amendment 1
    - `avenant_2_date_debut` (date) - Start date of amendment 2
    - `avenant_2_date_fin` (date) - End date of amendment 2

  2. Notes
    - All columns are nullable to support flexible imports
    - Uses IF NOT EXISTS to avoid errors on re-run
*/

DO $$
BEGIN
  -- Avenant 1 - Date de début
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'avenant_1_date_debut'
  ) THEN
    ALTER TABLE profil ADD COLUMN avenant_1_date_debut date;
  END IF;

  -- Avenant 1 - Date de fin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'avenant_1_date_fin'
  ) THEN
    ALTER TABLE profil ADD COLUMN avenant_1_date_fin date;
  END IF;

  -- Avenant 2 - Date de début
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'avenant_2_date_debut'
  ) THEN
    ALTER TABLE profil ADD COLUMN avenant_2_date_debut date;
  END IF;

  -- Avenant 2 - Date de fin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'avenant_2_date_fin'
  ) THEN
    ALTER TABLE profil ADD COLUMN avenant_2_date_fin date;
  END IF;
END $$;
