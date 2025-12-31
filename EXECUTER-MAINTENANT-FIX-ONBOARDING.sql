-- ============================================================================
-- FIX URGENT ONBOARDING - EXÉCUTER IMMÉDIATEMENT
-- ============================================================================
-- Ce script corrige les permissions pour permettre l'onboarding anonyme
-- ============================================================================

-- ============================================================================
-- 1. BUCKET CANDIDATURES - AUTORISER UPLOADS ANONYMES
-- ============================================================================

-- Supprimer TOUTES les politiques existantes sur storage.objects pour candidatures
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'objects'
      AND (qual::text ILIKE '%candidatures%' OR with_check::text ILIKE '%candidatures%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Créer les nouvelles politiques pour candidatures
CREATE POLICY "candidatures_insert_public"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'candidatures');

CREATE POLICY "candidatures_select_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'candidatures');

-- ============================================================================
-- 2. TABLE DOCUMENT - AUTORISER INSERTIONS ANONYMES
-- ============================================================================

-- Supprimer TOUTES les politiques existantes sur la table document
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'document'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON document', pol.policyname);
  END LOOP;
END $$;

-- Créer les nouvelles politiques pour document
CREATE POLICY "document_insert_public"
ON document
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "document_select_public"
ON document
FOR SELECT
TO public
USING (true);

CREATE POLICY "document_update_authenticated"
ON document
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "document_delete_authenticated"
ON document
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- 3. TABLE PROFIL - AUTORISER INSERTIONS/UPDATES ANONYMES
-- ============================================================================

-- Supprimer les politiques anonymes existantes sur profil
DROP POLICY IF EXISTS "Allow anonymous profile creation" ON profil;
DROP POLICY IF EXISTS "Anonymous can view profiles" ON profil;
DROP POLICY IF EXISTS "Allow anonymous profile updates" ON profil;
DROP POLICY IF EXISTS "profil_insert_anon" ON profil;
DROP POLICY IF EXISTS "profil_select_anon" ON profil;
DROP POLICY IF EXISTS "profil_update_anon" ON profil;

-- Créer les nouvelles politiques pour profil
CREATE POLICY "profil_insert_anon"
ON profil
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "profil_select_anon"
ON profil
FOR SELECT
TO anon
USING (true);

CREATE POLICY "profil_update_anon"
ON profil
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. TABLE CANDIDAT - AUTORISER UPDATES ANONYMES
-- ============================================================================

-- Supprimer les politiques anonymes existantes sur candidat
DROP POLICY IF EXISTS "Allow anonymous candidat updates" ON candidat;
DROP POLICY IF EXISTS "candidat_update_anon" ON candidat;

-- Créer la nouvelle politique pour candidat
CREATE POLICY "candidat_update_anon"
ON candidat
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

SELECT '✅ POLITIQUES CRÉÉES AVEC SUCCÈS' as status;

-- Afficher les politiques créées pour document
SELECT
  '📄 Politiques TABLE DOCUMENT:' as info,
  policyname,
  cmd,
  roles::text[]
FROM pg_policies
WHERE tablename = 'document'
ORDER BY cmd;

-- Afficher les politiques créées pour storage candidatures
SELECT
  '📦 Politiques BUCKET CANDIDATURES:' as info,
  policyname,
  cmd,
  roles::text[]
FROM pg_policies
WHERE tablename = 'objects'
  AND (qual::text ILIKE '%candidatures%' OR with_check::text ILIKE '%candidatures%')
ORDER BY cmd;

SELECT '🎉 L''onboarding devrait maintenant fonctionner!' as message;
