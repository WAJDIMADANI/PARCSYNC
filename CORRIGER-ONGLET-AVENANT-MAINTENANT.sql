/*
  Correction de l'onglet Avenant - Afficher uniquement les avenants expirés

  Source unique : table profil (avenant_1_date_fin, avenant_2_date_fin)
  Exclusion stricte des salariés avec CDI
  1 ligne par profil (pas de doublons)
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.get_avenants_expires();

-- Créer la nouvelle fonction fiabilisée
CREATE FUNCTION public.get_avenants_expires()
RETURNS TABLE (
  profil_id uuid,
  nom text,
  prenom text,
  email text,
  avenant_1_date_fin date,
  avenant_2_date_fin date,
  date_expiration_reelle date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (p.id)
    p.id AS profil_id,
    p.nom,
    p.prenom,
    p.email,
    p.avenant_1_date_fin,
    p.avenant_2_date_fin,
    GREATEST(
      COALESCE(p.avenant_2_date_fin, DATE '1900-01-01'),
      COALESCE(p.avenant_1_date_fin, DATE '1900-01-01')
    ) AS date_expiration_reelle
  FROM public.profil p
  WHERE p.statut = 'actif'
    AND (p.avenant_1_date_fin IS NOT NULL OR p.avenant_2_date_fin IS NOT NULL)
    AND GREATEST(
      COALESCE(p.avenant_2_date_fin, DATE '1900-01-01'),
      COALESCE(p.avenant_1_date_fin, DATE '1900-01-01')
    ) < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1
      FROM public.contrat c
      WHERE c.profil_id = p.id
        AND (LOWER(c.type) = 'cdi' OR c.date_fin IS NULL)
    )
  ORDER BY p.id, date_expiration_reelle DESC;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION public.get_avenants_expires() TO authenticated;

-- Vérification : combien d'avenants expirés ?
SELECT COUNT(*) as total_avenants_expires
FROM public.get_avenants_expires();

-- Afficher les premiers résultats
SELECT
  nom,
  prenom,
  avenant_1_date_fin,
  avenant_2_date_fin,
  date_expiration_reelle,
  CURRENT_DATE - date_expiration_reelle as jours_expires
FROM public.get_avenants_expires()
ORDER BY date_expiration_reelle
LIMIT 10;
