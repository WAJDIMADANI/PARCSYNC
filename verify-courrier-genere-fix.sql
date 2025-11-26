/*
  # Script de vérification après les migrations

  Exécutez ce script après avoir appliqué les deux migrations
  pour vérifier que tout est correctement configuré.
*/

-- 1. Vérifier que les colonnes existent
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'courrier_genere'
  AND column_name IN ('created_by', 'envoye_par', 'updated_at')
ORDER BY column_name;

-- Résultat attendu: 3 lignes avec created_by, envoye_par, updated_at

-- 2. Vérifier les foreign keys
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS foreign_table_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE contype = 'f'
  AND conrelid = 'courrier_genere'::regclass
  AND confrelid = 'app_utilisateur'::regclass
ORDER BY constraint_name;

-- Résultat attendu: 2 lignes avec les foreign keys vers app_utilisateur

-- 3. Vérifier les index
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'courrier_genere'
  AND indexname LIKE '%envoye_par%' OR indexname LIKE '%updated_at%'
ORDER BY indexname;

-- Résultat attendu: 2 index (idx_courrier_genere_envoye_par, idx_courrier_genere_updated_at)

-- 4. Vérifier les policies RLS sur app_utilisateur
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'app_utilisateur'
  AND policyname LIKE '%user%info%'
ORDER BY policyname;

-- Résultat attendu: 1 policy permettant SELECT pour authenticated

-- 5. Tester une requête complète
SELECT
  cg.id,
  cg.sujet,
  cg.created_by,
  cg.envoye_par,
  cg.updated_at,
  u_created.prenom AS created_by_prenom,
  u_created.nom AS created_by_nom,
  u_envoye.prenom AS envoye_par_prenom,
  u_envoye.nom AS envoye_par_nom
FROM courrier_genere cg
LEFT JOIN app_utilisateur u_created ON cg.created_by = u_created.id
LEFT JOIN app_utilisateur u_envoye ON cg.envoye_par = u_envoye.id
LIMIT 3;

-- Résultat attendu: Les courriers avec les noms des utilisateurs (si les données existent)

-- 6. Vérifier que le trigger existe
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'courrier_genere'
  AND trigger_name LIKE '%updated_at%';

-- Résultat attendu: 1 trigger pour updated_at
