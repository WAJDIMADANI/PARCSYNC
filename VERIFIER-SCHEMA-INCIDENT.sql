-- Vérifier le schéma exact de la table incident
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'incident'
ORDER BY ordinal_position;
