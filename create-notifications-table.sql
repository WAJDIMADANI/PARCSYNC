/*
  # Create notifications table for document expirations

  1. New Tables
    - `notification`
      - `id` (uuid, primary key)
      - `type` (text) - Type of notification: titre_sejour, visite_medicale, permis_conduire, contrat_cdd
      - `profil_id` (uuid) - Reference to employee
      - `date_echeance` (date) - Expiration date of document
      - `date_notification` (date) - Date when notification was created
      - `statut` (text) - Status: active, email_envoye, resolue, ignoree
      - `email_envoye_at` (timestamptz) - When reminder email was sent
      - `email_envoye_par` (uuid) - Who sent the email
      - `metadata` (jsonb) - Additional information
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on notification table
    - Add policies for authenticated users to read/write notifications

  3. Indexes
    - Index on profil_id for fast lookups
    - Index on type for filtering
    - Index on statut for filtering
    - Index on date_notification for sorting
*/

-- Create notification table
CREATE TABLE IF NOT EXISTS notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('titre_sejour', 'visite_medicale', 'permis_conduire', 'contrat_cdd')),
  profil_id uuid REFERENCES profil(id) ON DELETE CASCADE,
  date_echeance date NOT NULL,
  date_notification date NOT NULL,
  statut text DEFAULT 'active' CHECK (statut IN ('active', 'email_envoye', 'resolue', 'ignoree')),
  email_envoye_at timestamptz,
  email_envoye_par uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_profil ON notification(profil_id);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type);
CREATE INDEX IF NOT EXISTS idx_notification_statut ON notification(statut);
CREATE INDEX IF NOT EXISTS idx_notification_date ON notification(date_notification);

-- Enable RLS
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users to read all notifications
CREATE POLICY "Allow read for all authenticated users" ON notification
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert notifications
CREATE POLICY "Allow insert for all authenticated users" ON notification
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update notifications
CREATE POLICY "Allow update for all authenticated users" ON notification
  FOR UPDATE TO authenticated USING (true);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
CREATE TRIGGER notification_updated_at
  BEFORE UPDATE ON notification
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();
