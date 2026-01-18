/*
  # Fix get_avenants_expires - Détection robuste des CDI

  1. Modifications
    - Remplace le bloc AND NOT EXISTS pour détecter les CDI de manière robuste
    - Vérifie statut in ('actif','signe')
    - Détecte CDI si date_fin IS NULL OU type contient 'cdi', 'indetermin', 'indétermin'

  2. Sécurité
    - Conserve toute la logique existante
    - Modifie uniquement la détection des CDI
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
      COALESCE(p.avenant_2_date_fin, '1900-01-01'::date),
      COALESCE(p.avenant_1_date_fin, '1900-01-01'::date)
    ) as date_expiration_reelle,
    c.id as contrat_id,
    c.type as contrat_type,
    c.date_debut as contrat_date_debut,
    c.date_fin as contrat_date_fin,
    c.statut as contrat_statut,
    p.avenant_1_date_fin,
    p.avenant_2_date_fin,
    (CURRENT_DATE - GREATEST(
      COALESCE(p.avenant_2_date_fin, '1900-01-01'::date),
      COALESCE(p.avenant_1_date_fin, '1900-01-01'::date)
    )) as jours_depuis_expiration
  FROM profil p
  LEFT JOIN contrat c ON c.profil_id = p.id
  WHERE
    p.statut = 'actif'
    AND (p.avenant_1_date_fin IS NOT NULL OR p.avenant_2_date_fin IS NOT NULL)
    AND GREATEST(
      COALESCE(p.avenant_2_date_fin, '1900-01-01'::date),
      COALESCE(p.avenant_1_date_fin, '1900-01-01'::date)
    ) < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1
      FROM contrat c2
      WHERE c2.profil_id = p.id
        AND c2.statut IN ('actif', 'signe')
        AND (
          c2.date_fin IS NULL
          OR LOWER(TRIM(c2.type)) LIKE '%cdi%'
          OR LOWER(TRIM(c2.type)) LIKE '%indetermin%'
          OR LOWER(TRIM(c2.type)) LIKE '%indétermin%'
        )
    )
  ORDER BY date_expiration_reelle ASC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_avenants_expires TO authenticated;
