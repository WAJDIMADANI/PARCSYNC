/*
  # Configuration du Storage pour les Photos de Véhicules

  1. Création du Bucket
    - Nom: vehicle-photos
    - Mode: privé (nécessite authentification)
    - Taille max fichier: 5MB
    - Formats acceptés: image/jpeg, image/png

  2. Policies RLS
    - Authenticated users peuvent lire toutes les photos
    - Authenticated users peuvent uploader des photos
    - Authenticated users peuvent mettre à jour des photos
    - Authenticated users peuvent supprimer des photos

  IMPORTANT: Exécuter ce script dans l'éditeur SQL de Supabase
*/

-- ============================================================================
-- 1. CRÉATION DU BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ============================================================================
-- 2. RLS POLICIES POUR LE BUCKET
-- ============================================================================

-- Policy pour lire les photos (SELECT)
DROP POLICY IF EXISTS "Authenticated users can view vehicle photos" ON storage.objects;
CREATE POLICY "Authenticated users can view vehicle photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vehicle-photos');

-- Policy pour uploader des photos (INSERT)
DROP POLICY IF EXISTS "Authenticated users can upload vehicle photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos');

-- Policy pour mettre à jour des photos (UPDATE)
DROP POLICY IF EXISTS "Authenticated users can update vehicle photos" ON storage.objects;
CREATE POLICY "Authenticated users can update vehicle photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-photos')
WITH CHECK (bucket_id = 'vehicle-photos');

-- Policy pour supprimer des photos (DELETE)
DROP POLICY IF EXISTS "Authenticated users can delete vehicle photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete vehicle photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-photos');

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Vérifier que le bucket est créé
SELECT * FROM storage.buckets WHERE id = 'vehicle-photos';

-- Vérifier les policies
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%vehicle photos%';
