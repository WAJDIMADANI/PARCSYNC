/*
  # Migration pour harmoniser les colonnes de la table document

  Cette migration renomme les colonnes de la table document pour correspondre
  au nouveau schéma utilisé dans le code :

  Changements:
  - proprietaire_type → owner_type
  - proprietaire_id → owner_id
  - type → type_document
  - fichier_url → file_url
  - Ajoute file_name (nom du fichier)

  Cette migration est IDEMPOTENTE et peut être exécutée plusieurs fois sans problème.
*/

-- Étape 1: Renommer les colonnes si elles existent encore avec l'ancien nom
DO $$
BEGIN
  -- Renommer proprietaire_type en owner_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'proprietaire_type'
  ) THEN
    ALTER TABLE document RENAME COLUMN proprietaire_type TO owner_type;
  END IF;

  -- Renommer proprietaire_id en owner_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'proprietaire_id'
  ) THEN
    ALTER TABLE document RENAME COLUMN proprietaire_id TO owner_id;
  END IF;

  -- Renommer type en type_document
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'type_document'
  ) THEN
    ALTER TABLE document RENAME COLUMN type TO type_document;
  END IF;

  -- Renommer fichier_url en file_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'fichier_url'
  ) THEN
    ALTER TABLE document RENAME COLUMN fichier_url TO file_url;
  END IF;

  -- Ajouter file_name si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE document ADD COLUMN file_name text;
  END IF;
END $$;

-- Étape 2: Mettre à jour les index (supprimer l'ancien, créer le nouveau)
DROP INDEX IF EXISTS idx_document_proprietaire;
CREATE INDEX IF NOT EXISTS idx_document_owner ON document(owner_type, owner_id);

-- Étape 3: Vérification - afficher la structure de la table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'document'
ORDER BY ordinal_position;
