/*
  # Correction fonction get_cdd_expires - Inclure les contrats signés

  1. Modifications
    - Inclure les contrats avec statut 'signed' en plus de 'actif'
    - Supprimer la limite de 30 jours pour les contrats expirés
    - Garder la limite de 30 jours uniquement pour les contrats à venir

  2. Logique
    - Un contrat est considéré comme "à traiter" si :
      * Il est déjà expiré (quelle que soit la date)
      * OU il va expirer dans les 30 prochains jours
*/

CREATE OR REPLACE FUNCTION get_cdd_expires()
RETURNS TABLE (
  profil_id uuid,
  nom text,
  prenom text,
  email text,
  matricule_tca text,
  date_expiration_reelle date,
  contrat_id uuid,
  contrat_type text,
  contrat_date_debut date,
  contrat_date_fin date,
  contrat_statut text,
  jours_avant_expiration integer
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH cdd_avec_date_reelle AS (
    SELECT
      p.id as profil_id,
      p.nom,
      p.prenom,
      p.email,
      p.matricule_tca,
      c.id as contrat_id,
      c.type as contrat_type,
      c.date_debut as contrat_date_debut,
      c.date_fin as contrat_date_fin,
      c.statut as contrat_statut,
      GREATEST(
        c.date_fin,
        COALESCE(c.date_fin_avenant1, c.date_fin),
        COALESCE(c.date_fin_avenant2, c.date_fin)
      ) as date_expiration_reelle
    FROM profil p
    INNER JOIN contrat c ON c.profil_id = p.id
    WHERE
      LOWER(c.type) = 'cdd'
      AND c.statut IN ('actif', 'signed')  -- Inclure les contrats signés
      AND p.statut = 'actif'
  ),
  profils_avec_cdi_actif AS (
    SELECT DISTINCT profil_id
    FROM contrat
    WHERE LOWER(type) = 'cdi'
      AND statut = 'actif'
  )
  SELECT
    cdd.profil_id,
    cdd.nom,
    cdd.prenom,
    cdd.email,
    cdd.matricule_tca,
    cdd.date_expiration_reelle,
    cdd.contrat_id,
    cdd.contrat_type,
    cdd.contrat_date_debut,
    cdd.contrat_date_fin,
    cdd.contrat_statut,
    (cdd.date_expiration_reelle - CURRENT_DATE) as jours_avant_expiration
  FROM cdd_avec_date_reelle cdd
  WHERE NOT EXISTS (
    SELECT 1
    FROM profils_avec_cdi_actif pcdi
    WHERE pcdi.profil_id = cdd.profil_id
  )
  -- Inclure TOUS les contrats expirés + ceux qui vont expirer dans 30 jours
  AND (
    cdd.date_expiration_reelle < CURRENT_DATE  -- Déjà expiré
    OR cdd.date_expiration_reelle <= (CURRENT_DATE + INTERVAL '30 days')  -- Va expirer dans 30 jours
  )
  ORDER BY cdd.date_expiration_reelle ASC;
END;
$$ LANGUAGE plpgsql;

-- Donner accès à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION get_cdd_expires TO authenticated;
