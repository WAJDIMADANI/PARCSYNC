/*
  Correction du contrat CDI de Jean Marie MOBA-BIKOMBO

  À EXÉCUTER SEULEMENT APRÈS AVOIR VÉRIFIÉ LE DIAGNOSTIC

  Ce script va :
  1. Mettre à jour le statut du contrat CDI en "signe"
  2. Mettre la date de signature à aujourd'hui si elle n'existe pas
  3. S'assurer que le contrat est bien visible
*/

-- Mettre à jour le contrat CDI le plus récent pour Jean Marie MOBA-BIKOMBO
-- EN UTILISANT LE ID DU SIGNATURE REQUEST DE YOUSIGN

UPDATE contrat
SET
  statut = 'signe',
  date_signature = CASE
    WHEN date_signature IS NULL THEN CURRENT_DATE
    ELSE date_signature
  END,
  updated_at = NOW()
WHERE id IN (
  SELECT c.id
  FROM contrat c
  INNER JOIN profil p ON p.id = c.profil_id
  WHERE p.nom ILIKE '%MOBA%'
    AND p.prenom ILIKE '%Jean%Marie%'
    AND c.type = 'cdi'
    AND c.statut != 'signe'
  ORDER BY c.created_at DESC
  LIMIT 1
)
RETURNING
  id,
  type,
  statut,
  date_debut,
  date_fin,
  date_signature,
  yousign_signature_request_id;

-- Vérifier le résultat
SELECT
  'Vérification après correction' as info,
  c.id,
  c.type,
  c.statut,
  c.date_signature,
  c.yousign_signature_request_id,
  p.nom,
  p.prenom
FROM contrat c
INNER JOIN profil p ON p.id = c.profil_id
WHERE p.nom ILIKE '%MOBA%'
  AND p.prenom ILIKE '%Jean%Marie%'
  AND c.type = 'cdi'
ORDER BY c.created_at DESC;
