/*
  # Correction de la structure de la table document

  Ce fichier corrige la structure de la table `document` pour correspondre au code.

  Structure finale attendue:
  - id (uuid, primary key)
  - owner_type (text) - type de propriétaire: 'candidat' ou 'profil'
  - owner_id (uuid) - id du propriétaire
  - type_document (text) - type de document
  - file_url (text) - URL du fichier dans le storage
  - file_name (text) - nom original du fichier
  - date_emission (date, nullable)
  - date_expiration (date, nullable)
  - statut (text, nullable)
  - created_at (timestamptz)

  Cette migration est IDEMPOTENTE et peut être exécutée plusieurs fois.
*/

DO $$
BEGIN
  -- Étape 1: S'assurer que owner_type existe (renommer si nécessaire)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'proprietaire_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'owner_type'
  ) THEN
    ALTER TABLE document RENAME COLUMN proprietaire_type TO owner_type;
    RAISE NOTICE 'Colonne proprietaire_type renommée en owner_type';
  END IF;

  -- Étape 2: S'assurer que owner_id existe (renommer si nécessaire)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'proprietaire_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE document RENAME COLUMN proprietaire_id TO owner_id;
    RAISE NOTICE 'Colonne proprietaire_id renommée en owner_id';
  END IF;

  -- Étape 3: S'assurer que type_document existe (renommer si nécessaire)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'type_document'
  ) THEN
    ALTER TABLE document RENAME COLUMN type TO type_document;
    RAISE NOTICE 'Colonne type renommée en type_document';
  END IF;

  -- Étape 4: S'assurer que file_url existe (renommer si nécessaire)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'fichier_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE document RENAME COLUMN fichier_url TO file_url;
    RAISE NOTICE 'Colonne fichier_url renommée en file_url';
  END IF;

  -- Étape 5: Ajouter file_name si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE document ADD COLUMN file_name text;
    RAISE NOTICE 'Colonne file_name ajoutée';
  END IF;

  -- Étape 6: S'assurer que date_emission existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'date_emission'
  ) THEN
    ALTER TABLE document ADD COLUMN date_emission date;
    RAISE NOTICE 'Colonne date_emission ajoutée';
  END IF;

  -- Étape 7: S'assurer que date_expiration existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'date_expiration'
  ) THEN
    ALTER TABLE document ADD COLUMN date_expiration date;
    RAISE NOTICE 'Colonne date_expiration ajoutée';
  END IF;

  -- Étape 8: S'assurer que statut existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document' AND column_name = 'statut'
  ) THEN
    ALTER TABLE document ADD COLUMN statut text;
    RAISE NOTICE 'Colonne statut ajoutée';
  END IF;

END $$;

-- Mettre à jour les index
DROP INDEX IF EXISTS idx_document_proprietaire;
CREATE INDEX IF NOT EXISTS idx_document_owner ON document(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_document_type ON document(type_document);

-- Vérifier la structure finale
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'document'
ORDER BY ordinal_position;
