/*
  # Fix RLS Policies for Document Table

  1. Purpose
    - Allow anonymous users to insert documents (for employee medical certificate uploads)
    - Allow authenticated users full access to documents
    - Allow public read access to documents

  2. Important Notes
    - This is CRITICAL for allowing employees to upload medical certificates
    - Employees access the validation panel anonymously (no login required)
    - Without these policies, uploads will fail with "Supabase request failed"
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Allow anonymous document inserts" ON document;
DROP POLICY IF EXISTS "Allow authenticated document inserts" ON document;
DROP POLICY IF EXISTS "Allow authenticated document reads" ON document;
DROP POLICY IF EXISTS "Allow public document reads" ON document;
DROP POLICY IF EXISTS "Allow authenticated document updates" ON document;
DROP POLICY IF EXISTS "Allow authenticated document deletes" ON document;

-- CRITICAL: Allow anonymous users to insert documents (for employee uploads)
CREATE POLICY "Allow anonymous document inserts"
ON document
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to insert documents
CREATE POLICY "Allow authenticated document inserts"
ON document
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow public to read all documents
CREATE POLICY "Allow public document reads"
ON document
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to update documents
CREATE POLICY "Allow authenticated document updates"
ON document
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete documents
CREATE POLICY "Allow authenticated document deletes"
ON document
FOR DELETE
TO authenticated
USING (true);
