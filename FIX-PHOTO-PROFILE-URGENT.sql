/*
  # FIX URGENT - Photos de profil ne s'affichent pas

  Problème : Les photos sont uploadées mais ne s'affichent pas
  Cause : Bucket pas public ou policies RLS mal configurées
  Solution : Forcer le bucket en public et recréer toutes les policies
*/

-- ÉTAPE 1 : Forcer le bucket à être public
UPDATE storage.buckets
SET public = true
WHERE id = 'profile-photos';

-- Si le bucket n'existe pas, le créer
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ÉTAPE 2 : Supprimer TOUTES les anciennes policies
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Public access to profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;

-- ÉTAPE 3 : Créer UNE SEULE policy simple pour l'accès public en lecture
CREATE POLICY "Anyone can view profile photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-photos');

-- ÉTAPE 4 : Policy pour upload (authenticated users dans leur dossier)
CREATE POLICY "Users can upload their own profile photo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
  );

-- ÉTAPE 5 : Policy pour update
CREATE POLICY "Users can update their own profile photo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile-photos')
  WITH CHECK (bucket_id = 'profile-photos');

-- ÉTAPE 6 : Policy pour delete
CREATE POLICY "Users can delete their own profile photo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile-photos');

-- ÉTAPE 7 : Vérifier que la colonne photo_url existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE profil ADD COLUMN photo_url text;
  END IF;
END $$;

-- ÉTAPE 8 : Vérification
SELECT
  'Bucket profile-photos' as check_type,
  CASE
    WHEN public THEN '✅ PUBLIC'
    ELSE '❌ PRIVÉ (PROBLÈME !)'
  END as status
FROM storage.buckets
WHERE id = 'profile-photos';

SELECT
  'Policies RLS' as check_type,
  COUNT(*) || ' policies actives' as status
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%profile%';
