/*
  # Fix RLS Policies for Contrat Table

  1. Purpose
    - Allow anonymous users to update contracts (for linking medical certificate)
    - Allow authenticated users full access to contracts
    - Allow public read access to contracts (for employee validation panel)

  2. Important Notes
    - This allows the upload process to link the medical certificate to the contract
    - Employees need to update the contract's certificat_medical_id field
    - Without these policies, the certificate linking will fail
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Allow anonymous contrat updates" ON contrat;
DROP POLICY IF EXISTS "Allow public contrat reads" ON contrat;

-- CRITICAL: Allow anonymous users to update contracts (to link medical certificate)
CREATE POLICY "Allow anonymous contrat updates"
ON contrat
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow public to read contracts (for employee validation panel)
CREATE POLICY "Allow public contrat reads"
ON contrat
FOR SELECT
TO public
USING (true);
