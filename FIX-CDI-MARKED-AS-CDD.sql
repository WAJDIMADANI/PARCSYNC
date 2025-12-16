/*
  # Fix CDI contracts incorrectly marked as CDD

  ## Problem
  During import, all contracts without clear indication were marked as 'cdd' by default.
  CDI contracts (no end date) were incorrectly labeled as 'cdd'.

  ## Solution
  Update all contracts:
  - If type = 'cdd' AND date_fin IS NULL → Change to type = 'cdi'
  - If type = 'cdd' AND date_fin IS NOT NULL → Keep as 'cdd'
*/

-- Show contracts that will be updated
SELECT
  c.id,
  c.type,
  c.date_debut,
  c.date_fin,
  c.statut,
  p.prenom,
  p.nom,
  p.matricule_tca
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
WHERE c.type = 'cdd'
  AND c.date_fin IS NULL
ORDER BY p.nom, p.prenom;

-- Update contracts: CDD without end date = CDI
UPDATE contrat
SET type = 'cdi'
WHERE type = 'cdd'
  AND date_fin IS NULL;

-- Verify the update
SELECT
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN date_fin IS NULL THEN 1 END) as without_end_date,
  COUNT(CASE WHEN date_fin IS NOT NULL THEN 1 END) as with_end_date
FROM contrat
GROUP BY type
ORDER BY type;
