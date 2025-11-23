/*
  # Add permis_conduire_expiration field to profil table

  1. Changes
    - Add `permis_conduire_expiration` date column to profil table
    - Add index for performance optimization
*/

-- Add field for driving license expiration date
ALTER TABLE profil ADD COLUMN IF NOT EXISTS permis_conduire_expiration date;

-- Create index to optimize searches
CREATE INDEX IF NOT EXISTS idx_profil_permis_expiration ON profil(permis_conduire_expiration);
