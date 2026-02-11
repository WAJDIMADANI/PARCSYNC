/*
  # FIX IMMÉDIAT : Rendre le bucket "documents" public

  Problème : Le bucket "documents" existe mais est privé (public: false)
  Conséquence : Erreur 404 quand on clique sur "Voir"
  Solution : Rendre le bucket public + ajouter policies RLS
*/

-- 1. Rendre le bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'documents';

-- 2. Créer la policy de lecture publique (FIX l'erreur 404)
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
CREATE POLICY "Allow public reads from documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- 3. Créer la policy d'upload authentifié
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- 4. Créer la policy d'upload anonyme (certificats médicaux, onboarding)
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;
CREATE POLICY "Allow anonymous uploads to documents"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'documents');

-- 5. Update par utilisateurs authentifiés
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- 6. Delete par utilisateurs authentifiés
DROP POLICY IF EXISTS "Allow authenticated deletes to documents" ON storage.objects;
CREATE POLICY "Allow authenticated deletes to documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- ✅ Vérification
SELECT
  id,
  public,
  CASE
    WHEN public = true THEN '✅ Public - URLs accessibles'
    ELSE '❌ Privé - Erreur 404'
  END as status,
  file_size_limit / 1048576 as limit_mb
FROM storage.buckets
WHERE id = 'documents';

-- Compter les policies créées
SELECT
  COUNT(*) as nombre_policies,
  CASE
    WHEN COUNT(*) >= 5 THEN '✅ Toutes les policies sont en place'
    ELSE '⚠️ Il manque des policies'
  END as status
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%documents%';
