/*
  # Diagnostic du bucket "documents" et ses policies

  Le bucket existe mais l'erreur 404 persiste.
  Vérifions les policies RLS et la configuration.
*/

-- 1. Vérifier la configuration du bucket
SELECT
  id,
  name,
  public,
  file_size_limit / 1048576 as size_limit_mb,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'documents';

-- 2. Vérifier toutes les policies RLS pour le bucket documents
SELECT
  policyname,
  cmd as operation,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    policyname LIKE '%documents%'
    OR policyname LIKE '%document%'
  )
ORDER BY cmd, policyname;

-- 3. Compter les fichiers dans le bucket
SELECT
  COUNT(*) as total_files,
  COUNT(DISTINCT name) as unique_names,
  MIN(created_at) as oldest_file,
  MAX(created_at) as newest_file
FROM storage.objects
WHERE bucket_id = 'documents';

-- 4. Voir quelques exemples de chemins de fichiers
SELECT
  name as file_path,
  created_at,
  metadata->>'size' as size_bytes,
  metadata->>'mimetype' as mime_type
FROM storage.objects
WHERE bucket_id = 'documents'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Vérifier si le bucket est bien public
SELECT
  id,
  public,
  CASE
    WHEN public = true THEN '✅ Public - URLs publiques OK'
    WHEN public = false THEN '❌ Privé - Nécessite URLs signées'
  END as status
FROM storage.buckets
WHERE id = 'documents';

-- 6. Vérifier les policies manquantes
WITH required_policies AS (
  SELECT unnest(ARRAY[
    'Allow authenticated uploads to documents',
    'Allow anonymous uploads to documents',
    'Allow public reads from documents',
    'Allow authenticated updates to documents',
    'Allow authenticated deletes from documents'
  ]) as policy_name
)
SELECT
  rp.policy_name,
  CASE
    WHEN pp.policyname IS NOT NULL THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status
FROM required_policies rp
LEFT JOIN pg_policies pp ON pp.policyname = rp.policy_name
  AND pp.schemaname = 'storage'
  AND pp.tablename = 'objects'
ORDER BY rp.policy_name;

-- 7. Diagnostic des policies existantes
SELECT
  CASE
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT' AND roles::text LIKE '%public%') > 0
      THEN '✅ Lecture publique activée'
    ELSE '❌ Pas de lecture publique - Erreur 404 possible'
  END as lecture_publique,
  CASE
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT' AND roles::text LIKE '%authenticated%') > 0
      THEN '✅ Upload authentifié activé'
    ELSE '❌ Pas d''upload authentifié'
  END as upload_authentifie,
  CASE
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT' AND roles::text LIKE '%anon%') > 0
      THEN '✅ Upload anonyme activé'
    ELSE '⚠️ Pas d''upload anonyme'
  END as upload_anonyme
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (policyname LIKE '%documents%' OR policyname LIKE '%document%');
