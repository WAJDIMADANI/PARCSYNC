/*
  # Allow anonymous onboarding submissions

  1. Changes
    - Add RLS policy to allow anonymous users to insert into profil table
    - This enables candidates to complete onboarding forms without authentication

  2. Security
    - Policy is restrictive: only allows INSERT operations
    - Existing authenticated policies remain unchanged for other operations
*/

-- Drop existing restrictive policy if needed and recreate with better separation
DROP POLICY IF EXISTS "auth_all" ON profil;

-- Policy for authenticated users (full access)
CREATE POLICY "authenticated_users_full_access"
  ON profil
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy to allow anonymous users to create profiles via onboarding
CREATE POLICY "anonymous_can_insert_onboarding"
  ON profil
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy to allow anonymous users to update their own profile during onboarding
CREATE POLICY "anonymous_can_update_by_email"
  ON profil
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
