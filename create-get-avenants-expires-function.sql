/*
  # Fonction pour récupérer les avenants expirés

  1. Fonction
    - `get_avenants_expires()` : Retourne les avenants expirés avec la logique exacte
    - Calcule GREATEST(avenant_2_date_fin, avenant_1_date_fin) comme date d'expiration
    - Exclut les profils avec CDI (type='cdi' OU date_fin IS NULL)

  2. Logique
    - Récupère les profils qui ont des dates d'avenant
    - Calcule la date d'expiration avec GREATEST (avenant_2 prioritaire)
    - Exclut complètement les profils ayant un CDI (type='cdi' OU date_fin IS NULL)
    - Retourne uniquement ceux qui sont expirés (< CURRENT_DATE)
*/

CREATE OR REPLACE FUNCTION get_avenants_expires()
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
  avenant_1_date_fin date,
  avenant_2_date_fin date,
  jours_depuis_expiration integer
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as profil_id,
    p.nom,
    p.prenom,
    p.email,
    p.matricule_tca,
    GREATEST(
      COALESCE(c.avenant_2_date_fin, '1900-01-01'::date),
      COALESCE(c.avenant_1_date_fin, '1900-01-01'::date)
    ) as date_expiration_reelle,
    c.id as contrat_id,
    c.type as contrat_type,
    c.date_debut as contrat_date_debut,
    c.date_fin as contrat_date_fin,
    c.statut as contrat_statut,
    c.avenant_1_date_fin,
    c.avenant_2_date_fin,
    (CURRENT_DATE - GREATEST(
      COALESCE(c.avenant_2_date_fin, '1900-01-01'::date),
      COALESCE(c.avenant_1_date_fin, '1900-01-01'::date)
    )) as jours_depuis_expiration
  FROM profil p
  INNER JOIN contrat c ON c.profil_id = p.id
  WHERE
    p.statut = 'actif'
    AND (c.avenant_1_date_fin IS NOT NULL OR c.avenant_2_date_fin IS NOT NULL)
    AND GREATEST(
      COALESCE(c.avenant_2_date_fin, '1900-01-01'::date),
      COALESCE(c.avenant_1_date_fin, '1900-01-01'::date)
    ) < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1
      FROM contrat c2
      WHERE c2.profil_id = p.id
        AND (LOWER(c2.type) = 'cdi' OR c2.date_fin IS NULL)
    )
  ORDER BY date_expiration_reelle ASC;
END;
$$ LANGUAGE plpgsql;

-- Donner accès à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION get_avenants_expires TO authenticated;
