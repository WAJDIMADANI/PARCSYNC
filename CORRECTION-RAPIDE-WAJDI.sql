-- Correction rapide du statut de WAJDI MADANI

-- Mettre à jour le statut à "signé"
UPDATE contrat
SET
  statut = 'signé',
  date_signature = NOW(),
  updated_at = NOW()
WHERE profil_id IN (
  SELECT id FROM profil WHERE nom = 'MADANI' AND prenom = 'WAJDI'
)
AND statut IN ('envoyé', 'en_attente_signature', 'actif')
RETURNING
  id,
  type,
  statut,
  date_debut,
  date_fin,
  date_signature;
