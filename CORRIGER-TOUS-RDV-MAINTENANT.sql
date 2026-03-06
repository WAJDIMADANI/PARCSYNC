-- ============================================
-- CORRIGER TOUS LES RDV EN 1 SEULE COMMANDE
-- ============================================

-- Cette commande va :
-- 1. Trouver TOUS les messages qui parlent de RDV
-- 2. Leur assigner le type 'rdv_visite_medicale'
-- 3. Vous montrer le résultat

DO $$
DECLARE
  v_count_before INTEGER;
  v_count_updated INTEGER;
  v_count_after INTEGER;
BEGIN
  -- Compter avant
  SELECT COUNT(*) INTO v_count_before
  FROM inbox
  WHERE type = 'rdv_visite_medicale';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔧 CORRECTION DES RDV';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Avant correction: % RDV avec le bon type', v_count_before;
  RAISE NOTICE '';

  -- Corriger tous les RDV
  UPDATE inbox
  SET
    type = 'rdv_visite_medicale',
    updated_at = NOW()
  WHERE (
    titre ILIKE '%rdv%visite%médicale%'
    OR titre ILIKE '%visite%médicale%'
    OR titre ILIKE '%rdv%visite%medicale%'
    OR titre ILIKE '%rdv%'
  )
  AND reference_type = 'profil'
  AND (type IS NULL OR type != 'rdv_visite_medicale');

  GET DIAGNOSTICS v_count_updated = ROW_COUNT;

  -- Compter après
  SELECT COUNT(*) INTO v_count_after
  FROM inbox
  WHERE type = 'rdv_visite_medicale';

  RAISE NOTICE '✅ Correction terminée:';
  RAISE NOTICE '   • Lignes mises à jour: %', v_count_updated;
  RAISE NOTICE '   • Total après correction: %', v_count_after;
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Détails:';
END $$;

-- Afficher tous les RDV après correction
SELECT
  id,
  type,
  titre,
  statut,
  lu,
  reference_type,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as date_creation,
  utilisateur_id
FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC;

-- Message final
DO $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM inbox
  WHERE type = 'rdv_visite_medicale';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RÉSULTAT FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Vous avez maintenant % RDV dans la base', v_total;
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Action suivante:';
  RAISE NOTICE '   • Rechargez la page "Boîte de Réception"';
  RAISE NOTICE '   • Vérifiez la carte RDV';
  RAISE NOTICE '   • Vérifiez le filtre RDV';
  RAISE NOTICE '';
  RAISE NOTICE 'La carte devrait afficher: %', v_total;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
