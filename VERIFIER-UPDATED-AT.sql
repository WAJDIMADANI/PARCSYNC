-- Vérifier que la colonne updated_at existe et a des valeurs
SELECT
  id,
  prenom,
  nom,
  created_at,
  updated_at,
  (updated_at > created_at) as "a_ete_modifie"
FROM profil
WHERE role = 'salarie'
  AND (statut IS NULL OR statut != 'inactif')
ORDER BY updated_at DESC NULLS LAST
LIMIT 20;

-- Vérifier que le trigger existe
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profil'
  AND trigger_name = 'update_profil_updated_at';
