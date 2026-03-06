-- ============================================
-- DIAGNOSTIC ET CORRECTION TYPE RDV VISITE MEDICALE
-- ============================================

-- ÉTAPE 1: Vérifier tous les messages inbox de type profil
SELECT
  id,
  titre,
  type,
  statut,
  lu,
  created_at,
  reference_type,
  reference_id
FROM inbox
WHERE reference_type = 'profil'
ORDER BY created_at DESC;

-- ÉTAPE 2: Identifier les messages RDV sans le bon type
SELECT
  id,
  titre,
  type,
  statut,
  created_at
FROM inbox
WHERE reference_type = 'profil'
  AND (
    titre ILIKE '%rdv%visite%médicale%'
    OR titre ILIKE '%visite%médicale%'
    OR titre ILIKE '%rappel%rdv%'
  )
  AND (type IS NULL OR type != 'rdv_visite_medicale')
ORDER BY created_at DESC;

-- ÉTAPE 3: Corriger tous les messages RDV qui n'ont pas le bon type
UPDATE inbox
SET
  type = 'rdv_visite_medicale',
  updated_at = NOW()
WHERE reference_type = 'profil'
  AND (
    titre ILIKE '%rdv%visite%médicale%'
    OR titre ILIKE '%visite%médicale%'
    OR titre ILIKE '%rappel%rdv%'
  )
  AND (type IS NULL OR type != 'rdv_visite_medicale');

-- ÉTAPE 4: Vérifier le résultat
SELECT
  COUNT(*) as total_rdv_visite_medicale,
  COUNT(CASE WHEN lu THEN 1 END) as lus,
  COUNT(CASE WHEN NOT lu THEN 1 END) as non_lus,
  COUNT(CASE WHEN statut = 'nouveau' THEN 1 END) as nouveaux,
  COUNT(CASE WHEN statut = 'ouvert' THEN 1 END) as ouverts,
  COUNT(CASE WHEN statut = 'consulte' THEN 1 END) as consultes,
  COUNT(CASE WHEN statut = 'traite' THEN 1 END) as traites
FROM inbox
WHERE type = 'rdv_visite_medicale';

-- ÉTAPE 5: Lister TOUS les RDV après correction
SELECT
  id,
  titre,
  type,
  statut,
  lu,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as date_creation,
  utilisateur_id
FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC;

-- ============================================
-- MESSAGE FINAL
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM inbox
  WHERE type = 'rdv_visite_medicale';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CORRECTION TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résultat:';
  RAISE NOTICE '   • Nombre total de RDV: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Tous ces RDV devraient maintenant:';
  RAISE NOTICE '   • Apparaître dans la carte "RDV Visite Médicale"';
  RAISE NOTICE '   • Être filtrables avec le filtre RDV';
  RAISE NOTICE '   • Avoir le type "rdv_visite_medicale"';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Si vous ne voyez toujours qu''1 seul RDV:';
  RAISE NOTICE '   • Vérifiez que vous êtes connecté avec le bon utilisateur';
  RAISE NOTICE '   • Vérifiez la colonne utilisateur_id dans la requête ci-dessus';
  RAISE NOTICE '   • Les RDV sont créés uniquement pour les utilisateurs RH';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
