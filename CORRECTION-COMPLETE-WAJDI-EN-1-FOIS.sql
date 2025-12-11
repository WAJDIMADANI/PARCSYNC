/*
  ╔════════════════════════════════════════════════════════════════╗
  ║  CORRECTION COMPLÈTE EN 1 SEULE FOIS                          ║
  ║                                                                ║
  ║  Ce script fait TOUT en une seule exécution:                  ║
  ║  1. Corrige la contrainte CHECK                               ║
  ║  2. Corrige le contrat de Wajdi                               ║
  ║  3. Affiche le résultat                                       ║
  ╚════════════════════════════════════════════════════════════════╝
*/

-- ========================================
-- ÉTAPE 1: CORRIGER LA CONTRAINTE CHECK
-- ========================================
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte
  ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_statut_check;

  -- Ajouter la nouvelle contrainte avec 'actif' inclus
  ALTER TABLE contrat ADD CONSTRAINT contrat_statut_check
    CHECK (statut IN ('envoye', 'en_attente_signature', 'signe', 'valide', 'actif'));

  RAISE NOTICE '✅ Contrainte CHECK corrigée - statut "actif" accepté';
END $$;

-- ========================================
-- ÉTAPE 2: CORRIGER LE CONTRAT DE WAJDI
-- ========================================
DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Correction du contrat
  UPDATE contrat
  SET
    type = COALESCE(
      (variables->>'type_contrat'),
      'CDD'
    ),
    date_debut = COALESCE(
      (variables->>'date_debut')::date,
      '2025-10-21'::date
    ),
    date_fin = COALESCE(
      (variables->>'date_fin')::date,
      '2026-07-03'::date
    ),
    statut = 'actif'
  WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RAISE NOTICE '✅ Contrat de Wajdi corrigé';
  ELSE
    RAISE NOTICE '⚠️ Contrat non trouvé ou déjà corrigé';
  END IF;
END $$;

-- ========================================
-- ÉTAPE 3: VÉRIFICATION DU RÉSULTAT
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '        RÉSULTAT FINAL' as titre,
  '═══════════════════════════════════' as separator2;

SELECT
  type as "Type",
  date_debut as "Date Début",
  date_fin as "Date Fin",
  statut as "Statut",
  CASE
    WHEN type IN ('CDD', 'cdd') THEN '✅ OK'
    ELSE '❌ Devrait être CDD'
  END as "Check Type",
  CASE
    WHEN date_fin IS NOT NULL THEN '✅ OK'
    ELSE '❌ Manquant'
  END as "Check Date Fin",
  CASE
    WHEN statut = 'actif' THEN '✅ OK'
    ELSE '❌ Devrait être actif'
  END as "Check Statut"
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- ÉTAPE 4: TEST DE DÉTECTION
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    TEST DE DÉTECTION' as titre,
  '═══════════════════════════════════' as separator2;

SELECT
  CASE
    WHEN c.type = 'CDD' AND c.date_fin IS NOT NULL AND c.statut = 'actif'
    THEN '✅ Le contrat SERA DÉTECTÉ par generate_daily_expired_incidents() le ' || c.date_fin::text
    ELSE '❌ Le contrat NE SERA PAS détecté - vérifier les valeurs ci-dessus'
  END as "Statut de Détection",
  c.date_fin as "Date d'expiration",
  (c.date_fin - CURRENT_DATE) as "Jours restants"
FROM contrat c
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- MESSAGES FINAUX
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  CORRECTION TERMINÉE !                                    ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Si tous les checks sont OK ci-dessus, la correction est réussie';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaine étape: Déployer le webhook yousign-webhook';
  RAISE NOTICE '  → supabase functions deploy yousign-webhook --no-verify-jwt';
  RAISE NOTICE '';
END $$;
