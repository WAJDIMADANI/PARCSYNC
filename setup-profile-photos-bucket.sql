/*
  # Configuration du bucket Storage pour les photos de profil

  1. Création du bucket
    - Bucket public pour les photos de profil
    - Taille max des fichiers : 5MB
    - Types autorisés : image/jpeg, image/png, image/webp

  2. Politiques RLS
    - Les utilisateurs authentifiés peuvent uploader leur propre photo
    - Les photos sont publiquement accessibles en lecture
    - Seul le propriétaire peut supprimer sa photo
*/

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880, -- 5MB en bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Politique : Les utilisateurs authentifiés peuvent uploader dans leur propre dossier
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
CREATE POLICY "Users can upload their own profile photo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    -- Le path doit commencer par l'ID du profil de l'utilisateur
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM profil WHERE auth_user_id = auth.uid()
    )
  );

-- Politique : Les utilisateurs authentifiés peuvent mettre à jour leur propre photo
DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
CREATE POLICY "Users can update their own profile photo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM profil WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM profil WHERE auth_user_id = auth.uid()
    )
  );

-- Politique : Les utilisateurs authentifiés peuvent supprimer leur propre photo
DROP POLICY IF EXISTS "Users can delete their own profile photo" ON storage.objects;
CREATE POLICY "Users can delete their own profile photo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM profil WHERE auth_user_id = auth.uid()
    )
  );

-- Politique : Tout le monde peut voir les photos (bucket public)
DROP POLICY IF EXISTS "Public access to profile photos" ON storage.objects;
CREATE POLICY "Public access to profile photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-photos');

-- Vérifier que la colonne photo_url existe dans la table profil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE profil ADD COLUMN photo_url text;
  END IF;
END $$;
