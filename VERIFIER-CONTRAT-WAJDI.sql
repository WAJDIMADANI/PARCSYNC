-- ========================================
-- VÉRIFICATION RAPIDE DU CONTRAT WAJDI
-- ========================================

-- 1. Afficher le contrat actuel de Wajdi
SELECT
  c.id,
  c.statut,
  c.type,
  c.date_debut,
  c.date_fin,
  c.date_signature,
  c.yousign_signed_at,
  c.yousign_signature_request_id,
  c.created_at,
  c.updated_at,
  p.nom,
  p.prenom,
  p.matricule_tca
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE p.prenom = 'WAJDI' AND p.nom = 'MADANI'
ORDER BY c.created_at DESC;

-- 2. Vérifier les notifications/incidents liés
SELECT
  n.id,
  n.type,
  n.message,
  n.lu,
  n.date_expiration,
  n.created_at
FROM notification n
WHERE n.contrat_id IN (
  SELECT c.id FROM contrat c
  JOIN profil p ON c.profil_id = p.id
  WHERE p.prenom = 'WAJDI' AND p.nom = 'MADANI'
)
ORDER BY n.created_at DESC;

-- 3. Afficher le profil de Wajdi
SELECT
  id,
  nom,
  prenom,
  statut,
  matricule_tca,
  email,
  telephone
FROM profil
WHERE prenom = 'WAJDI' AND nom = 'MADANI';

-- ========================================
-- SI LE CONTRAT EST ENCORE "ENVOYÉ"
-- ET QUE TU ES SÛR QU'IL EST SIGNÉ
-- ========================================

-- DÉCOMMENTER pour forcer le statut "signé" :
/*
UPDATE contrat
SET
  statut = 'signé',
  date_signature = NOW(),
  yousign_signed_at = NOW(),
  updated_at = NOW()
WHERE profil_id IN (
  SELECT id FROM profil WHERE prenom = 'WAJDI' AND nom = 'MADANI'
)
AND statut = 'envoye'
RETURNING id, statut, date_signature;
*/

-- ========================================
-- RÉSULTAT ATTENDU SI LE WEBHOOK FONCTIONNE
-- ========================================
-- statut = 'signé'
-- date_signature = [date de signature]
-- yousign_signed_at = [date de signature]
-- Une notification/incident devrait être créé automatiquement
