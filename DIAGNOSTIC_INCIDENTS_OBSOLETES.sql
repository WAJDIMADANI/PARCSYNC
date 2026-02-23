-- ============================================================================
-- DIAGNOSTIC : Incidents obsolètes de contrat expiré
-- ============================================================================
-- Ce script identifie les salariés qui ont un incident "contrat_expire" 
-- alors qu'ils ont un contrat plus récent actif/signé
-- ============================================================================

SELECT 
  p.nom,
  p.prenom,
  p.matricule_tca,
  i.type as type_incident,
  i.statut as statut_incident,
  i.date_expiration_originale as date_exp_incident,
  c_recent.type as type_contrat_recent,
  c_recent.statut as statut_contrat_recent,
  c_recent.date_debut as date_debut_contrat_recent,
  c_recent.date_fin as date_fin_contrat_recent,
  'INCIDENT OBSOLETE' as diagnostic
FROM incident i
JOIN profil p ON p.id = i.profil_id
JOIN LATERAL (
  SELECT c.type, c.statut, c.date_debut, c.date_fin
  FROM contrat c
  WHERE c.profil_id = i.profil_id
    AND c.statut IN ('signe', 'actif')
    AND c.date_fin IS NOT NULL
    AND c.date_debut > i.date_expiration_originale
    AND c.date_fin > CURRENT_DATE
  ORDER BY c.date_debut DESC
  LIMIT 1
) c_recent ON true
WHERE 
  i.type = 'contrat_expire'
  AND i.statut IN ('actif', 'expire')
ORDER BY p.nom, p.prenom;

-- Compter les incidents obsolètes
SELECT COUNT(*) as nombre_incidents_obsoletes
FROM incident i
WHERE i.type = 'contrat_expire'
  AND i.statut IN ('actif', 'expire')
  AND EXISTS (
    SELECT 1
    FROM contrat c
    WHERE c.profil_id = i.profil_id
      AND c.statut IN ('signe', 'actif')
      AND c.date_fin IS NOT NULL
      AND c.date_debut > i.date_expiration_originale
      AND c.date_fin > CURRENT_DATE
  );
