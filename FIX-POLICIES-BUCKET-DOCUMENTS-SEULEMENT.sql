/*
  # Fix Policies RLS du bucket "documents" existant

  Le bucket existe déjà mais les policies RLS sont probablement manquantes ou mal configurées.
  Ce script ajoute/corrige UNIQUEMENT les policies RLS nécessaires.

  Policies nécessaires :
  1. SELECT (public) - Pour afficher les documents (CRITIQUE pour fix 404)
  2. INSERT (authenticated) - Pour upload par utilisateurs connectés
  3. INSERT (anon) - Pour upload anonyme (certificats médicaux, etc.)
  4. UPDATE (authenticated) - Pour modifier les fichiers
  5. DELETE (authenticated) - Pour supprimer les fichiers
*/

-- ÉTAPE 1 : S'assurer que le bucket est bien PUBLIC
UPDATE storage.buckets
SET public = true
WHERE id = 'documents';

-- ÉTAPE 2 : Supprimer les anciennes policies qui pourraient être mal configurées
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;

-- Supprimer aussi les variantes possibles
DROP POLICY IF EXISTS "documents_upload" ON storage.objects;
DROP POLICY IF EXISTS "documents_read" ON storage.objects;
DROP POLICY IF EXISTS "documents_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads from documents" ON storage.objects;

-- ÉTAPE 3 : Créer les policies correctes

-- Policy 1 : Lecture publique (CRITIQUE - Fix l'erreur 404)
CREATE POLICY "Allow public reads from documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy 2 : Upload par utilisateurs authentifiés
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy 3 : Upload anonyme (pour certificats médicaux, onboarding, etc.)
CREATE POLICY "Allow anonymous uploads to documents"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'documents');

-- Policy 4 : Update par utilisateurs authentifiés
CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy 5 : Delete par utilisateurs authentifiés
CREATE POLICY "Allow authenticated deletes from documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- ÉTAPE 4 : Vérification
SELECT
  '✅ Bucket "documents" configuré correctement' as status,
  public as est_public,
  file_size_limit / 1048576 as limit_mb
FROM storage.buckets
WHERE id = 'documents';

-- ÉTAPE 5 : Vérifier les policies créées
SELECT
  policyname,
  cmd as operation,
  roles as pour_role
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%documents%'
ORDER BY cmd, policyname;

-- ÉTAPE 6 : Compter les policies
SELECT
  COUNT(*) as nombre_policies,
  CASE
    WHEN COUNT(*) >= 5 THEN '✅ Toutes les policies sont présentes'
    ELSE '⚠️ Il manque des policies'
  END as status
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%documents%';
