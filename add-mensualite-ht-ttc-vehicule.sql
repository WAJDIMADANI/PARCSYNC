/*
  # Ajout des colonnes mensualité HT et TTC

  1. Modifications
    - Ajoute la colonne `mensualite_ht` (numeric) dans la table `vehicule`
    - Ajoute la colonne `mensualite_ttc` (numeric) dans la table `vehicule`
    - Supprime l'ancienne colonne `mensualite` si elle existe

  2. Notes
    - Les mensualités sont maintenant divisées en HT et TTC
    - La TVA est calculée automatiquement (20%) dans l'interface
*/

-- Ajouter les nouvelles colonnes
DO $$
BEGIN
  -- Ajouter mensualite_ht si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicule' AND column_name = 'mensualite_ht'
  ) THEN
    ALTER TABLE vehicule ADD COLUMN mensualite_ht numeric;
  END IF;

  -- Ajouter mensualite_ttc si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicule' AND column_name = 'mensualite_ttc'
  ) THEN
    ALTER TABLE vehicule ADD COLUMN mensualite_ttc numeric;
  END IF;

  -- Si l'ancienne colonne mensualite existe, migrer les données vers mensualite_ttc
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicule' AND column_name = 'mensualite'
  ) THEN
    -- Copier les valeurs de mensualite vers mensualite_ttc
    UPDATE vehicule
    SET mensualite_ttc = mensualite
    WHERE mensualite IS NOT NULL AND mensualite_ttc IS NULL;

    -- Calculer mensualite_ht (en divisant par 1.2 pour avoir le HT depuis le TTC)
    UPDATE vehicule
    SET mensualite_ht = ROUND(mensualite_ttc / 1.2, 2)
    WHERE mensualite_ttc IS NOT NULL AND mensualite_ht IS NULL;
  END IF;
END $$;
