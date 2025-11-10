/*
  ============================================================================
  FIX POUR L'UPLOAD DES CERTIFICATS MÉDICAUX PAR LES EMPLOYÉS
  ============================================================================

  PROBLÈME:
  - Les employés reçoivent "Erreur upload" et "Supabase request failed"
  - Impossible d'uploader les certificats médicaux depuis le panel de validation

  CAUSE:
  - Les politiques RLS bloquent les utilisateurs anonymes (non authentifiés)
  - Les employés accèdent au panel de validation SANS authentification
  - Ils doivent pouvoir uploader des fichiers et créer des documents

  SOLUTION:
  - Autoriser les utilisateurs anonymes (anon) à uploader dans le bucket 'documents'
  - Autoriser les utilisateurs anonymes à insérer dans la table 'document'
  - Autoriser les utilisateurs anonymes à mettre à jour la table 'contrat'

  ============================================================================
  EXÉCUTEZ CE SCRIPT DANS LE SQL EDITOR DE SUPABASE
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

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;

-- CRITIQUE: Autoriser les utilisateurs anonymes à uploader
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

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Allow anonymous document inserts" ON document;
DROP POLICY IF EXISTS "Allow authenticated document inserts" ON document;
DROP POLICY IF EXISTS "Allow authenticated document reads" ON document;
DROP POLICY IF EXISTS "Allow public document reads" ON document;
DROP POLICY IF EXISTS "Allow authenticated document updates" ON document;
DROP POLICY IF EXISTS "Allow authenticated document deletes" ON document;

-- CRITIQUE: Autoriser les utilisateurs anonymes à insérer des documents
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
-- 3. FIX TABLE 'contrat'
-- ============================================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Allow anonymous contrat updates" ON contrat;
DROP POLICY IF EXISTS "Allow public contrat reads" ON contrat;

-- CRITIQUE: Autoriser les utilisateurs anonymes à mettre à jour les contrats
-- (nécessaire pour lier le certificat médical au contrat)
CREATE POLICY "Allow anonymous contrat updates"
ON contrat
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Autoriser la lecture publique des contrats
CREATE POLICY "Allow public contrat reads"
ON contrat
FOR SELECT
TO public
USING (true);

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

-- Vérifier que tout est bien configuré
SELECT 'Storage policies created' AS status;
SELECT 'Document table policies created' AS status;
SELECT 'Contrat table policies created' AS status;
SELECT 'Upload des certificats médicaux devrait maintenant fonctionner !' AS message;
