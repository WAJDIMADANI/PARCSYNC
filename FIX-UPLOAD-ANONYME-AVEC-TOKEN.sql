/*
  ============================================================================
  FIX UPLOAD ANONYME AVEC TOKEN - DOCUMENTS MANQUANTS
  ============================================================================

  PROBLÈME:
  - Les employés reçoivent l'erreur "new row violates row-level security policy for table document"
  - Ils utilisent un lien avec token pour uploader leurs documents
  - L'upload est bloqué par les policies RLS

  SOLUTION:
  - Autoriser les uploads anonymes dans le bucket 'documents'
  - Autoriser les insertions anonymes dans la table 'document'

  ============================================================================
*/

-- ============================================================================
-- 1. FIX STORAGE BUCKET 'documents'
-- ============================================================================

-- Créer ou mettre à jour le bucket documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- Supprimer les anciennes politiques du storage
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;

-- ✅ CRITIQUE: Autoriser les utilisateurs ANONYMES à uploader
CREATE POLICY "Allow anonymous uploads to documents"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'documents');

-- Autoriser les utilisateurs authentifiés à uploader
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Autoriser la lecture publique
CREATE POLICY "Allow public reads from documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Autoriser les utilisateurs authentifiés à mettre à jour
CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Autoriser les utilisateurs authentifiés à supprimer
CREATE POLICY "Allow authenticated deletes from documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- ============================================================================
-- 2. FIX TABLE 'document'
-- ============================================================================

-- Supprimer les anciennes politiques de la table document
DROP POLICY IF EXISTS "Allow anonymous document inserts" ON document;
DROP POLICY IF EXISTS "Allow authenticated document inserts" ON document;
DROP POLICY IF EXISTS "Allow authenticated document reads" ON document;
DROP POLICY IF EXISTS "Allow public document reads" ON document;
DROP POLICY IF EXISTS "Allow authenticated document updates" ON document;
DROP POLICY IF EXISTS "Allow authenticated document deletes" ON document;

-- ✅ CRITIQUE: Autoriser les utilisateurs ANONYMES à insérer des documents
CREATE POLICY "Allow anonymous document inserts"
ON document
FOR INSERT
TO anon
WITH CHECK (true);

-- Autoriser les utilisateurs authentifiés à insérer
CREATE POLICY "Allow authenticated document inserts"
ON document
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Autoriser la lecture publique
CREATE POLICY "Allow public document reads"
ON document
FOR SELECT
TO public
USING (true);

-- Autoriser les utilisateurs authentifiés à mettre à jour
CREATE POLICY "Allow authenticated document updates"
ON document
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Autoriser les utilisateurs authentifiés à supprimer
CREATE POLICY "Allow authenticated document deletes"
ON document
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

SELECT 'Storage policies created ✅' AS status;
SELECT 'Document table policies created ✅' AS status;
SELECT 'L''upload anonyme avec token est maintenant autorisé !' AS message;
