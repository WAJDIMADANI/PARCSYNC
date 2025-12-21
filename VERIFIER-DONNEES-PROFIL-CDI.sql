-- ========================================
-- VÉRIFIER LES DONNÉES D'UN PROFIL POUR CDI
-- ========================================

-- Remplacez 'MATRICULE_ICI' par le matricule du salarié
-- ou 'EMAIL_ICI' par son email

-- Méthode 1 : Par matricule
SELECT
  'INFORMATIONS PROFIL' as section,
  id,
  matricule_tca,
  nom,
  prenom,
  email,
  date_naissance,
  lieu_naissance,
  nationalite,
  adresse,
  ville,
  code_postal,
  numero_piece_identite,
  numero_securite_sociale,
  statut,
  CASE
    WHEN nom IS NULL OR nom = '' THEN '❌ Nom manquant'
    WHEN prenom IS NULL OR prenom = '' THEN '❌ Prénom manquant'
    WHEN date_naissance IS NULL THEN '❌ Date de naissance manquante'
    WHEN lieu_naissance IS NULL OR lieu_naissance = '' THEN '❌ Lieu de naissance manquant'
    WHEN nationalite IS NULL OR nationalite = '' THEN '❌ Nationalité manquante'
    WHEN adresse IS NULL OR adresse = '' THEN '❌ Adresse manquante'
    WHEN ville IS NULL OR ville = '' THEN '❌ Ville manquante'
    WHEN code_postal IS NULL OR code_postal = '' THEN '❌ Code postal manquant'
    WHEN (numero_piece_identite IS NULL OR numero_piece_identite = '')
      AND (numero_securite_sociale IS NULL OR numero_securite_sociale = '') THEN '❌ Numéro ID manquant'
    ELSE '✅ Toutes les données sont présentes'
  END as verification
FROM profil
WHERE matricule_tca = 'MATRICULE_ICI'; -- Changez ici

-- Méthode 2 : Par email
-- SELECT
--   'INFORMATIONS PROFIL' as section,
--   id,
--   matricule_tca,
--   nom,
--   prenom,
--   email,
--   date_naissance,
--   lieu_naissance,
--   nationalite,
--   adresse,
--   ville,
--   code_postal,
--   numero_piece_identite,
--   numero_securite_sociale,
--   statut
-- FROM profil
-- WHERE email = 'EMAIL_ICI'; -- Changez ici

-- ========================================
-- VÉRIFIER LES CONTRATS CDI DU PROFIL
-- ========================================

SELECT
  'CONTRATS CDI' as section,
  c.id,
  c.type,
  c.date_debut,
  c.date_fin,
  c.statut,
  c.yousign_signature_request_id,
  CASE
    WHEN c.date_debut IS NULL THEN '❌ Date de début manquante'
    ELSE '✅ Date de début présente: ' || c.date_debut::text
  END as verification_date
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE p.matricule_tca = 'MATRICULE_ICI' -- Changez ici
  AND LOWER(c.type) = 'cdi'
ORDER BY c.date_debut DESC;

-- ========================================
-- VÉRIFIER LES VARIABLES DU CONTRAT
-- ========================================

SELECT
  'VARIABLES CONTRAT' as section,
  c.id as contrat_id,
  c.variables
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE p.matricule_tca = 'MATRICULE_ICI' -- Changez ici
  AND LOWER(c.type) = 'cdi'
ORDER BY c.created_at DESC
LIMIT 1;

-- ========================================
-- DIAGNOSTIC COMPLET
-- ========================================

WITH profil_data AS (
  SELECT
    p.id,
    p.matricule_tca,
    p.nom,
    p.prenom,
    p.email,
    p.date_naissance,
    p.lieu_naissance,
    p.nationalite,
    p.adresse,
    p.ville,
    p.code_postal,
    p.numero_piece_identite,
    p.numero_securite_sociale
  FROM profil p
  WHERE p.matricule_tca = 'MATRICULE_ICI' -- Changez ici
)
SELECT
  'DIAGNOSTIC COMPLET' as section,
  CASE WHEN nom IS NOT NULL AND nom != '' THEN '✅' ELSE '❌' END || ' Nom: ' || COALESCE(nom, 'VIDE') as check_nom,
  CASE WHEN prenom IS NOT NULL AND prenom != '' THEN '✅' ELSE '❌' END || ' Prénom: ' || COALESCE(prenom, 'VIDE') as check_prenom,
  CASE WHEN date_naissance IS NOT NULL THEN '✅' ELSE '❌' END || ' Date naissance: ' || COALESCE(date_naissance::text, 'VIDE') as check_birthday,
  CASE WHEN lieu_naissance IS NOT NULL AND lieu_naissance != '' THEN '✅' ELSE '❌' END || ' Lieu naissance: ' || COALESCE(lieu_naissance, 'VIDE') as check_birthplace,
  CASE WHEN nationalite IS NOT NULL AND nationalite != '' THEN '✅' ELSE '❌' END || ' Nationalité: ' || COALESCE(nationalite, 'VIDE') as check_nationality,
  CASE WHEN adresse IS NOT NULL AND adresse != '' THEN '✅' ELSE '❌' END || ' Adresse: ' || COALESCE(adresse, 'VIDE') as check_address,
  CASE WHEN ville IS NOT NULL AND ville != '' THEN '✅' ELSE '❌' END || ' Ville: ' || COALESCE(ville, 'VIDE') as check_city,
  CASE WHEN code_postal IS NOT NULL AND code_postal != '' THEN '✅' ELSE '❌' END || ' Code postal: ' || COALESCE(code_postal, 'VIDE') as check_zip,
  CASE
    WHEN (numero_piece_identite IS NOT NULL AND numero_piece_identite != '')
      OR (numero_securite_sociale IS NOT NULL AND numero_securite_sociale != '')
    THEN '✅' ELSE '❌'
  END || ' Numéro ID: ' || COALESCE(numero_piece_identite, numero_securite_sociale, 'VIDE') as check_id_number
FROM profil_data;

-- ========================================
-- EXEMPLE DE MISE À JOUR SI DONNÉES MANQUANTES
-- ========================================

/*
-- Décommentez et adaptez cette requête si vous devez mettre à jour les données

UPDATE profil
SET
  nom = 'NOM_DU_SALARIE',
  prenom = 'PRENOM_DU_SALARIE',
  date_naissance = '1990-01-15',
  lieu_naissance = 'Paris',
  nationalite = 'Française',
  adresse = '123 rue Example',
  ville = 'Paris',
  code_postal = '75001',
  numero_piece_identite = 'AB123456'
WHERE matricule_tca = 'MATRICULE_ICI';

-- Vérifier la mise à jour
SELECT * FROM profil WHERE matricule_tca = 'MATRICULE_ICI';
*/
