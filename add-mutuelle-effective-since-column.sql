/*
  # Ajout colonne mutuelle_effective_since à la table profil

  ## Description
    Ajoute une colonne pour stocker la date d'effectivité de la mutuelle pour chaque salarié

  ## Changements
    1. Ajout de la colonne mutuelle_effective_since (date) à la table profil
    2. Cette colonne sera utilisée dans la vue v_compta_mutuelle

  ## Notes
    - La colonne est nullable car tous les salariés n'ont pas forcément une mutuelle
    - Pas de valeur par défaut
*/

-- Ajouter la colonne mutuelle_effective_since si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profil'
      AND column_name = 'mutuelle_effective_since'
  ) THEN
    ALTER TABLE profil
    ADD COLUMN mutuelle_effective_since date;

    RAISE NOTICE 'Colonne mutuelle_effective_since ajoutée à la table profil';
  ELSE
    RAISE NOTICE 'Colonne mutuelle_effective_since existe déjà dans la table profil';
  END IF;
END $$;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN profil.mutuelle_effective_since IS 'Date à partir de laquelle la mutuelle est effective pour le salarié';

-- Vérifier que la colonne a bien été ajoutée
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profil'
  AND column_name = 'mutuelle_effective_since';
