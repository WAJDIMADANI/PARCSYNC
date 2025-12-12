/*
  # Créer la vue v_incidents_ouverts_rh

  Cette vue filtre les incidents pour le tableau de bord RH en ne montrant que les incidents ouverts.

  1. Vue créée
    - `v_incidents_ouverts_rh`: Vue des incidents non résolus avec les informations du profil
      - Filtre les incidents avec statut != 'resolu'
      - Joint avec la table profil pour obtenir nom et prénom
      - Utile pour le dashboard RH

  2. Colonnes incluses
    - Toutes les colonnes de la table incident
    - nom et prénom du profil associé
*/

-- Supprimer la vue si elle existe déjà
DROP VIEW IF EXISTS v_incidents_ouverts_rh;

-- Créer la vue pour les incidents ouverts (non résolus)
CREATE VIEW v_incidents_ouverts_rh AS
SELECT
  i.*,
  p.nom,
  p.prenom,
  p.matricule_tca
FROM incident i
INNER JOIN profil p ON i.profil_id = p.id
WHERE i.statut IN ('actif', 'en_cours', 'ignore')
ORDER BY i.date_creation_incident DESC;

-- Ajouter un commentaire à la vue
COMMENT ON VIEW v_incidents_ouverts_rh IS 'Vue des incidents ouverts (non résolus) pour le tableau de bord RH';
