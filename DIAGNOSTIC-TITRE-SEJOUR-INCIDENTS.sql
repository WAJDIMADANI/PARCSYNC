-- Diagnostic : Pourquoi les notifications titre de séjour n'apparaissent pas

-- 1. Voir la structure de la table incident
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incident'
ORDER BY ordinal_position;

-- 2. Voir tous les types d'incidents possibles
SELECT DISTINCT type_incident FROM incident;

-- 3. Voir les incidents titre de séjour existants
SELECT 
  i.id,
  i.profil_id,
  p.nom,
  p.prenom,
  i.type_incident,
  i.statut,
  i.date_expiration,
  i.created_at
FROM incident i
JOIN profil p ON p.id = i.profil_id
WHERE i.type_incident ILIKE '%titre%'
ORDER BY i.created_at DESC
LIMIT 10;

-- 4. Voir la fonction qui génère les incidents quotidiens
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%incident%'
  AND routine_type = 'FUNCTION';

-- 5. Vérifier les dates d'expiration des titres de séjour < 30 jours
SELECT 
  p.id,
  p.nom,
  p.prenom,
  p.titre_sejour_validite_fin,
  (p.titre_sejour_validite_fin - CURRENT_DATE) as jours_restants
FROM profil p
WHERE p.titre_sejour_validite_fin IS NOT NULL
  AND p.titre_sejour_validite_fin <= CURRENT_DATE + INTERVAL '30 days'
  AND p.deleted_at IS NULL
ORDER BY p.titre_sejour_validite_fin;

-- 6. Voir si des incidents existent pour ces profils
SELECT 
  p.nom,
  p.prenom,
  p.titre_sejour_validite_fin,
  i.type_incident,
  i.statut,
  i.date_expiration
FROM profil p
LEFT JOIN incident i ON i.profil_id = p.id 
  AND i.type_incident ILIKE '%titre%'
  AND i.statut != 'resolu'
WHERE p.titre_sejour_validite_fin IS NOT NULL
  AND p.titre_sejour_validite_fin <= CURRENT_DATE + INTERVAL '30 days'
  AND p.deleted_at IS NULL;
