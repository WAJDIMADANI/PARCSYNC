-- FORCER le statut "signé" pour WAJDI MADANI
-- Cette requête va mettre à jour le contrat peu importe son statut actuel

UPDATE contrat
SET
  statut = 'signé',
  date_signature = NOW(),
  updated_at = NOW()
WHERE profil_id IN (
  SELECT id FROM profil WHERE nom = 'MADANI' AND prenom = 'WAJDI'
)
RETURNING
  id,
  type,
  statut,
  date_debut,
  date_fin,
  date_signature;
