/*
  ============================================================================
  FIX UPLOAD ANONYME SÉCURISÉ AVEC TOKEN - VERSION PRODUCTION
  ============================================================================

  PROBLÈME:
  - Les employés avec token ne peuvent pas uploader (erreur RLS)

  SOLUTION SÉCURISÉE:
  - Autoriser anon à INSERT seulement si:
    1. Le token est dans un header HTTP x-upload-token
    2. Le token existe dans upload_tokens
    3. Le token n'est pas expiré
    4. Le profil_id correspond

  IMPORTANT: Le front DOIT passer le token dans un header personnalisé

  ============================================================================
*/

-- ============================================================================
-- 1. BUCKET STORAGE (pas public !)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,                 -- ⚠️ PAS public (authentification requise)
  10485760,              -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- ============================================================================
-- 2. POLICIES STORAGE: sécurisées avec validation token
-- ============================================================================

-- Nettoyage des anciennes policies dangereuses
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;
DROP POLICY IF EXISTS "anon_upload_documents_with_token" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_read_documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_documents" ON storage.objects;

-- ✅ ANON INSERT seulement si:
-- - bucket = documents
-- - le 1er dossier du path = profil_id
-- - token header valide et non expiré pour ce profil
CREATE POLICY "anon_upload_documents_with_token"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.upload_tokens ut
    WHERE ut.profil_id::text = (storage.foldername(name))[1]
      AND ut.expires_at > now()
      AND ut.token::text = (current_setting('request.headers', true)::json ->> 'x-upload-token')
  )
);

-- Authenticated (accès complet pour les utilisateurs authentifiés)
CREATE POLICY "authenticated_upload_documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "authenticated_read_documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "authenticated_update_documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "authenticated_delete_documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- ============================================================================
-- 3. POLICIES TABLE DOCUMENT: sécurisées avec validation token
-- ============================================================================

-- S'assurer que RLS est activée
ALTER TABLE public.document ENABLE ROW LEVEL SECURITY;

-- Nettoyage des anciennes policies dangereuses
DROP POLICY IF EXISTS "Allow anonymous document inserts" ON document;
DROP POLICY IF EXISTS "Allow authenticated document inserts" ON document;
DROP POLICY IF EXISTS "Allow public document reads" ON document;
DROP POLICY IF EXISTS "Allow authenticated document updates" ON document;
DROP POLICY IF EXISTS "Allow authenticated document deletes" ON document;
DROP POLICY IF EXISTS "anon_insert_document_with_token" ON document;
DROP POLICY IF EXISTS "authenticated_document_access" ON document;

-- ✅ ANON INSERT seulement si token valide pour le profil
CREATE POLICY "anon_insert_document_with_token"
ON public.document
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.upload_tokens ut
    WHERE ut.profil_id = document.owner_id
      AND ut.expires_at > now()
      AND ut.token::text = (current_setting('request.headers', true)::json ->> 'x-upload-token')
  )
);

-- Authenticated: accès complet (à adapter selon vos besoins)
CREATE POLICY "authenticated_document_access"
ON public.document
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

SELECT '✅ Bucket configuré (NON public)' AS status;
SELECT '✅ Storage policies sécurisées créées' AS status;
SELECT '✅ Document policies sécurisées créées' AS status;
SELECT '⚠️ IMPORTANT: Le front doit passer le token dans le header x-upload-token' AS message;
