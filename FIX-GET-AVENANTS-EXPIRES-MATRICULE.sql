/*
  # Correction : Remplacer p.matricule par p.matricule_tca dans get_avenants_expires()
  
  Pour éviter la même erreur que get_cdd_expires()
*/

-- Recréer la fonction avec le bon nom de colonne
CREATE OR REPLACE FUNCTION get_avenants_expires()
RETURNS TABLE (
  profil_id uuid,
  contrat_id uuid,
  nom text,
  prenom text,
  matricule_tca text,
  email text,
  date_expiration_reelle date,
  jours_depuis_expiration integer,
  contrat_statut text,
  contrat_date_debut date,
  contrat_date_fin date,
  avenant_1_date_fin date,
  avenant_2_date_fin date
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as profil_id,
    c.id as contrat_id,
    p.nom,
    p.prenom,
    p.matricule_tca,  -- Correction ici : matricule_tca au lieu de matricule
    p.email,
    GREATEST(
      c.avenant_1_date_fin,
      c.avenant_2_date_fin
    ) as date_expiration_reelle,
    (CURRENT_DATE - GREATEST(
      c.avenant_1_date_fin,
      c.avenant_2_date_fin
    ))::integer as jours_depuis_expiration,
    c.statut as contrat_statut,
    c.date_debut as contrat_date_debut,
    c.date_fin as contrat_date_fin,
    c.avenant_1_date_fin,
    c.avenant_2_date_fin
  FROM profil p
  INNER JOIN contrat c ON c.profil_id = p.id
  WHERE c.type = 'CDD'
    AND (c.avenant_1_date_fin IS NOT NULL OR c.avenant_2_date_fin IS NOT NULL)
    AND c.statut IN ('actif', 'signed', 'signe', 'en_attente_signature', 'envoye')
    AND GREATEST(
      c.avenant_1_date_fin,
      c.avenant_2_date_fin
    ) < CURRENT_DATE
  ORDER BY date_expiration_reelle DESC;
END;
$$;

-- Test : Vérifier que ça fonctionne maintenant
SELECT 
  'Test : Avenants expirés' as test,
  prenom,
  nom,
  email,
  matricule_tca,
  date_expiration_reelle,
  jours_depuis_expiration,
  contrat_statut
FROM get_avenants_expires()
ORDER BY date_expiration_reelle;
