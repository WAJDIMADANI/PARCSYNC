/*
  # Créer la vue v_gestion_documents_expires

  1. Vue
    - Unifie tous les incidents avec les données complètes des salariés
    - Inclut les informations du profil (nom, prénom, email, matricule)
    - Exclut automatiquement les salariés inactifs
    - Filtre les incidents non résolus

  2. Colonnes
    - Toutes les colonnes de la table incident
    - Informations enrichies du profil (prenom, nom, email, matricule_tca)
    - Données du contrat si applicable

  3. Filtres appliqués
    - statut != 'resolu'
    - profil.statut != 'inactif'
*/

-- Supprimer la vue si elle existe
DROP VIEW IF EXISTS v_gestion_documents_expires;

-- Créer la vue avec toutes les données nécessaires
CREATE VIEW v_gestion_documents_expires AS
SELECT
  i.id,
  i.type,
  i.profil_id,
  i.contrat_id,
  i.date_expiration_originale,
  i.date_creation_incident,
  i.statut,
  i.date_resolution,
  i.nouvelle_date_validite,
  i.notes,
  i.metadata,
  i.created_at,
  i.updated_at,
  -- Informations du profil
  p.prenom,
  p.nom,
  p.email,
  p.matricule_tca,
  -- Informations du contrat si applicable
  c.type as contrat_type,
  c.date_debut as contrat_date_debut,
  c.date_fin as contrat_date_fin,
  c.statut as contrat_statut
FROM incident i
INNER JOIN profil p ON i.profil_id = p.id
LEFT JOIN contrat c ON i.contrat_id = c.id
WHERE
  i.statut != 'resolu'
  AND (p.statut IS NULL OR p.statut != 'inactif');

-- Ajouter un commentaire sur la vue
COMMENT ON VIEW v_gestion_documents_expires IS 'Vue consolidée des incidents de documents expirés avec informations complètes des salariés (exclut les résolus et inactifs)';
