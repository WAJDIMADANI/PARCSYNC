/*
  # Test de la Correction pour le Contrat de Wajdi

  Ce script teste si le contrat de Wajdi sera correctement détecté
  après l'application des corrections.
*/

-- ========================================
-- AVANT CORRECTION: État actuel
-- ========================================
SELECT
  '=== AVANT CORRECTION ===' as etape,
  id,
  type,
  date_fin,
  statut,
  CASE
    WHEN type = 'CDD' THEN '✅ Type OK'
    ELSE '❌ Type NON OK: ' || COALESCE(type, 'NULL')
  END as check_type,
  CASE
    WHEN date_fin IS NOT NULL THEN '✅ Date OK: ' || date_fin::text
    ELSE '❌ Date NON OK'
  END as check_date,
  CASE
    WHEN statut = 'actif' THEN '✅ Statut OK'
    WHEN statut = 'signe' THEN '⚠️ Statut "signe" (sera corrigé en "actif")'
    ELSE '❌ Statut NON OK: ' || COALESCE(statut, 'NULL')
  END as check_statut,
  CASE
    WHEN type = 'CDD' AND date_fin IS NOT NULL AND statut = 'actif' THEN '✅ SERA DÉTECTÉ'
    WHEN type = 'CDD' AND date_fin IS NOT NULL AND statut = 'signe' THEN '⚠️ SERA DÉTECTÉ APRÈS CORRECTION STATUT'
    ELSE '❌ NE SERA PAS DÉTECTÉ'
  END as resultat_detection
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- SIMULATION: Ce qui DEVRAIT être extrait
-- ========================================
SELECT
  '=== SIMULATION EXTRACTION ===' as etape,
  c.id,
  mc.type_contrat as modele_type,
  c.variables->>'type_contrat' as variables_type,
  c.variables->>'date_fin' as variables_date_fin,
  c.variables->>'date_debut' as variables_date_debut,
  p.avenant_1_date_fin,
  p.avenant_2_date_fin,
  COALESCE(
    c.type,
    mc.type_contrat,
    c.variables->>'type_contrat',
    'CDI'
  ) as type_determine,
  COALESCE(
    c.date_fin::text,
    c.variables->>'date_fin',
    'NULL'
  ) as date_fin_determinee
FROM contrat c
LEFT JOIN modeles_contrats mc ON c.modele_id = mc.id
LEFT JOIN profil p ON c.profil_id = p.id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- APRÈS CORRECTION: État attendu
-- ========================================
SELECT
  '=== APRÈS CORRECTION (ATTENDU) ===' as etape,
  '4ce63c31-c775-4e50-98a4-d27966fccecc' as id,
  'CDD' as type,
  (SELECT variables->>'date_fin' FROM contrat WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc') as date_fin,
  'actif' as statut,
  '✅ Type OK' as check_type,
  '✅ Date OK' as check_date,
  '✅ Statut OK' as check_statut,
  '✅ SERA DÉTECTÉ' as resultat_final;

-- ========================================
-- TEST DE LA FONCTION DE DÉTECTION
-- ========================================
-- Vérifier si le contrat sera détecté par la fonction generate_daily_expired_incidents()

SELECT
  '=== TEST FONCTION DÉTECTION ===' as etape,
  c.id,
  c.type,
  c.date_fin,
  c.statut,
  (c.date_fin - CURRENT_DATE) as jours_avant_expiration,
  CASE
    WHEN c.type = 'CDD'
      AND c.date_fin IS NOT NULL
      AND c.statut = 'actif'
      AND c.date_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    THEN '✅ SERA DÉTECTÉ DANS 30 JOURS'
    WHEN c.type = 'CDD'
      AND c.date_fin IS NOT NULL
      AND c.statut = 'actif'
      AND c.date_fin <= CURRENT_DATE
    THEN '✅ SERA DÉTECTÉ (DÉJÀ EXPIRÉ)'
    WHEN c.type = 'CDD'
      AND c.date_fin IS NOT NULL
      AND c.statut = 'actif'
    THEN '⚠️ SERA DÉTECTÉ QUAND DATE < 30 JOURS'
    WHEN c.type IS NULL THEN '❌ TYPE MANQUANT'
    WHEN c.date_fin IS NULL THEN '❌ DATE_FIN MANQUANTE'
    WHEN c.statut != 'actif' THEN '❌ STATUT INCORRECT: ' || c.statut
    ELSE '❌ AUTRE PROBLÈME'
  END as diagnostic
FROM contrat c
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- RÉSUMÉ GLOBAL
-- ========================================
SELECT
  '=== RÉSUMÉ ===' as titre,
  'Le contrat de Wajdi doit avoir:' as description,
  '1. type = "CDD" (extrait du modèle ou variables)' as etape_1,
  '2. date_fin = [date depuis variables]' as etape_2,
  '3. statut = "actif" (changé depuis "signe")' as etape_3,
  'Alors il sera détecté par generate_daily_expired_incidents()' as resultat;
