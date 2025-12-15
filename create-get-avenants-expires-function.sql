/*
  # Fonction pour récupérer les avenants expirés

  1. Fonction
    - `get_avenants_expires()` : Retourne les avenants expirés avec la logique exacte
    - Vérifie modele_contrat LIKE '%Avenant%'
    - Calcule GREATEST des dates d'avenants
    - Exclut les profils avec CDI actif

  2. Logique
    - Récupère les profils dont le modèle contient "Avenant"
    - Vérifie qu'au moins une date d'avenant existe
    - Calcule la date d'expiration avec GREATEST
    - Exclut les profils ayant un contrat CDI actif
    - Retourne uniquement ceux qui sont expirés (< CURRENT_DATE)
*/

CREATE OR REPLACE FUNCTION get_avenants_expires()
RETURNS TABLE (
  profil_id uuid,
  nom text,
  prenom text,
  email text,
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
  WITH avenants_expires AS (
    SELECT
      p.id as profil_id,
      p.nom,
      p.prenom,
      p.email,
      c.id as contrat_id,
      c.type as contrat_type,
      c.date_debut as contrat_date_debut,
      c.date_fin as contrat_date_fin,
      c.statut as contrat_statut,
      c.avenant_1_date_fin,
      c.avenant_2_date_fin,
      GREATEST(
        COALESCE(c.avenant_1_date_fin, '1900-01-01'::date),
        COALESCE(c.avenant_2_date_fin, '1900-01-01'::date)
      ) as date_expiration_reelle
    FROM profil p
    INNER JOIN contrat c ON c.profil_id = p.id
    WHERE
      c.modele_contrat LIKE '%Avenant%'
      AND (c.avenant_1_date_fin IS NOT NULL OR c.avenant_2_date_fin IS NOT NULL)
      AND p.statut = 'actif'
  ),
  profils_avec_cdi_actif AS (
    SELECT DISTINCT profil_id
    FROM contrat
    WHERE LOWER(type) = 'cdi'
      AND statut = 'actif'
  )
  SELECT
    av.profil_id,
    av.nom,
    av.prenom,
    av.email,
    av.date_expiration_reelle,
    av.contrat_id,
    av.contrat_type,
    av.contrat_date_debut,
    av.contrat_date_fin,
    av.contrat_statut,
    av.avenant_1_date_fin,
    av.avenant_2_date_fin,
    (CURRENT_DATE - av.date_expiration_reelle) as jours_depuis_expiration
  FROM avenants_expires av
  WHERE NOT EXISTS (
    SELECT 1
    FROM profils_avec_cdi_actif pcdi
    WHERE pcdi.profil_id = av.profil_id
  )
  AND av.date_expiration_reelle < CURRENT_DATE
  ORDER BY av.date_expiration_reelle ASC;
END;
$$ LANGUAGE plpgsql;

-- Donner accès à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION get_avenants_expires TO authenticated;
