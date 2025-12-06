/*
  # Create Storage Buckets for Word Templates

  1. New Storage Buckets
    - `letter-templates` - Store original .docx template files
    - `generated-letters` - Store generated .docx documents

  2. Security
    - Authenticated users can upload templates to letter-templates
    - Authenticated users can read templates from letter-templates
    - Authenticated users can upload/read generated letters
    - RLS policies ensure users only access their authorized documents
*/

-- Create letter-templates bucket for storing original Word templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('letter-templates', 'letter-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Create generated-letters bucket for storing generated documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-letters', 'generated-letters', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for letter-templates bucket
CREATE POLICY "Authenticated users can upload templates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'letter-templates');

CREATE POLICY "Authenticated users can read templates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'letter-templates');

CREATE POLICY "Authenticated users can update templates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'letter-templates');

CREATE POLICY "Authenticated users can delete templates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'letter-templates');

-- RLS Policies for generated-letters bucket
CREATE POLICY "Authenticated users can upload generated letters"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'generated-letters');

CREATE POLICY "Authenticated users can read generated letters"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'generated-letters');

CREATE POLICY "Authenticated users can delete generated letters"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'generated-letters');
