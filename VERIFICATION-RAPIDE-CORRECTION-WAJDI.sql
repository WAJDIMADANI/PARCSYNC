/*
  ╔════════════════════════════════════════════════════════════════╗
  ║  VÉRIFICATION RAPIDE - Contrat de Wajdi                       ║
  ║                                                                ║
  ║  Exécutez ce script pour vérifier si la correction a marché   ║
  ╚════════════════════════════════════════════════════════════════╝
*/

-- ========================================
-- 1. ÉTAT DU CONTRAT
-- ========================================
SELECT
  '╔════════════════════════════════════╗' as "═══",
  '║     ÉTAT DU CONTRAT DE WAJDI      ║' as titre,
  '╚════════════════════════════════════╝' as "═══";

SELECT
  type as "Type",
  date_debut as "Date Début",
  date_fin as "Date Fin",
  statut as "Statut",
  CASE
    WHEN type IN ('CDD', 'cdd') THEN '✅'
    WHEN type IS NULL THEN '❌ NULL'
    ELSE '⚠️ ' || type
  END as "Type OK?",
  CASE
    WHEN date_fin IS NOT NULL THEN '✅'
    ELSE '❌ NULL'
  END as "Date Fin OK?",
  CASE
    WHEN statut = 'actif' THEN '✅'
    WHEN statut IS NULL THEN '❌ NULL'
    ELSE '⚠️ ' || statut
  END as "Statut OK?"
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 2. SERA-T-IL DÉTECTÉ?
-- ========================================
SELECT
  '╔════════════════════════════════════╗' as "═══",
  '║       TEST DE DÉTECTION           ║' as titre,
  '╚════════════════════════════════════╝' as "═══";

SELECT
  CASE
    WHEN type = 'CDD' AND date_fin IS NOT NULL AND statut = 'actif'
    THEN '✅ OUI - Sera détecté le ' || date_fin::text
    ELSE '❌ NON - Vérifier les valeurs ci-dessus'
  END as "Détection Automatique",
  CASE
    WHEN date_fin > CURRENT_DATE
    THEN '✅ Contrat encore valide'
    WHEN date_fin = CURRENT_DATE
    THEN '⚠️ Expire AUJOURD''HUI'
    ELSE '❌ Déjà expiré'
  END as "État d''expiration",
  (date_fin - CURRENT_DATE) as "Jours restants"
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 3. CONTRAINTE CHECK
-- ========================================
SELECT
  '╔════════════════════════════════════╗' as "═══",
  '║    CONTRAINTE CHECK STATUT        ║' as titre,
  '╚════════════════════════════════════╝' as "═══";

SELECT
  conname as "Nom Contrainte",
  CASE
    WHEN pg_get_constraintdef(oid) LIKE '%actif%'
    THEN '✅ "actif" accepté'
    ELSE '❌ "actif" NON accepté'
  END as "Statut actif OK?",
  pg_get_constraintdef(oid) as "Définition"
FROM pg_constraint
WHERE conname = 'contrat_statut_check'
  AND conrelid = 'contrat'::regclass;

-- ========================================
-- 4. RÉSUMÉ FINAL
-- ========================================
DO $$
DECLARE
  v_type text;
  v_date_fin date;
  v_statut text;
  v_ok boolean;
BEGIN
  SELECT type, date_fin, statut
  INTO v_type, v_date_fin, v_statut
  FROM contrat
  WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

  v_ok := (v_type IN ('CDD', 'cdd') AND v_date_fin IS NOT NULL AND v_statut = 'actif');

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  IF v_ok THEN
    RAISE NOTICE '║  ✅ CORRECTION RÉUSSIE !                      ║';
    RAISE NOTICE '╚════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Le contrat de Wajdi est correctement configuré:';
    RAISE NOTICE '  Type: %', v_type;
    RAISE NOTICE '  Date fin: %', v_date_fin;
    RAISE NOTICE '  Statut: %', v_statut;
    RAISE NOTICE '';
    RAISE NOTICE 'Le contrat sera détecté automatiquement le: %', v_date_fin;
  ELSE
    RAISE NOTICE '║  ❌ CORRECTION INCOMPLÈTE                     ║';
    RAISE NOTICE '╚════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Valeurs actuelles:';
    RAISE NOTICE '  Type: % (devrait être CDD)', COALESCE(v_type, 'NULL');
    RAISE NOTICE '  Date fin: % (ne devrait pas être NULL)', COALESCE(v_date_fin::text, 'NULL');
    RAISE NOTICE '  Statut: % (devrait être actif)', COALESCE(v_statut, 'NULL');
    RAISE NOTICE '';
    RAISE NOTICE 'Exécutez: CORRECTION-COMPLETE-WAJDI-EN-1-FOIS.sql';
  END IF;
  RAISE NOTICE '';
END $$;
