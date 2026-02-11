/*
  # Créer le Bucket "documents" pour le Storage

  1. Problème identifié
    - Erreur 404 "Bucket not found" lors de l'affichage des documents
    - Le bucket "documents" n'existe pas dans Supabase Storage
    - URL: https://xxx.supabase.co/storage/v1/object/public/documents/...

  2. Solution
    - Créer le bucket "documents"
    - Ajouter les politiques RLS pour :
      * Upload par utilisateurs authentifiés
      * Lecture publique (pour affichage via URL publique ou signée)
      * Update et Delete pour utilisateurs authentifiés

  3. Structure
    - Bucket public pour faciliter l'accès
    - Organisation en sous-dossiers :
      * documents-importants/ (documents du profil)
      * contrats/ (contrats manuels uploadés)
      * courriers/ (courriers générés)
      * vehicules/ (documents véhicules)
*/

-- Créer le bucket "documents" s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true, -- Public pour faciliter l'accès
  104857600, -- 100MB limite
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policy : Allow authenticated users to upload files
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy : Allow anonymous users to upload files (pour upload sans connexion)
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;
CREATE POLICY "Allow anonymous uploads to documents"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'documents');

-- Policy : Allow public read access (important pour afficher les docs)
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
CREATE POLICY "Allow public reads from documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy : Allow authenticated users to update files
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy : Allow authenticated users to delete files
DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Vérification
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'documents';
