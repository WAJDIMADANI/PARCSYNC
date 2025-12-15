/*
  # Correction : Affichage des CDD expirés dans la vue incidents_ouverts_rh

  Le problème : Les incidents CDD sont créés avec type='contrat_expire' et metadata->>'contrat_type'='cdd'
  Mais la vue cherche type='contrat_cdd_expire' qui n'existe pas.

  Solution : Recréer la vue pour qu'elle filtre correctement les CDD expirés
*/

-- Supprimer l'ancienne vue
DROP VIEW IF EXISTS incidents_ouverts_rh CASCADE;

-- Recréer la vue avec le bon filtrage pour les CDD
CREATE VIEW incidents_ouverts_rh AS
SELECT
  i.id,
  i.profil_id,
  i.type as type_incident,
  i.description,
  i.statut,
  i.gravite,
  i.date_expiration,
  i.date_resolution,
  i.resolu_par,
  i.resolution_notes,
  i.created_at,
  i.updated_at,
  i.metadata,
  p.nom,
  p.prenom,
  p.matricule,
  p.email,
  p.telephone,
  -- Calculer les jours restants
  CASE
    WHEN i.date_expiration IS NOT NULL
    THEN (i.date_expiration - CURRENT_DATE)
    ELSE NULL
  END as jours_restants,
  -- Ajouter le type de contrat depuis les métadonnées
  i.metadata->>'contrat_type' as contrat_type
FROM incident i
LEFT JOIN profil p ON p.id = i.profil_id
WHERE i.statut != 'resolu'
ORDER BY
  CASE i.gravite
    WHEN 'critique' THEN 1
    WHEN 'haute' THEN 2
    WHEN 'moyenne' THEN 3
    WHEN 'basse' THEN 4
    ELSE 5
  END,
  i.date_expiration NULLS LAST;

-- Vérifier que ça fonctionne pour les CDD
SELECT
  'Test : CDD expirés dans la vue' as test,
  nom,
  prenom,
  type_incident,
  contrat_type,
  date_expiration,
  jours_restants
FROM incidents_ouverts_rh
WHERE type_incident = 'contrat_expire'
  AND contrat_type = 'cdd';
