-- ========================================
-- DIAGNOSTIC COMPLET WEBHOOK YOUSIGN
-- ========================================

-- 1. VÉRIFIER LES CONTRATS EN STATUT "ENVOYÉ"
SELECT
  c.id,
  c.statut,
  c.yousign_signature_request_id,
  p.nom,
  p.prenom,
  p.matricule_tca,
  c.created_at,
  c.date_signature,
  c.yousign_signed_at
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
WHERE c.statut = 'envoye'
ORDER BY c.created_at DESC;

-- 2. VÉRIFIER SI LE WEBHOOK A DÉJÀ ÉTÉ APPELÉ
-- (Chercher dans les notifications ou incidents créés automatiquement)
SELECT
  n.id,
  n.type,
  n.contrat_id,
  n.created_at,
  n.lu,
  c.statut as statut_contrat
FROM notification n
LEFT JOIN contrat c ON n.contrat_id = c.id
WHERE n.contrat_id IS NOT NULL
ORDER BY n.created_at DESC
LIMIT 10;

-- 3. VÉRIFIER LES CONTRATS RÉCEMMENT SIGNÉS
SELECT
  c.id,
  c.statut,
  p.nom,
  p.prenom,
  c.date_signature,
  c.yousign_signed_at,
  c.updated_at
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
WHERE c.statut = 'signe'
ORDER BY c.date_signature DESC
LIMIT 10;

-- 4. FORCER LE STATUT "SIGNÉ" POUR WAJDI (SI BESOIN)
-- ATTENTION : À utiliser seulement si le webhook ne fonctionne pas
-- et que tu es sûr que le contrat est signé

-- Décommenter pour exécuter :
/*
UPDATE contrat
SET
  statut = 'signe',
  date_signature = NOW(),
  yousign_signed_at = NOW(),
  updated_at = NOW()
WHERE profil_id IN (
  SELECT id FROM profil WHERE prenom = 'WAJDI' AND nom = 'MADANI'
)
AND statut = 'envoye';
*/

-- 5. VÉRIFIER SI YOUSIGN A UN ID DE SIGNATURE REQUEST
SELECT
  c.id,
  c.yousign_signature_request_id,
  c.statut,
  p.nom,
  p.prenom
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
WHERE c.yousign_signature_request_id IS NOT NULL
AND c.statut = 'envoye'
ORDER BY c.created_at DESC;

-- ========================================
-- RÉSULTAT ATTENDU
-- ========================================
-- Si le webhook fonctionne correctement :
-- - Les contrats en "envoyé" devraient passer à "signé" automatiquement
-- - date_signature et yousign_signed_at devraient être remplis
-- - Des notifications/incidents devraient être créés automatiquement
