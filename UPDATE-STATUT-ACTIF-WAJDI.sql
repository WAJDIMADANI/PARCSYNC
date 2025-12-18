-- Mettre à jour le statut à "actif" pour WAJDI MADANI
-- (car "signé" semble violer une contrainte)

UPDATE contrat
SET
  statut = 'actif',
  date_signature = NOW(),
  updated_at = NOW()
WHERE id = '8b99ce51-2c85-4e27-8ab6-62c49fb4a952'
RETURNING
  id,
  type,
  statut,
  date_debut,
  date_fin,
  date_signature;
