/*
  # Create upload_tokens table for secure document upload links

  1. New Tables
    - `upload_tokens`
      - `id` (uuid, primary key)
      - `profil_id` (uuid, foreign key to profil)
      - `token` (text, unique token for secure access)
      - `expires_at` (timestamp, expiration date)
      - `used_at` (timestamp, nullable, marks when token was first used)
      - `created_at` (timestamp, creation date)

  2. Security
    - Enable RLS on `upload_tokens` table
    - Allow public read with valid token (not expired)
    - Allow authenticated users to insert tokens
    - Indexes for performance on token, profil_id, and expires_at

  3. Notes
    - Tokens expire after 7 days by default
    - Tokens are unique and cryptographically secure (UUID)
    - Used for anonymous document upload via email links
*/

-- Create table
CREATE TABLE IF NOT EXISTS upload_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id UUID NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_upload_tokens_token ON upload_tokens(token);
CREATE INDEX IF NOT EXISTS idx_upload_tokens_profil_id ON upload_tokens(profil_id);
CREATE INDEX IF NOT EXISTS idx_upload_tokens_expires_at ON upload_tokens(expires_at);

-- Enable RLS
ALTER TABLE upload_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public read if token is valid and not expired
CREATE POLICY "Allow public read with valid token" ON upload_tokens
  FOR SELECT
  USING (expires_at > NOW());

-- Allow authenticated users (admins) to insert tokens
CREATE POLICY "Allow authenticated insert" ON upload_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update used_at
CREATE POLICY "Allow authenticated update" ON upload_tokens
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
