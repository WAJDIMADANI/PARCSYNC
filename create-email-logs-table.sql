/*
  # Create email_logs table for email tracking

  1. New Tables
    - `email_logs`
      - `id` (uuid, primary key)
      - `profil_id` (uuid, foreign key to profil)
      - `email_type` (text, type of email sent)
      - `recipient_email` (text, recipient email address)
      - `documents_list` (jsonb, list of missing documents)
      - `sent_at` (timestamp, when email was sent)
      - `brevo_message_id` (text, Brevo message ID)
      - `token_id` (uuid, nullable, foreign key to upload_tokens)

  2. Security
    - Enable RLS on `email_logs` table
    - Allow authenticated users to read and insert logs
    - Indexes for performance on profil_id, email_type, and sent_at

  3. Notes
    - Used for tracking all emails sent for missing documents
    - Links to upload_tokens for traceability
    - documents_list stores JSON array of missing document types
*/

-- Create table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id UUID NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  documents_list JSONB NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  brevo_message_id TEXT NULL,
  token_id UUID REFERENCES upload_tokens(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_profil_id ON email_logs(profil_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read logs
CREATE POLICY "Allow authenticated read" ON email_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert logs
CREATE POLICY "Allow authenticated insert" ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
