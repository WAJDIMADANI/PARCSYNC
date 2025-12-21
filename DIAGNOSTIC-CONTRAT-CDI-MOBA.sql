/*
  Diagnostic du contrat CDI de Jean Marie MOBA-BIKOMBO

  Ce script va :
  1. Rechercher tous les contrats de ce salarié
  2. Vérifier les statuts et dates
  3. Vérifier les informations YouSign
  4. Vérifier les logs webhook
*/

-- 1. Rechercher tous les contrats du salarié
SELECT
  'Contrats du salarié' as diagnostic,
  c.id,
  c.type,
  c.statut,
  c.date_debut,
  c.date_fin,
  c.date_signature,
  c.yousign_signature_request_id,
  c.source,
  c.created_at,
  c.updated_at
FROM contrat c
INNER JOIN profil p ON p.id = c.profil_id
WHERE p.nom ILIKE '%MOBA%'
  AND p.prenom ILIKE '%Jean%Marie%'
ORDER BY c.created_at DESC;

-- 2. Vérifier si le webhook YouSign a été reçu
SELECT
  'Logs webhook' as diagnostic,
  created_at,
  event_type,
  signature_request_id,
  status,
  raw_payload::text
FROM email_logs
WHERE event_type LIKE '%signature%'
  AND created_at >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier les notifications liées à ce contrat
SELECT
  'Notifications' as diagnostic,
  n.id,
  n.type,
  n.titre,
  n.message,
  n.profil_id,
  n.contrat_id,
  n.lu,
  n.created_at
FROM notification n
INNER JOIN profil p ON p.id = n.profil_id
WHERE p.nom ILIKE '%MOBA%'
  AND p.prenom ILIKE '%Jean%Marie%'
ORDER BY n.created_at DESC
LIMIT 10;

-- 4. Vérifier le profil
SELECT
  'Informations profil' as diagnostic,
  id,
  nom,
  prenom,
  email,
  statut,
  matricule_tca
FROM profil
WHERE nom ILIKE '%MOBA%'
  AND prenom ILIKE '%Jean%Marie%';

-- 5. Compter les contrats par statut pour ce salarié
SELECT
  'Répartition des contrats par statut' as diagnostic,
  c.statut,
  c.type,
  COUNT(*) as nombre
FROM contrat c
INNER JOIN profil p ON p.id = c.profil_id
WHERE p.nom ILIKE '%MOBA%'
  AND p.prenom ILIKE '%Jean%Marie%'
GROUP BY c.statut, c.type;
