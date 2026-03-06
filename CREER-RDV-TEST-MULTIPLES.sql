-- ============================================
-- CRÉER PLUSIEURS RDV VISITE MÉDICALE DE TEST
-- ============================================

-- Ce script crée plusieurs RDV de test avec des dates différentes
-- pour voir s'ils s'affichent tous dans la carte et le filtre

-- ÉTAPE 1: Récupérer quelques profils de test
DO $$
DECLARE
  v_profil RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧪 CRÉATION DE RDV DE TEST';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Créer des RDV pour 5 profils différents avec des dates variées
  FOR v_profil IN
    SELECT id, prenom, nom, matricule_tca
    FROM profil
    WHERE deleted_at IS NULL
      AND statut NOT IN ('sorti', 'inactif')
    ORDER BY id
    LIMIT 5
  LOOP
    v_count := v_count + 1;

    -- Assigner une date de RDV (dans 0, 1, 2, 3, 4 jours)
    UPDATE profil
    SET
      visite_medicale_rdv_date = CURRENT_DATE + (v_count || ' days')::INTERVAL,
      visite_medicale_rdv_heure = ('09:' || LPAD(v_count::TEXT, 2, '0') || ':00')::TIME
    WHERE id = v_profil.id;

    RAISE NOTICE '✅ RDV créé pour % % (dans % jour(s))',
      v_profil.prenom,
      v_profil.nom,
      v_count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Total: % RDV de test créés', v_count;
  RAISE NOTICE '';
END $$;

-- ÉTAPE 2: Exécuter la fonction de génération de notifications
SELECT * FROM generate_rdv_visite_medicale_inbox_notifications();

-- ÉTAPE 3: Vérifier les notifications créées
SELECT
  id,
  titre,
  type,
  statut,
  lu,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as date_creation,
  utilisateur_id,
  reference_id
FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC;

-- ÉTAPE 4: Compter les notifications par utilisateur
SELECT
  utilisateur_id,
  COUNT(*) as nombre_rdv,
  COUNT(CASE WHEN lu THEN 1 END) as lus,
  COUNT(CASE WHEN NOT lu THEN 1 END) as non_lus
FROM inbox
WHERE type = 'rdv_visite_medicale'
GROUP BY utilisateur_id;

-- ============================================
-- MESSAGE FINAL
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
  v_count_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM inbox
  WHERE type = 'rdv_visite_medicale';

  SELECT COUNT(DISTINCT utilisateur_id) INTO v_count_users
  FROM inbox
  WHERE type = 'rdv_visite_medicale';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TEST TERMINÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résultat:';
  RAISE NOTICE '   • Nombre total de notifications RDV: %', v_count;
  RAISE NOTICE '   • Nombre d''utilisateurs concernés: %', v_count_users;
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Vérification:';
  RAISE NOTICE '   • Connectez-vous avec un utilisateur RH';
  RAISE NOTICE '   • Allez dans Boîte de Réception';
  RAISE NOTICE '   • La carte RDV devrait afficher: %', v_count;
  RAISE NOTICE '   • Le filtre RDV devrait afficher tous les RDV';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Important:';
  RAISE NOTICE '   • Les RDV ne sont créés QUE pour les utilisateurs avec permissions RH';
  RAISE NOTICE '   • Vérifiez que votre utilisateur a ces permissions';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
