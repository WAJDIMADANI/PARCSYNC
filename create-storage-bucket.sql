/*
  # Create Storage Bucket for Candidatures

  1. New Storage Bucket
    - Creates a public bucket named 'candidatures'
    - Used to store candidate files (CVs, cover letters, ID documents)

  2. Security
    - Public bucket for easy file access
    - Files organized in subdirectories: cv/, lettres/, cartes-identite/
*/

-- Create the storage bucket for candidatures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidatures',
  'candidatures',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated uploads'
  ) THEN
    CREATE POLICY "Allow authenticated uploads"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'candidatures');
  END IF;
END $$;

-- Create policy to allow public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow public reads'
  ) THEN
    CREATE POLICY "Allow public reads"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'candidatures');
  END IF;
END $$;

-- Create policy to allow authenticated users to update their files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated updates'
  ) THEN
    CREATE POLICY "Allow authenticated updates"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'candidatures')
    WITH CHECK (bucket_id = 'candidatures');
  END IF;
END $$;

-- Create policy to allow authenticated users to delete their files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated deletes'
  ) THEN
    CREATE POLICY "Allow authenticated deletes"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'candidatures');
  END IF;
END $$;
