/*
  DIAGNOSTIC: Vérifier pourquoi les incidents titre_sejour ne s'affichent pas

  Ce script vérifie:
  1. Si les incidents titre_sejour existent
  2. Leur structure
  3. Les liens avec les profils
*/

-- 1. Compter les incidents par type
SELECT
  type,
  COUNT(*) as nombre,
  COUNT(DISTINCT profil_id) as profils_uniques
FROM incident
GROUP BY type
ORDER BY nombre DESC;

-- 2. Vérifier les 5 premiers incidents titre_sejour
SELECT
  i.id,
  i.type,
  i.profil_id,
  i.contrat_id,
  i.date_expiration_effective,
  i.statut,
  i.created_at,
  p.nom,
  p.prenom,
  p.email
FROM incident i
LEFT JOIN profil p ON p.id = i.profil_id
WHERE i.type = 'titre_sejour'
ORDER BY i.date_expiration_effective
LIMIT 5;

-- 3. Vérifier s'il y a des incidents sans profil_id
SELECT
  type,
  COUNT(*) as incidents_sans_profil
FROM incident
WHERE profil_id IS NULL
GROUP BY type;

-- 4. Vérifier les RLS policies sur la table incident
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'incident'
ORDER BY policyname;
