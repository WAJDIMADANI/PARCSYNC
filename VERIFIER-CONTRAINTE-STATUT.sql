-- Vérifier la contrainte sur la colonne statut

-- 1. Voir toutes les contraintes sur la table contrat
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND conname LIKE '%statut%';

-- 2. Voir tous les statuts existants actuellement utilisés
SELECT DISTINCT statut
FROM contrat
ORDER BY statut;

-- 3. Voir le type de la colonne statut
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'contrat'
  AND column_name = 'statut';
