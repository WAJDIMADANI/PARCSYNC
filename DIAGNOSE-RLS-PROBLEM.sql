/*
  # Diagnostic des politiques RLS

  Ce script va nous aider à comprendre pourquoi les données ne s'affichent pas.
  Exécutez ce script dans le SQL Editor de Supabase.
*/

-- 1. Vérifier si RLS est activé sur les tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('profil', 'contrat', 'modeles_contrats', 'candidat')
ORDER BY tablename;

-- 2. Lister TOUTES les politiques existantes
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename IN ('profil', 'contrat', 'modeles_contrats', 'candidat')
ORDER BY tablename, cmd;

-- 3. Compter le nombre de lignes dans chaque table
SELECT 'profil' as table_name, COUNT(*) as row_count FROM profil
UNION ALL
SELECT 'contrat', COUNT(*) FROM contrat
UNION ALL
SELECT 'modeles_contrats', COUNT(*) FROM modeles_contrats
UNION ALL
SELECT 'candidat', COUNT(*) FROM candidat;

-- 4. Tester si l'utilisateur actuel peut lire les données
SELECT
  'profil' as table_name,
  auth.uid() as current_user_id,
  COUNT(*) as accessible_rows
FROM profil
UNION ALL
SELECT
  'contrat',
  auth.uid(),
  COUNT(*)
FROM contrat
UNION ALL
SELECT
  'modeles_contrats',
  auth.uid(),
  COUNT(*)
FROM modeles_contrats;
