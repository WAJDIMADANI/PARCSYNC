/*
  # Add Word Template Support

  1. Modifications to modele_courrier table
    - Add `fichier_word_url` (text) - URL to the original .docx template file in storage
    - Add `utilise_template_word` (boolean) - Flag to identify Word-based templates vs text templates

  2. Modifications to courrier_genere table
    - Add `fichier_word_genere_url` (text) - URL to the generated .docx document in storage

  3. Notes
    - The `contenu` field in both tables will continue to be used for text preview
    - All existing templates will have `utilise_template_word` set to false by default
    - Word templates will preserve all formatting (logos, tables, styles, headers, footers)
*/

-- Add columns to modele_courrier table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'fichier_word_url'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN fichier_word_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'utilise_template_word'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN utilise_template_word boolean DEFAULT false;
  END IF;
END $$;

-- Add column to courrier_genere table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courrier_genere' AND column_name = 'fichier_word_genere_url'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN fichier_word_genere_url text;
  END IF;
END $$;
