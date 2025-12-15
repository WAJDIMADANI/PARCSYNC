/*
  # CORRECTION COMPLÈTE : Affichage des CDD dans les incidents
  
  Problème : La fonction get_cdd_expires() utilise p.matricule qui n'existe pas
  Solution : Remplacer par p.matricule_tca
*/

-- ==============================================
-- 1. CORRIGER get_cdd_expires()
-- ==============================================
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
    p.matricule_tca,
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
    AND c.statut IN ('actif', 'signed', 'signe', 'en_attente_signature', 'envoye')
    AND c.date_fin <= CURRENT_DATE + INTERVAL '90 days'
  ORDER BY c.date_fin ASC;
END;
$$;

-- ==============================================
-- 2. CORRIGER get_avenants_expires()
-- ==============================================
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
    p.matricule_tca,
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

-- ==============================================
-- 3. TESTER : Vérifier que BUSIN et ATIK apparaissent
-- ==============================================
SELECT '=== 🔍 Test : CDD expirés (devrait inclure BUSIN et ATIK) ===' as test;
SELECT 
  prenom,
  nom,
  email,
  date_expiration_reelle,
  jours_avant_expiration,
  contrat_statut
FROM get_cdd_expires()
WHERE email IN ('anissa-busin@hotmail.com', 'kaoutar.r@hotmail.fr')
ORDER BY date_expiration_reelle;

-- Afficher TOUS les CDD
SELECT '=== 📊 Tous les CDD expirés ===' as test;
SELECT 
  prenom,
  nom,
  date_expiration_reelle,
  jours_avant_expiration
FROM get_cdd_expires()
ORDER BY date_expiration_reelle;
