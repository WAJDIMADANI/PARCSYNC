/*
  # Diagnostic et Correction du statut du contrat WAJDI MADANI

  ## Problème
  Le contrat a été signé via Yousign mais le statut reste "envoyé" au lieu de "signé"

  ## Solution
  1. Vérifier l'état actuel du contrat
  2. Mettre à jour le statut à "signé"
  3. Vérifier les webhooks Yousign
*/

-- ============================================
-- ÉTAPE 1 : DIAGNOSTIC
-- ============================================

-- Vérifier le profil de WAJDI MADANI
SELECT
  id,
  nom,
  prenom,
  email,
  matricule_tca
FROM profil
WHERE nom = 'MADANI' AND prenom = 'WAJDI';

-- Vérifier tous les contrats de WAJDI MADANI
SELECT
  c.id,
  c.profil_id,
  c.type,
  c.statut,
  c.date_debut,
  c.date_fin,
  c.yousign_signature_request_id,
  c.yousign_signer_id,
  c.created_at,
  c.updated_at,
  p.nom,
  p.prenom,
  p.email
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE p.nom = 'MADANI' AND p.prenom = 'WAJDI'
ORDER BY c.created_at DESC;

-- Vérifier les logs d'email liés à ce contrat
SELECT
  id,
  type_email,
  destinataire_email,
  statut,
  metadata,
  created_at
FROM email_logs
WHERE destinataire_email = 'opt.commercial@gmail.com'
  OR metadata->>'profil_nom' = 'MADANI'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- ÉTAPE 2 : CORRECTION MANUELLE
-- ============================================

-- Mettre à jour le statut du contrat de WAJDI MADANI
-- ID du contrat: 8b99ce51-2c85-4e27-8ab6-62c49fb4a952

UPDATE contrat
SET
  statut = 'signé',
  date_signature = NOW(),
  yousign_signed_at = NOW(),
  updated_at = NOW()
WHERE id = '8b99ce51-2c85-4e27-8ab6-62c49fb4a952'
RETURNING
  id,
  type,
  statut,
  date_debut,
  date_fin,
  date_signature;

-- ============================================
-- ÉTAPE 3 : VÉRIFICATION APRÈS CORRECTION
-- ============================================

-- Vérifier que le statut a bien été mis à jour
SELECT
  c.id,
  c.type,
  c.statut,
  c.date_debut,
  c.date_fin,
  c.yousign_signature_request_id,
  p.nom,
  p.prenom,
  p.email
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE p.nom = 'MADANI' AND p.prenom = 'WAJDI'
ORDER BY c.created_at DESC
LIMIT 1;

-- ============================================
-- ÉTAPE 4 : VÉRIFIER LE WEBHOOK YOUSIGN
-- ============================================

-- Vérifier si le webhook fonctionne en regardant les logs récents
SELECT
  id,
  type_email,
  statut,
  metadata->>'yousign_status' as yousign_status,
  created_at
FROM email_logs
WHERE type_email LIKE '%yousign%'
  OR metadata->>'yousign_status' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- INFORMATION : Statuts possibles
-- ============================================
-- Les statuts de contrat sont :
-- - 'brouillon' : Contrat en cours de création
-- - 'en_attente_validation' : En attente de validation RH
-- - 'validé' : Validé par RH, prêt à être envoyé
-- - 'envoyé' : Envoyé au salarié pour signature
-- - 'en_attente_signature' : Envoyé via Yousign
-- - 'signé' : Signature complétée
-- - 'refusé' : Refusé par le salarié ou RH
-- - 'expiré' : Contrat arrivé à échéance
