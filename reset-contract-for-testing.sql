-- Script pour réinitialiser un contrat pour test
-- Remplace l'ID par celui du contrat que tu veux tester

UPDATE contrat
SET
  date_signature = NULL,
  statut = 'envoye',
  certificat_medical_id = NULL,
  yousign_signature_request_id = NULL,
  yousign_signer_id = NULL,
  yousign_signed_at = NULL
WHERE id = '29ec8905-ddf4-40c2-8e52-c1ea0b50af86';

-- Supprimer le document certificat médical si existant
DELETE FROM document
WHERE proprietaire_id IN (
  SELECT profil_id FROM contrat WHERE id = '29ec8905-ddf4-40c2-8e52-c1ea0b50af86'
)
AND type = 'certificat_medical';
