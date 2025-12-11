/*
  # DIAGNOSTIC COMPLET DU CONTRAT DE WAJDI

  Ce script affiche TOUTES les informations du contrat pour comprendre
  pourquoi la correction n'a pas fonctionné.
*/

-- ========================================
-- 1. TOUTES LES COLONNES DU CONTRAT
-- ========================================
SELECT
  '=== INFORMATIONS DU CONTRAT ===' as section,
  id,
  profil_id,
  modele_id,
  type,
  date_debut,
  date_fin,
  statut,
  yousign_signature_request_id,
  source,
  created_at,
  variables
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 2. EXTRACTION DES VARIABLES JSON
-- ========================================
SELECT
  '=== VARIABLES JSON ===' as section,
  variables->>'type_contrat' as type_contrat_from_json,
  variables->>'date_debut' as date_debut_from_json,
  variables->>'date_fin' as date_fin_from_json,
  variables->>'nom' as nom,
  variables->>'prenom' as prenom,
  jsonb_pretty(variables) as all_variables
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 3. INFORMATIONS DU MODÈLE (si existe)
-- ========================================
SELECT
  '=== MODÈLE CONTRAT ===' as section,
  m.id as modele_id,
  m.nom as modele_nom,
  m.type_contrat as modele_type_contrat
FROM contrat c
LEFT JOIN modeles_contrats m ON c.modele_id = m.id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 4. INFORMATIONS DU PROFIL
-- ========================================
SELECT
  '=== PROFIL ===' as section,
  p.id,
  p.matricule_tca,
  p.nom,
  p.prenom,
  p.statut
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 5. VÉRIFIER SI LE CONTRAT SERAIT CORRIGÉ
-- ========================================
SELECT
  '=== TEST DE CORRECTION ===' as section,
  CASE
    WHEN c.modele_id IS NULL THEN '❌ Pas de modele_id'
    ELSE '✅ modele_id existe'
  END as check_modele_id,
  CASE
    WHEN c.yousign_signature_request_id IS NULL THEN '❌ Pas de yousign_signature_request_id'
    ELSE '✅ yousign_signature_request_id existe'
  END as check_yousign,
  CASE
    WHEN c.variables->>'type_contrat' IS NULL THEN '❌ Pas de type_contrat dans variables'
    ELSE '✅ type_contrat dans variables: ' || (c.variables->>'type_contrat')
  END as check_type_in_variables,
  CASE
    WHEN c.variables->>'date_fin' IS NULL THEN '❌ Pas de date_fin dans variables'
    ELSE '✅ date_fin dans variables: ' || (c.variables->>'date_fin')
  END as check_date_fin_in_variables,
  CASE
    WHEN c.type IS NULL OR c.type = '' THEN '⚠️ Type NULL → SERA CORRIGÉ'
    ELSE '✅ Type déjà rempli: ' || c.type
  END as correction_type,
  CASE
    WHEN c.date_fin IS NULL THEN '⚠️ Date_fin NULL → SERA CORRIGÉ (si info existe)'
    ELSE '✅ Date_fin déjà remplie: ' || c.date_fin::text
  END as correction_date_fin,
  CASE
    WHEN c.statut IN ('signe', 'valide') THEN '⚠️ Statut ' || c.statut || ' → SERA CHANGÉ en actif'
    WHEN c.statut = 'actif' THEN '✅ Statut déjà actif'
    ELSE '❓ Statut: ' || c.statut
  END as correction_statut
FROM contrat c
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 6. TOUS LES CONTRATS YOUSIGN (pour comparaison)
-- ========================================
SELECT
  '=== AUTRES CONTRATS YOUSIGN ===' as section,
  COUNT(*) as total_yousign_contracts,
  SUM(CASE WHEN type IS NULL THEN 1 ELSE 0 END) as type_null_count,
  SUM(CASE WHEN date_fin IS NULL THEN 1 ELSE 0 END) as date_fin_null_count,
  SUM(CASE WHEN statut = 'valide' THEN 1 ELSE 0 END) as statut_valide_count,
  SUM(CASE WHEN statut = 'signe' THEN 1 ELSE 0 END) as statut_signe_count,
  SUM(CASE WHEN statut = 'actif' THEN 1 ELSE 0 END) as statut_actif_count
FROM contrat
WHERE yousign_signature_request_id IS NOT NULL;
