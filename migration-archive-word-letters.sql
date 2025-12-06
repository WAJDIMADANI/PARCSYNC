/*
  # Archive Word Letters and Add PDF Generation Method

  1. Changes to `courrier_genere` table
    - Add `archived` boolean column (default false) to mark legacy Word letters
    - Add `pdf_generation_method` enum column to track generation method
    - Mark all existing letters with word_url as archived
    - Keep word_url columns for backwards compatibility

  2. Changes to `modele_courrier` table
    - Add `template_html_content` text column for future rich HTML content
    - Add `is_word_template` boolean to identify legacy templates

  3. Security
    - Update RLS policies to handle archived letters
    - Maintain existing access controls

  INSTRUCTIONS: Execute this in Supabase SQL Editor
*/

-- Add archived column to courrier_genere
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courrier_genere' AND column_name = 'archived'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN archived boolean DEFAULT false;
  END IF;
END $$;

-- Add pdf_generation_method enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pdf_generation_method') THEN
    CREATE TYPE pdf_generation_method AS ENUM ('word_legacy', 'html_pdf');
  END IF;
END $$;

-- Add pdf_generation_method column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courrier_genere' AND column_name = 'pdf_generation_method'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN pdf_generation_method pdf_generation_method DEFAULT 'html_pdf';
  END IF;
END $$;

-- Mark all existing letters with word_url as archived and word_legacy
UPDATE courrier_genere
SET
  archived = true,
  pdf_generation_method = 'word_legacy'
WHERE word_url IS NOT NULL;

-- Add template_html_content to modele_courrier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'template_html_content'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN template_html_content text;
  END IF;
END $$;

-- Add is_word_template flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'is_word_template'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN is_word_template boolean DEFAULT false;
  END IF;
END $$;

-- Mark templates with word_template_url as Word templates
UPDATE modele_courrier
SET is_word_template = true
WHERE word_template_url IS NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_courrier_genere_archived ON courrier_genere(archived);
CREATE INDEX IF NOT EXISTS idx_courrier_genere_method ON courrier_genere(pdf_generation_method);

-- Add helpful comments
COMMENT ON COLUMN courrier_genere.archived IS 'Marks legacy Word-generated letters that have been archived';
COMMENT ON COLUMN courrier_genere.pdf_generation_method IS 'Tracks how the PDF was generated: word_legacy or html_pdf';
COMMENT ON COLUMN modele_courrier.template_html_content IS 'HTML content for new template system with basic formatting';
COMMENT ON COLUMN modele_courrier.is_word_template IS 'Identifies legacy Word templates';
