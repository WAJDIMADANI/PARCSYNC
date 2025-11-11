/*
  # Allow Anonymous Medical Certificate Upload

  1. Overview
    - This migration enables anonymous employees to upload their medical certificate
    - Works like /apply and /onboarding pages - no authentication required
    - Employee receives email with link containing contract ID

  2. Changes
    - Ensure anonymous users can SELECT contracts (to verify link)
    - Ensure anonymous users can INSERT into document table (to save certificate info)
    - Ensure anonymous users can UPDATE contracts (to link certificate)
    - Ensure anonymous users can upload to storage bucket 'documents'
    - Ensure anonymous users can SELECT from profil (to display employee name)

  3. Security
    - Access is limited to specific operations only
    - Storage bucket has 10MB file size limit
    - Only PDF and image files are allowed
    - All policies use 'anon' role (anonymous users)
*/

-- =====================================================
-- TABLE POLICIES
-- =====================================================

-- Allow anonymous users to view contracts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contrat'
    AND policyname = 'Anonymous can view contracts'
  ) THEN
    CREATE POLICY "Anonymous can view contracts"
      ON contrat FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Allow anonymous users to update contracts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contrat'
    AND policyname = 'Anonymous can update contracts'
  ) THEN
    CREATE POLICY "Anonymous can update contracts"
      ON contrat FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anonymous users to insert documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'document'
    AND policyname = 'Anonymous can insert documents'
  ) THEN
    CREATE POLICY "Anonymous can insert documents"
      ON document FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anonymous users to view documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'document'
    AND policyname = 'Anonymous can view documents'
  ) THEN
    CREATE POLICY "Anonymous can view documents"
      ON document FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Allow anonymous users to view profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profil'
    AND policyname = 'Anonymous can view profiles'
  ) THEN
    CREATE POLICY "Anonymous can view profiles"
      ON profil FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Ensure documents bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;

-- CRITICAL: Allow anonymous users to upload files
CREATE POLICY "Allow anonymous uploads to documents"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to upload files
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
