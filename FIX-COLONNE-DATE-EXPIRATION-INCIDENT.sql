/*
  CORRECTION: Ajouter la colonne date_expiration_effective à la table incident

  Problème:
  - Le code TypeScript utilise `date_expiration_effective`
  - Mais la table incident n'a que `date_expiration_originale`

  Solution:
  - Renommer `date_expiration_originale` en `date_expiration_effective`
  - OU ajouter `date_expiration_effective` comme colonne calculée
*/

-- Option 1: Renommer la colonne (plus simple et propre)
DO $$
BEGIN
  -- Vérifier si date_expiration_originale existe et date_expiration_effective n'existe pas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident' AND column_name = 'date_expiration_originale'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident' AND column_name = 'date_expiration_effective'
  ) THEN
    ALTER TABLE incident RENAME COLUMN date_expiration_originale TO date_expiration_effective;
    RAISE NOTICE 'Colonne date_expiration_originale renommée en date_expiration_effective';
  END IF;
END $$;

-- Vérifier que ça a fonctionné
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'incident'
  AND column_name LIKE '%expiration%'
ORDER BY column_name;
