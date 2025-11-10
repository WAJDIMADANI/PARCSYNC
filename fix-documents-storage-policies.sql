/*
  # Fix Storage Policies for Documents Bucket

  1. Storage Bucket
    - Ensure 'documents' bucket exists with proper settings
    - Set file size limit to 10MB
    - Allow PDF and image files

  2. Security Policies
    - Allow authenticated users to upload files
    - Allow ANONYMOUS users to upload files (critical for employee uploads)
    - Allow public read access for all documents
    - Allow authenticated users to update/delete their files

  3. Important Notes
    - This fixes the "Erreur upload" issue when employees upload medical certificates
    - The bucket needs to be public for easy access to documents
    - Anonymous uploads are required because employees are not authenticated
*/

-- Create or update the documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;

-- CRITICAL: Allow anonymous users to upload files (for employee medical certificate uploads)
CREATE POLICY "Allow anonymous uploads to documents"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to upload files to documents bucket
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow public read access to documents
CREATE POLICY "Allow public reads from documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to update documents
CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to delete documents
CREATE POLICY "Allow authenticated deletes from documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
