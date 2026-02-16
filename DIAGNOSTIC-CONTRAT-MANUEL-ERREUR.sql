-- Diagnostic erreur 400 lors de l'insertion de contrat manuel

-- 1. Voir toutes les colonnes de la table contrat avec leurs contraintes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contrat'
ORDER BY ordinal_position;

-- 2. Voir les contraintes CHECK sur la table
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'contrat'
  AND con.contype = 'c';

-- 3. Voir les valeurs ENUM possibles pour statut
SELECT
  t.typname AS enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%contrat%' OR t.typname LIKE '%statut%'
GROUP BY t.typname;

-- 4. Tester une insertion avec données minimales
-- (commenté pour ne pas insérer de vraies données)
/*
INSERT INTO contrat (
  profil_id,
  modele_id,
  fichier_signe_url,
  statut,
  date_signature,
  variables,
  yousign_signature_request_id,
  source
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- remplacer par un vrai profil_id
  NULL,
  'test/path.pdf',
  'signe',
  CURRENT_DATE,
  '{}'::jsonb,
  NULL,
  'manuel'
);
*/

-- 5. Vérifier les policies RLS sur la table contrat
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'contrat'
ORDER BY policyname;
