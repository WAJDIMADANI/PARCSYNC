-- DIAGNOSTIC : Trouver le type enum pour la colonne statut de la table incidents

-- 1. Vérifier la structure de la table incidents
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'incidents'
ORDER BY ordinal_position;

-- 2. Trouver tous les types enum dans la base de données
SELECT
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typtype = 'e'
GROUP BY t.typname
ORDER BY t.typname;

-- 3. Vérifier spécifiquement la colonne statut de la table incidents
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  t.typname as type_name
FROM information_schema.columns c
LEFT JOIN pg_type t ON t.typname = c.udt_name
WHERE c.table_name = 'incidents'
  AND c.column_name = 'statut';
