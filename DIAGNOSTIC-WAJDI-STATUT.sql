-- DIAGNOSTIC COMPLET du contrat WAJDI MADANI

-- 1. Trouver le profil de WAJDI MADANI
SELECT
  id,
  nom,
  prenom,
  email,
  matricule_tca,
  statut
FROM profil
WHERE nom = 'MADANI' AND prenom = 'WAJDI';

-- 2. Voir TOUS les contrats de WAJDI (peu importe le statut)
SELECT
  c.id,
  c.profil_id,
  c.type,
  c.statut,
  c.date_debut,
  c.date_fin,
  c.date_signature,
  c.yousign_signature_request_id,
  c.yousign_signer_id,
  c.yousign_signed_at,
  c.created_at,
  c.updated_at,
  p.nom,
  p.prenom,
  p.email
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE p.nom = 'MADANI' AND p.prenom = 'WAJDI'
ORDER BY c.created_at DESC;

-- 3. Vérifier tous les statuts possibles dans la table contrat
SELECT DISTINCT statut
FROM contrat
ORDER BY statut;
