/*
  ============================================================================
  FIX COMPLET POUR L'ONBOARDING ANONYME
  ============================================================================

  PROBLÈME:
  - Les candidats reçoivent "permission denied for table documents"
  - Le formulaire d'onboarding est utilisé par des utilisateurs NON authentifiés
  - Les uploads de fichiers et l'insertion de documents échouent

  SOLUTION:
  - Autoriser les utilisateurs anonymes (anon et public) sur:
    1. Le bucket 'candidatures' (storage) - pour uploader les fichiers
    2. La table 'document' - pour créer les enregistrements de documents
    3. La table 'profil' - pour créer/mettre à jour le profil employé

  ============================================================================
  EXÉCUTEZ CE SCRIPT DANS LE SQL EDITOR DE SUPABASE
  ============================================================================
*/

-- ============================================================================
-- 1. FIX STORAGE BUCKET 'candidatures'
-- ============================================================================

-- Créer ou mettre à jour le bucket candidatures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidatures',
  'candidatures',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Supprimer les anciennes politiques du bucket candidatures
DROP POLICY IF EXISTS "Allow authenticated uploads candidatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous and authenticated uploads candidatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads candidatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads candidatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates candidatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes candidatures" ON storage.objects;

-- CRITIQUE: Autoriser TOUS (anon + authenticated) à uploader
CREATE POLICY "Allow public uploads candidatures"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'candidatures');

-- Autoriser la lecture publique
CREATE POLICY "Allow public reads candidatures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'candidatures');

-- Autoriser les utilisateurs authentifiés à mettre à jour
CREATE POLICY "Allow authenticated updates candidatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'candidatures')
WITH CHECK (bucket_id = 'candidatures');

-- Autoriser les utilisateurs authentifiés à supprimer
CREATE POLICY "Allow authenticated deletes candidatures"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'candidatures');

-- ============================================================================
-- 2. FIX TABLE 'document'
-- ============================================================================

-- Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "Authenticated users can read all documents" ON document;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON document;
DROP POLICY IF EXISTS "Authenticated users can update their documents" ON document;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON document;
DROP POLICY IF EXISTS "Users can read documents" ON document;
DROP POLICY IF EXISTS "Users can insert documents" ON document;
DROP POLICY IF EXISTS "Users can update documents" ON document;
DROP POLICY IF EXISTS "Users can delete documents" ON document;
DROP POLICY IF EXISTS "auth_all" ON document;

-- Supprimer les anciennes politiques anonymes (on va les recréer)
DROP POLICY IF EXISTS "Allow anonymous document inserts" ON document;
DROP POLICY IF EXISTS "Allow authenticated document inserts" ON document;
DROP POLICY IF EXISTS "Allow public document reads" ON document;
DROP POLICY IF EXISTS "Allow authenticated document updates" ON document;
DROP POLICY IF EXISTS "Allow authenticated document deletes" ON document;
DROP POLICY IF EXISTS "Anonymous can upload documents" ON document;
DROP POLICY IF EXISTS "Anonymous can view documents" ON document;

-- CRITIQUE: Autoriser TOUS (anon + authenticated) à insérer des documents
CREATE POLICY "Allow public document inserts"
ON document
FOR INSERT
TO public
WITH CHECK (true);

-- Autoriser la lecture publique des documents
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
-- 3. FIX TABLE 'profil'
-- ============================================================================

-- Vérifier et créer la politique pour permettre aux anonymes d'insérer des profils
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profil'
    AND policyname = 'Allow anonymous profile creation'
  ) THEN
    CREATE POLICY "Allow anonymous profile creation"
      ON profil FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Vérifier et créer la politique pour permettre aux anonymes de lire les profils
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profil'
    AND policyname = 'Anonymous can view profiles'
  ) THEN
    CREATE POLICY "Anonymous can view profiles"
      ON profil FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Vérifier et créer la politique pour permettre aux anonymes de mettre à jour les profils
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profil'
    AND policyname = 'Allow anonymous profile updates'
  ) THEN
    CREATE POLICY "Allow anonymous profile updates"
      ON profil FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 4. FIX TABLE 'candidat'
-- ============================================================================

-- Vérifier et créer la politique pour permettre aux anonymes de mettre à jour les candidats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'candidat'
    AND policyname = 'Allow anonymous candidat updates'
  ) THEN
    CREATE POLICY "Allow anonymous candidat updates"
      ON candidat FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Vérifier les politiques créées
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('document', 'profil', 'candidat')
  AND (policyname ILIKE '%public%' OR policyname ILIKE '%anonymous%')
ORDER BY tablename, policyname;

SELECT '✅ Configuration terminée - L''onboarding anonyme devrait maintenant fonctionner !' AS message;
