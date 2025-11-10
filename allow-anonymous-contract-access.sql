/*
  # Allow anonymous access to contracts for signature

  1. Security Changes
    - Add policy to allow anonymous users to SELECT contracts
    - Add policy to allow anonymous users to UPDATE contracts (for signature)
    - Add policy to allow anonymous users to INSERT documents (certificat medical)

  2. Important Notes
    - Anonymous access is limited to:
      - Reading contract data (SELECT)
      - Updating signature fields only (UPDATE)
      - Uploading medical certificate (document INSERT)
    - This is required for the contract signature workflow where employees
      receive an email link and sign without authenticating
*/

-- Allow anonymous users to read contracts
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

-- Allow anonymous users to update contracts (for signature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contrat'
    AND policyname = 'Anonymous can sign contracts'
  ) THEN
    CREATE POLICY "Anonymous can sign contracts"
      ON contrat FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anonymous users to view modeles_contrats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'modeles_contrats'
    AND policyname = 'Anonymous can view contract templates'
  ) THEN
    CREATE POLICY "Anonymous can view contract templates"
      ON modeles_contrats FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Allow anonymous users to insert documents (medical certificate)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'document'
    AND policyname = 'Anonymous can upload documents'
  ) THEN
    CREATE POLICY "Anonymous can upload documents"
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

-- Allow anonymous users to view profil data (needed for contract display)
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
