/*
  # Vues pour gestion intelligente des contrats expirés

  1. Vue `v_profils_cdi_actif`
     - Liste tous les profils ayant un CDI actif
     - Un salarié avec CDI actif ne doit jamais apparaître comme "contrat expiré"

  2. Vue `v_incidents_contrats_affichables`
     - Liste tous les incidents de type "contrat_expire"
     - EXCLUT les profils ayant un CDI actif
     - Utilisée pour l'affichage dans les onglets CDD/Avenant

  Règle métier :
  - Si salarié a CDI actif → aucun incident "contrat expiré" ne s'affiche
  - Les anciens CDD d'un salarié en CDI ne sont plus pertinents
*/

-- Vue : profils avec un CDI actif
CREATE OR REPLACE VIEW v_profils_cdi_actif AS
SELECT DISTINCT p.id as profil_id
FROM profil p
INNER JOIN contrat c ON c.profil_id = p.id
WHERE c.type = 'CDI'
  AND c.statut = 'actif'
  AND c.deleted_at IS NULL;

-- Vue : incidents de contrats affichables (exclut les profils avec CDI actif)
CREATE OR REPLACE VIEW v_incidents_contrats_affichables AS
SELECT
  i.*,
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
  );

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_contrat_type_statut ON contrat(type, statut) WHERE deleted_at IS NULL;

-- Commentaires
COMMENT ON VIEW v_profils_cdi_actif IS 'Liste des profils ayant un CDI actif - ces profils ne doivent pas apparaître dans les incidents de contrats expirés';
COMMENT ON VIEW v_incidents_contrats_affichables IS 'Incidents de contrats expirés affichables - exclut les profils avec CDI actif';
