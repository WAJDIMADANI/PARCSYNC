-- ============================================================================
-- DIAGNOSTIC DES POLITIQUES POUR L'ONBOARDING
-- ============================================================================

-- 1. Vérifier les politiques sur la table 'document'
SELECT
  policyname,
  roles::text[] as roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'document'
ORDER BY cmd, policyname;

-- 2. Vérifier les politiques sur la table 'profil'
SELECT
  policyname,
  roles::text[] as roles,
  cmd
FROM pg_policies
WHERE tablename = 'profil'
  AND 'anon' = ANY(roles::text[])
ORDER BY cmd, policyname;

-- 3. Vérifier les politiques sur storage.objects pour le bucket 'candidatures'
SELECT
  policyname,
  roles::text[] as roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND (qual::text ILIKE '%candidatures%' OR with_check::text ILIKE '%candidatures%')
ORDER BY cmd, policyname;

-- 4. Vérifier si RLS est activé sur la table document
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'document';
