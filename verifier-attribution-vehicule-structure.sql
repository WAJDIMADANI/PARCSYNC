-- Vérifier la structure actuelle de la table attribution_vehicule

-- 1. Colonnes et leur nullabilité
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attribution_vehicule'
ORDER BY ordinal_position;

-- 2. Contraintes existantes
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'attribution_vehicule'
ORDER BY con.conname;
