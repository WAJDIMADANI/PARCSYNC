/*
  # Migration: Ajouter colonnes V2 pour modele_courrier

  1. Nouvelles Colonnes
    - fichier_word_url: URL du fichier Word dans Storage
    - variables_detectees: Tableau des variables trouvées dans le document
    - variables_optionnelles: Variables non requises
    - variables_requises: Variables obligatoires
    - ordre_affichage: Pour ordonner les modèles
    - description: Description du modèle (peut être NULL)

  2. Modifications
    - Rendre certaines colonnes optionnelles (sujet, contenu)
    - S'assurer que actif a un DEFAULT et accepte NULL temporairement

  3. Sécurité
    - Conserver toutes les policies RLS existantes
*/

-- Ajouter fichier_word_url si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'fichier_word_url'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN fichier_word_url TEXT;
  END IF;
END $$;

-- Ajouter variables_detectees si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'variables_detectees'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN variables_detectees TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Ajouter variables_optionnelles si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'variables_optionnelles'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN variables_optionnelles TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Ajouter variables_requises si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'variables_requises'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN variables_requises TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Ajouter ordre_affichage si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'ordre_affichage'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN ordre_affichage INTEGER DEFAULT 0;
  END IF;
END $$;

-- Modifier actif pour avoir DEFAULT et permettre NULL temporairement
DO $$
BEGIN
  -- Supprimer la contrainte NOT NULL si elle existe
  ALTER TABLE modele_courrier ALTER COLUMN actif DROP NOT NULL;

  -- S'assurer qu'il y a un DEFAULT
  ALTER TABLE modele_courrier ALTER COLUMN actif SET DEFAULT true;

  -- Mettre à jour les valeurs NULL existantes
  UPDATE modele_courrier SET actif = true WHERE actif IS NULL;
END $$;

-- Rendre sujet et contenu optionnels pour les templates V2 (qui utilisent fichier_word_url)
DO $$
BEGIN
  ALTER TABLE modele_courrier ALTER COLUMN sujet DROP NOT NULL;
  ALTER TABLE modele_courrier ALTER COLUMN contenu DROP NOT NULL;
END $$;

-- Ajouter index pour ordre_affichage
CREATE INDEX IF NOT EXISTS idx_modele_courrier_ordre ON modele_courrier(ordre_affichage);

COMMENT ON COLUMN modele_courrier.fichier_word_url IS 'URL du fichier Word stocké dans Storage (pour V2)';
COMMENT ON COLUMN modele_courrier.variables_detectees IS 'Variables trouvées automatiquement dans le document Word';
COMMENT ON COLUMN modele_courrier.variables_optionnelles IS 'Variables qui peuvent être vides';
COMMENT ON COLUMN modele_courrier.variables_requises IS 'Variables obligatoires à remplir';
COMMENT ON COLUMN modele_courrier.ordre_affichage IS 'Ordre d''affichage dans la liste';
