/*
  ============================================================================
  VÉRIFICATION UPLOAD ANONYME SÉCURISÉ
  ============================================================================

  Ce script vérifie que les policies sécurisées sont bien en place.
  Exécutez-le dans Supabase Dashboard → SQL Editor
  ============================================================================
*/

-- ============================================================================
-- 1. VÉRIFIER LES POLICIES STORAGE (anon)
-- ============================================================================

SELECT
  '📋 Policies storage.objects pour anon' as check_name;

SELECT
  policyname,
  cmd as operation,
  qual IS NOT NULL as has_using_clause,
  with_check IS NOT NULL as has_with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND 'anon' = ANY(string_to_array(roles::text, ','))
ORDER BY policyname;

-- ============================================================================
-- 2. VÉRIFIER LES POLICIES DOCUMENT (anon)
-- ============================================================================

SELECT
  '📋 Policies document pour anon' as check_name;

SELECT
  policyname,
  cmd as operation,
  qual IS NOT NULL as has_using_clause,
  with_check IS NOT NULL as has_with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'document'
  AND 'anon' = ANY(string_to_array(roles::text, ','))
ORDER BY policyname;

-- ============================================================================
-- 3. VÉRIFIER LE BUCKET DOCUMENTS (doit être NON public)
-- ============================================================================

SELECT
  '🪣 Configuration bucket documents' as check_name;

SELECT
  id,
  name,
  public as is_public,
  file_size_limit / 1048576 as max_size_mb,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'documents';

-- ============================================================================
-- 4. TEST: Créer un token de test (optionnel)
-- ============================================================================

-- Décommentez ces lignes pour créer un token de test
-- et tester l'upload depuis le front

/*
-- Trouvez un profil_id existant
SELECT id, prenom, nom FROM profil LIMIT 1;

-- Créez un token de test (remplacez <PROFIL_ID> par un ID réel)
INSERT INTO upload_tokens (profil_id, token, expires_at)
VALUES (
  '<PROFIL_ID>',
  'test-token-' || substr(md5(random()::text), 1, 16),
  now() + interval '1 hour'
)
RETURNING
  token,
  profil_id,
  expires_at,
  '🔗 URL de test: ' ||
  'https://votre-domaine.com/upload-documents?profil=' || profil_id || '&token=' || token as test_url;
*/

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================

/*
✅ Vous devriez voir:

1. Policies storage.objects:
   - anon_upload_documents_with_token (INSERT, avec WITH CHECK)

2. Policies document:
   - anon_insert_document_with_token (INSERT, avec WITH CHECK)

3. Bucket documents:
   - public = false (NON public)
   - file_size_limit = 10 MB
   - allowed_mime_types = PDF, JPEG, JPG, PNG

4. Policies authenticated (normales):
   - authenticated_upload_documents
   - authenticated_read_documents
   - authenticated_update_documents
   - authenticated_delete_documents
   - authenticated_document_access

❌ Vous NE devez PAS voir:
   - WITH CHECK (true) pour anon
   - Bucket public = true
   - Policies sans validation token pour anon
*/
