/*
  # Add date_envoi_poste column to courrier_genere table

  1. Changes
    - Add `date_envoi_poste` (timestamptz nullable) to store the postal sending date
    - This allows tracking when a letter was physically sent by mail
    - Used in conjunction with status changes to "envoye"

  2. Notes
    - Nullable field as not all letters will be sent by mail
    - Separate from `sent_at` which tracks email sending
*/

-- Add date_envoi_poste column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courrier_genere' AND column_name = 'date_envoi_poste'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN date_envoi_poste TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for filtering by postal send date
CREATE INDEX IF NOT EXISTS idx_courrier_genere_date_envoi_poste ON courrier_genere(date_envoi_poste);
