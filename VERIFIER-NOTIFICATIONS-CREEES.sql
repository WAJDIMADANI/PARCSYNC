-- Vérifier si les notifications ont été créées

-- 1. Voir toutes les notifications créées aujourd'hui
SELECT 
  n.id,
  n.type,
  p.nom,
  p.prenom,
  n.date_echeance,
  n.statut,
  n.created_at
FROM notification n
JOIN profil p ON p.id = n.profil_id
WHERE DATE(n.created_at) = CURRENT_DATE
ORDER BY n.created_at DESC;

-- 2. Compter les notifications par type
SELECT 
  type,
  COUNT(*) as nombre,
  COUNT(*) FILTER (WHERE statut = 'non_lu') as non_lus
FROM notification
GROUP BY type
ORDER BY type;

-- 3. Voir les notifications de titre de séjour spécifiquement
SELECT 
  n.id,
  p.nom,
  p.prenom,
  p.titre_sejour_validite_fin as date_expiration_profil,
  n.date_echeance as date_dans_notification,
  (p.titre_sejour_validite_fin - CURRENT_DATE) as jours_restants,
  n.statut,
  n.created_at
FROM notification n
JOIN profil p ON p.id = n.profil_id
WHERE n.type = 'titre_sejour'
ORDER BY p.titre_sejour_validite_fin;

-- 4. Vérifier les profils avec titre de séjour < 30 jours SANS notification
SELECT 
  p.id,
  p.nom,
  p.prenom,
  p.titre_sejour_validite_fin,
  (p.titre_sejour_validite_fin - CURRENT_DATE) as jours_restants,
  COUNT(n.id) as nb_notifications
FROM profil p
LEFT JOIN notification n ON n.profil_id = p.id AND n.type = 'titre_sejour' AND n.statut != 'resolu'
WHERE p.titre_sejour_validite_fin IS NOT NULL
  AND p.titre_sejour_validite_fin <= CURRENT_DATE + INTERVAL '30 days'
  AND p.deleted_at IS NULL
GROUP BY p.id, p.nom, p.prenom, p.titre_sejour_validite_fin
HAVING COUNT(n.id) = 0
ORDER BY p.titre_sejour_validite_fin;
