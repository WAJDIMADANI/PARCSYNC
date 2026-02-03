/*
  # Tables CRM SMS

  1. Nouvelles tables
    - crm_sms_batches : Enregistre les envois SMS en masse
    - crm_sms_recipients : Destinataires individuels par batch SMS

  2. Sécurité
    - RLS activé sur les deux tables
    - Accès restreint aux utilisateurs authentifiés
*/

-- Table des batches SMS
CREATE TABLE IF NOT EXISTS crm_sms_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES app_utilisateur(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('all', 'selected', 'sector')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'partial', 'failed')),
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  sent_at timestamptz,
  target_secteur_ids uuid[] DEFAULT NULL
);

-- Table des destinataires SMS
CREATE TABLE IF NOT EXISTS crm_sms_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES crm_sms_batches(id) ON DELETE CASCADE,
  profil_id uuid REFERENCES profil(id) ON DELETE SET NULL,
  recipient_phone text NOT NULL,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error jsonb,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Index
CREATE INDEX IF NOT EXISTS idx_crm_sms_batches_created_by ON crm_sms_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_sms_batches_created_at ON crm_sms_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_crm_sms_recipients_batch_id ON crm_sms_recipients(batch_id);
CREATE INDEX IF NOT EXISTS idx_crm_sms_recipients_profil_id ON crm_sms_recipients(profil_id);

-- RLS
ALTER TABLE crm_sms_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sms_recipients ENABLE ROW LEVEL SECURITY;

-- Policies pour crm_sms_batches
CREATE POLICY "Utilisateurs authentifiés peuvent voir batches SMS"
  ON crm_sms_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent créer batches SMS"
  ON crm_sms_batches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policies pour crm_sms_recipients
CREATE POLICY "Utilisateurs authentifiés peuvent voir recipients SMS"
  ON crm_sms_recipients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent créer recipients SMS"
  ON crm_sms_recipients FOR INSERT
  TO authenticated
  WITH CHECK (true);
