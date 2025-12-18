/*
  # Système de demandes externes

  1. Nouvelle table
    - `demandes_externes`
      - `id` (uuid, primary key)
      - `profil_id` (uuid, foreign key vers profil)
      - `pole_id` (uuid, foreign key vers poles)
      - `sujet` (text)
      - `contenu` (text)
      - `fichiers` (jsonb) - array de {path, name, size}
      - `statut` (text) - 'nouveau', 'en_cours', 'traite', 'refuse'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage bucket
    - Créer bucket 'demandes-externes'
    - Public access pour read
    - Policies pour anonymous insert

  3. Security
    - Enable RLS sur demandes_externes
    - Policy pour anonymous INSERT
    - Policy pour authenticated SELECT/UPDATE (selon pôle)
*/

-- Créer la table demandes_externes
CREATE TABLE IF NOT EXISTS demandes_externes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid REFERENCES profil(id) ON DELETE CASCADE,
  pole_id uuid REFERENCES poles(id) ON DELETE SET NULL,
  sujet text NOT NULL,
  contenu text NOT NULL,
  fichiers jsonb DEFAULT '[]'::jsonb,
  statut text DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_cours', 'traite', 'refuse')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE demandes_externes ENABLE ROW LEVEL SECURITY;

-- Policy pour anonymous INSERT (permettre aux chauffeurs de créer des demandes)
CREATE POLICY "Anonymous users can create demandes"
  ON demandes_externes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy pour authenticated SELECT (voir les demandes de leur pôle)
CREATE POLICY "Users can view demandes from their pole"
  ON demandes_externes
  FOR SELECT
  TO authenticated
  USING (
    pole_id IN (
      SELECT pole_id
      FROM app_utilisateur
      WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE auth_user_id = auth.uid()
      AND pole_id IS NULL  -- Admins can see all
    )
  );

-- Policy pour authenticated UPDATE (mettre à jour le statut)
CREATE POLICY "Users can update demandes from their pole"
  ON demandes_externes
  FOR UPDATE
  TO authenticated
  USING (
    pole_id IN (
      SELECT pole_id
      FROM app_utilisateur
      WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE auth_user_id = auth.uid()
      AND pole_id IS NULL  -- Admins can update all
    )
  )
  WITH CHECK (
    pole_id IN (
      SELECT pole_id
      FROM app_utilisateur
      WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE auth_user_id = auth.uid()
      AND pole_id IS NULL
    )
  );

-- Policy pour anonymous SELECT profil (recherche par matricule)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profil'
    AND policyname = 'Anonymous can search by matricule'
  ) THEN
    CREATE POLICY "Anonymous can search by matricule"
      ON profil
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Créer storage bucket pour demandes-externes
INSERT INTO storage.buckets (id, name, public)
VALUES ('demandes-externes', 'demandes-externes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy pour anonymous upload
CREATE POLICY "Anonymous can upload demande files"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'demandes-externes');

-- Storage policy pour public read
CREATE POLICY "Public can view demande files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'demandes-externes');

-- Storage policy pour authenticated delete
CREATE POLICY "Authenticated users can delete demande files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'demandes-externes');

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_demandes_externes_pole ON demandes_externes(pole_id);
CREATE INDEX IF NOT EXISTS idx_demandes_externes_profil ON demandes_externes(profil_id);
CREATE INDEX IF NOT EXISTS idx_demandes_externes_statut ON demandes_externes(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_externes_created ON demandes_externes(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_demandes_externes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_demandes_externes_updated_at ON demandes_externes;
CREATE TRIGGER update_demandes_externes_updated_at
  BEFORE UPDATE ON demandes_externes
  FOR EACH ROW
  EXECUTE FUNCTION update_demandes_externes_updated_at();
