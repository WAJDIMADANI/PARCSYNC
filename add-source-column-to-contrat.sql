/*
  # Add source column to contrat table

  1. Changes
    - Add `source` column to track contract origin (manuel, yousign)

  2. Details
    - Column: `source` (text) - Indicates if contract is manual or from Yousign
    - Default: NULL for existing contracts
    - Values: 'manuel', 'yousign', or NULL

  3. Notes
    - Existing contracts will have NULL source (assumed Yousign)
    - New manual uploads will have 'manuel' source
    - Safe to run multiple times (uses IF NOT EXISTS check)
*/

-- Add source column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'source'
  ) THEN
    ALTER TABLE contrat ADD COLUMN source text;
    COMMENT ON COLUMN contrat.source IS 'Origin of the contract: manuel or yousign';
  END IF;
END $$;
