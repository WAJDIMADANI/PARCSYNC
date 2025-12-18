/*
  # Fix RLS pour demandes_externes - Permettre l'accès anonyme

  Ce script corrige le problème RLS qui empêche les utilisateurs anonymes
  de créer des demandes externes.
*/

-- 1. Vérifier si la table demandes_externes existe, sinon la créer
CREATE TABLE IF NOT EXISTS demandes_externes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid REFERENCES profil(id) ON DELETE CASCADE NOT NULL,
  pole_id uuid REFERENCES poles(id) ON DELETE CASCADE NOT NULL,
  sujet text NOT NULL,
  contenu text NOT NULL,
  fichiers jsonb DEFAULT '[]'::jsonb,
  statut text DEFAULT 'nouveau' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_demandes_externes_profil_id ON demandes_externes(profil_id);
CREATE INDEX IF NOT EXISTS idx_demandes_externes_pole_id ON demandes_externes(pole_id);
CREATE INDEX IF NOT EXISTS idx_demandes_externes_statut ON demandes_externes(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_externes_created_at ON demandes_externes(created_at DESC);

-- Activer RLS
ALTER TABLE demandes_externes ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les policies existantes pour repartir à zéro
DROP POLICY IF EXISTS "Anonyme peut créer des demandes externes" ON demandes_externes;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent lire les demandes" ON demandes_externes;
DROP POLICY IF EXISTS "Admins peuvent lire les demandes" ON demandes_externes;
DROP POLICY IF EXISTS "Public can insert demandes" ON demandes_externes;
DROP POLICY IF EXISTS "Authenticated can read demandes" ON demandes_externes;

-- 3. Créer les policies correctes

-- Permettre à TOUT LE MONDE (anon et authenticated) d'insérer
CREATE POLICY "Anyone can create demandes externes"
  ON demandes_externes
  FOR INSERT
  WITH CHECK (true);

-- Permettre aux utilisateurs authentifiés de lire toutes les demandes
CREATE POLICY "Authenticated users can read all demandes"
  ON demandes_externes
  FOR SELECT
  TO authenticated
  USING (true);

-- Permettre aux utilisateurs authentifiés de mettre à jour les demandes
CREATE POLICY "Authenticated users can update demandes"
  ON demandes_externes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Policies pour les autres tables nécessaires

-- Profil: SELECT pour recherche par matricule
DROP POLICY IF EXISTS "Anonyme peut rechercher profil par matricule" ON profil;
DROP POLICY IF EXISTS "Public can read profil" ON profil;
CREATE POLICY "Public can read profil for search"
  ON profil
  FOR SELECT
  USING (true);

-- Poles: SELECT pour lister les pôles actifs
DROP POLICY IF EXISTS "Anonyme peut lire les pôles actifs" ON poles;
DROP POLICY IF EXISTS "Public can read active poles" ON poles;
CREATE POLICY "Public can read active poles"
  ON poles
  FOR SELECT
  USING (actif = true);

-- App utilisateur: SELECT pour notifier les utilisateurs
DROP POLICY IF EXISTS "Anonyme peut lire les utilisateurs pour notifications" ON app_utilisateur;
DROP POLICY IF EXISTS "Public can read active users" ON app_utilisateur;
CREATE POLICY "Public can read active users for notifications"
  ON app_utilisateur
  FOR SELECT
  USING (actif = true);

-- 5. Table inbox (si elle existe déjà)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inbox') THEN
    -- Supprimer les anciennes policies
    DROP POLICY IF EXISTS "Anonyme peut créer des notifications inbox" ON inbox;
    DROP POLICY IF EXISTS "Public can insert inbox" ON inbox;

    -- Créer la nouvelle policy
    CREATE POLICY "Anyone can create inbox notifications"
      ON inbox
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 6. Storage bucket pour demandes-externes
INSERT INTO storage.buckets (id, name, public)
VALUES ('demandes-externes', 'demandes-externes', false)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les anciennes policies storage
DROP POLICY IF EXISTS "Anonyme peut uploader dans demandes-externes" ON storage.objects;
DROP POLICY IF EXISTS "Admins peuvent lire demandes-externes" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload to demandes-externes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read demandes-externes" ON storage.objects;

-- Permettre à tout le monde d'uploader
CREATE POLICY "Anyone can upload to demandes-externes"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'demandes-externes');

-- Permettre aux authentifiés de lire
CREATE POLICY "Authenticated can read from demandes-externes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'demandes-externes');
