/*
  Script de détection des doublons de matricule TCA

  Ce script identifie tous les profils ayant le même matricule TCA
  et affiche les informations pour faciliter la fusion manuelle.
*/

-- Afficher tous les doublons de matricule TCA
SELECT
  matricule_tca,
  COUNT(*) as nombre_doublons,
  STRING_AGG(id::text, ', ') as profil_ids,
  STRING_AGG(nom || ' ' || prenom, ' | ') as noms,
  STRING_AGG(email, ' | ') as emails,
  STRING_AGG(created_at::text, ' | ') as dates_creation
FROM profil
WHERE matricule_tca IS NOT NULL
GROUP BY matricule_tca
HAVING COUNT(*) > 1
ORDER BY nombre_doublons DESC, matricule_tca;

-- Détails des profils en doublon
SELECT
  p.matricule_tca,
  p.id as profil_id,
  p.nom,
  p.prenom,
  p.email,
  p.statut,
  p.date_entree,
  p.created_at,
  (SELECT COUNT(*) FROM contrat WHERE profil_id = p.id) as nombre_contrats,
  (SELECT COUNT(*) FROM document WHERE owner_id = p.id AND owner_type = 'profil') as nombre_documents
FROM profil p
WHERE p.matricule_tca IN (
  SELECT matricule_tca
  FROM profil
  WHERE matricule_tca IS NOT NULL
  GROUP BY matricule_tca
  HAVING COUNT(*) > 1
)
ORDER BY p.matricule_tca, p.created_at DESC;
