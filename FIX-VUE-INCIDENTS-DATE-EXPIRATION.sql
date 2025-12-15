/*
  CORRECTION: Mettre à jour la vue v_incidents_contrats_affichables

  Problème:
  - La vue sélectionne i.* mais ne rend pas explicite date_expiration_effective

  Solution:
  - Recréer la vue en exposant explicitement toutes les colonnes nécessaires
*/

CREATE OR REPLACE VIEW v_incidents_contrats_affichables AS
SELECT
  i.id,
  i.type,
  i.profil_id,
  i.contrat_id,
  i.date_expiration_effective,
  i.date_creation_incident,
  i.statut,
  i.created_at,
  i.updated_at,
  p.nom,
  p.prenom,
  p.email,
  c.type as contrat_type,
  c.date_debut as contrat_date_debut,
  c.date_fin as contrat_date_fin,
  c.statut as contrat_statut
FROM incident i
INNER JOIN profil p ON i.profil_id = p.id
LEFT JOIN contrat c ON i.contrat_id = c.id
WHERE i.type = 'contrat_expire'
  -- Exclure les profils ayant un CDI actif
  AND NOT EXISTS (
    SELECT 1
    FROM v_profils_cdi_actif cdi
    WHERE cdi.profil_id = i.profil_id
  )
ORDER BY i.date_expiration_effective ASC;

-- Vérifier la vue
SELECT * FROM v_incidents_contrats_affichables LIMIT 3;
