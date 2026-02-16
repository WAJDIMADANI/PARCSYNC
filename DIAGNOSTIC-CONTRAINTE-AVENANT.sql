-- Diagnostic : Voir la contrainte actuelle sur avenant_num

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND conname LIKE '%avenant%';

-- Voir toutes les contraintes CHECK sur contrat
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND contype = 'c';
