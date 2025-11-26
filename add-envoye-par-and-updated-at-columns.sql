/*
  # Ajouter les colonnes manquantes à courrier_genere

  1. Changements
    - Ajouter `envoye_par` (uuid nullable) pour tracker qui a envoyé le courrier
    - Ajouter `updated_at` (timestamptz) pour tracker les modifications
    - Créer une foreign key vers app_utilisateur(id)
    - Créer des index pour optimiser les requêtes

  2. Notes
    - Migration additive seulement - pas de perte de données
    - Les colonnes sont nullables pour les données existantes
    - Les index améliorent les performances des requêtes
*/

-- Ajouter la colonne envoye_par si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courrier_genere' AND column_name = 'envoye_par'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN envoye_par UUID REFERENCES app_utilisateur(id);
  END IF;
END $$;

-- Ajouter la colonne updated_at si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courrier_genere' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Créer des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_courrier_genere_envoye_par ON courrier_genere(envoye_par);
CREATE INDEX IF NOT EXISTS idx_courrier_genere_updated_at ON courrier_genere(updated_at DESC);

-- Créer une fonction trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_courrier_genere_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger si il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_courrier_genere_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_courrier_genere_updated_at
      BEFORE UPDATE ON courrier_genere
      FOR EACH ROW
      EXECUTE FUNCTION update_courrier_genere_updated_at();
  END IF;
END $$;
