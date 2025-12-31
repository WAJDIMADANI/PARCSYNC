/*
  # Ajouter colonne updated_at à la table profil

  1. Modifications
    - Ajoute la colonne `updated_at` à la table `profil`
    - Initialise `updated_at` avec la valeur de `created_at` pour les données existantes
    - Crée une fonction trigger pour mettre à jour automatiquement `updated_at`
    - Applique le trigger sur la table `profil`

  2. Comportement
    - `updated_at` sera automatiquement mis à jour à chaque modification d'un profil
    - Permet de trier les employés par dernière modification
*/

-- Ajouter la colonne updated_at si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profil ADD COLUMN updated_at timestamptz DEFAULT now();

    -- Initialiser updated_at avec created_at pour les données existantes
    UPDATE profil SET updated_at = created_at WHERE updated_at IS NULL;
  END IF;
END $$;

-- Créer la fonction trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS update_profil_updated_at ON profil;

-- Créer le trigger sur la table profil
CREATE TRIGGER update_profil_updated_at
  BEFORE UPDATE ON profil
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
