/*
  # Ajout du pays de naissance

  1. Modifications
    - Ajoute la colonne `pays_naissance` à la table `candidat`
      - Type: text
      - Stocke le pays de naissance du candidat
      - Utilisé avec une liste déroulante dans les formulaires

  2. Notes
    - Aucune modification des colonnes existantes
    - Compatible avec tous les formulaires existants
*/

-- Ajouter le pays de naissance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'pays_naissance'
  ) THEN
    ALTER TABLE candidat ADD COLUMN pays_naissance text;
  END IF;
END $$;
