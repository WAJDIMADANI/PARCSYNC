/*
  # Fix Genre Encoding and Standardize Values

  This migration fixes character encoding issues with the genre field and standardizes
  all genre values to use "Homme" and "Femme" consistently across the application.

  ## Changes Made

  1. Fix Encoding Issues
     - Replace any corrupted "Féminin" (F�minin) with "Femme"
     - Replace any corrupted "Masculin" with "Homme"
     - Fix any other encoding issues in the genre column

  2. Standardize Values
     - Convert "Masculin" → "Homme"
     - Convert "Féminin" → "Femme"
     - Keep "Autre" as is
     - Ensure all values use consistent UTF-8 encoding

  3. Apply to All Tables
     - salarie (employees table)
     - vivier (candidate pool table)
     - candidat (candidates table)

  ## Notes
  - This ensures consistency across the application
  - Avoids future encoding issues by using non-accented characters
  - Maintains data integrity with proper UTF-8 encoding
*/

-- Fix and standardize genre in salarie table
UPDATE salarie
SET genre = CASE
  WHEN genre LIKE '%minin%' OR genre = 'Féminin' THEN 'Femme'
  WHEN genre LIKE '%sculin%' OR genre = 'Masculin' THEN 'Homme'
  WHEN genre = 'Autre' THEN 'Autre'
  ELSE genre
END
WHERE genre IS NOT NULL
  AND genre NOT IN ('Homme', 'Femme', 'Autre');

-- Standardize remaining valid values in salarie
UPDATE salarie
SET genre = CASE
  WHEN genre = 'Masculin' THEN 'Homme'
  WHEN genre = 'Féminin' THEN 'Femme'
  ELSE genre
END
WHERE genre IN ('Masculin', 'Féminin');

-- Fix and standardize genre in vivier table (if exists)
UPDATE vivier
SET genre = CASE
  WHEN genre LIKE '%minin%' OR genre = 'Féminin' THEN 'Femme'
  WHEN genre LIKE '%sculin%' OR genre = 'Masculin' THEN 'Homme'
  WHEN genre = 'Autre' THEN 'Autre'
  ELSE genre
END
WHERE genre IS NOT NULL
  AND genre NOT IN ('Homme', 'Femme', 'Autre');

-- Standardize remaining valid values in vivier
UPDATE vivier
SET genre = CASE
  WHEN genre = 'Masculin' THEN 'Homme'
  WHEN genre = 'Féminin' THEN 'Femme'
  ELSE genre
END
WHERE genre IN ('Masculin', 'Féminin');

-- Fix and standardize genre in candidat table (if exists)
UPDATE candidat
SET genre = CASE
  WHEN genre LIKE '%minin%' OR genre = 'Féminin' THEN 'Femme'
  WHEN genre LIKE '%sculin%' OR genre = 'Masculin' THEN 'Homme'
  WHEN genre = 'Autre' THEN 'Autre'
  ELSE genre
END
WHERE genre IS NOT NULL
  AND genre NOT IN ('Homme', 'Femme', 'Autre');

-- Standardize remaining valid values in candidat
UPDATE candidat
SET genre = CASE
  WHEN genre = 'Masculin' THEN 'Homme'
  WHEN genre = 'Féminin' THEN 'Femme'
  ELSE genre
END
WHERE genre IN ('Masculin', 'Féminin');

-- Verify the changes
SELECT 'salarie' as table_name, genre, COUNT(*) as count
FROM salarie
WHERE genre IS NOT NULL
GROUP BY genre
UNION ALL
SELECT 'vivier' as table_name, genre, COUNT(*) as count
FROM vivier
WHERE genre IS NOT NULL
GROUP BY genre
UNION ALL
SELECT 'candidat' as table_name, genre, COUNT(*) as count
FROM candidat
WHERE genre IS NOT NULL
GROUP BY genre
ORDER BY table_name, genre;
