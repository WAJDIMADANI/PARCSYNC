/*
  # Correction : Remplacer p.matricule par p.matricule_tca dans get_cdd_expires()
  
  Erreur : column p.matricule does not exist
  Solution : Utiliser p.matricule_tca qui est le bon nom de colonne
*/

-- Recréer la fonction avec le bon nom de colonne
CREATE OR REPLACE FUNCTION get_cdd_expires()
RETURNS TABLE (
  profil_id uuid,
  contrat_id uuid,
  nom text,
  prenom text,
  matricule_tca text,
  email text,
  date_expiration_reelle date,
  jours_avant_expiration integer,
  contrat_statut text,
  contrat_date_debut date,
  contrat_date_fin date
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
    c.date_fin as date_expiration_reelle,
    (c.date_fin - CURRENT_DATE)::integer as jours_avant_expiration,
    c.statut as contrat_statut,
    c.date_debut as contrat_date_debut,
    c.date_fin as contrat_date_fin
  FROM profil p
  INNER JOIN contrat c ON c.profil_id = p.id
  WHERE c.type = 'CDD'
    AND c.date_fin IS NOT NULL
    -- Inclure les contrats actifs ET signés (statut Yousign)
    AND c.statut IN ('actif', 'signed', 'signe', 'en_attente_signature', 'envoye')
    -- Afficher TOUS les contrats expirés ou qui vont expirer (sans limite de 30 jours)
    AND c.date_fin <= CURRENT_DATE + INTERVAL '90 days'
  ORDER BY c.date_fin ASC;
END;
$$;

-- Test : Vérifier que ça fonctionne maintenant
SELECT 
  'Test : CDD expirés' as test,
  prenom,
  nom,
  email,
  matricule_tca,
  date_expiration_reelle,
  jours_avant_expiration,
  contrat_statut
FROM get_cdd_expires()
ORDER BY date_expiration_reelle;
