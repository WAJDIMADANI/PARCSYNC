/*
  ╔════════════════════════════════════════════════════════════════╗
  ║  TEST D'EXPIRATION - CONTRAT DE WAJDI (VERSION CORRIGÉE)     ║
  ║                                                                ║
  ║  Ce script permet de tester l'expiration MAINTENANT           ║
  ║  en changeant la date_fin à aujourd'hui                       ║
  ╚════════════════════════════════════════════════════════════════╝
*/

-- ========================================
-- ÉTAPE 1: Changer date_fin à aujourd'hui
-- ========================================
DO $$
BEGIN
  UPDATE contrat
  SET date_fin = CURRENT_DATE
  WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

  RAISE NOTICE '✅ Date_fin changée à aujourd''hui: %', CURRENT_DATE;
END $$;

-- ========================================
-- ÉTAPE 2: Générer les incidents/notifications
-- ========================================
DO $$
DECLARE
  v_result RECORD;
BEGIN
  -- Appeler la fonction de génération d'incidents
  SELECT * INTO v_result FROM generate_daily_expired_incidents();

  RAISE NOTICE '✅ Fonction generate_daily_expired_incidents() exécutée';
  RAISE NOTICE '   - Incidents créés: %', v_result.incidents_created;
  RAISE NOTICE '   - Notifications créées: %', v_result.notifications_created;
END $$;

-- ========================================
-- ÉTAPE 3: Vérifier le contrat
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    ÉTAT DU CONTRAT' as titre,
  '═══════════════════════════════════' as separator2;

SELECT
  type as "Type",
  date_debut as "Date Début",
  date_fin as "Date Fin (doit être aujourd'hui)",
  statut as "Statut",
  CASE
    WHEN date_fin = CURRENT_DATE THEN '✅ Expire AUJOURD''HUI'
    ELSE '❌ N''expire pas aujourd''hui'
  END as "Check Expiration"
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- ÉTAPE 4: Vérifier les incidents créés
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    INCIDENTS CRÉÉS' as titre,
  '═══════════════════════════════════' as separator2;

SELECT
  i.id as "ID Incident",
  i.type as "Type",
  i.titre as "Titre",
  i.statut as "Statut",
  i.created_at as "Créé le",
  CASE
    WHEN i.type = 'contrat_expire' THEN '✅ Incident d''expiration'
    ELSE '⚠️ Autre type'
  END as "Check Type"
FROM incident i
JOIN contrat c ON i.profil_id = c.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
ORDER BY i.created_at DESC
LIMIT 5;

-- ========================================
-- ÉTAPE 5: Vérifier les notifications créées
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    NOTIFICATIONS CRÉÉES' as titre,
  '═══════════════════════════════════' as separator2;

SELECT
  n.id as "ID Notification",
  n.type as "Type",
  n.titre as "Titre",
  n.message as "Message",
  n.statut as "Statut",
  n.created_at as "Créée le",
  CASE
    WHEN n.type = 'contrat_cdd_expire' THEN '✅ Notification CDD expiré'
    ELSE '⚠️ Autre type'
  END as "Check Type"
FROM notification n
JOIN contrat c ON n.profil_id = c.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
ORDER BY n.created_at DESC
LIMIT 5;

-- ========================================
-- MESSAGES FINAUX
-- ========================================
DO $$
DECLARE
  v_incidents_count INTEGER;
  v_notifications_count INTEGER;
BEGIN
  -- Compter les incidents
  SELECT COUNT(*)
  INTO v_incidents_count
  FROM incident i
  JOIN contrat c ON i.profil_id = c.profil_id
  WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
    AND i.type = 'contrat_expire';

  -- Compter les notifications
  SELECT COUNT(*)
  INTO v_notifications_count
  FROM notification n
  JOIN contrat c ON n.profil_id = c.profil_id
  WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
    AND n.type = 'contrat_cdd_expire';

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  RÉSULTAT DU TEST                                         ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Incidents créés: %', v_incidents_count;
  RAISE NOTICE 'Notifications créées: %', v_notifications_count;
  RAISE NOTICE '';

  IF v_incidents_count > 0 AND v_notifications_count > 0 THEN
    RAISE NOTICE '✅ TEST RÉUSSI !';
    RAISE NOTICE '';
    RAISE NOTICE 'Le contrat de Wajdi devrait maintenant apparaître dans:';
    RAISE NOTICE '  → Notifications > Contrats CDD';
    RAISE NOTICE '  → Incidents > Contrats expirés';
    RAISE NOTICE '';
    RAISE NOTICE 'Rafraîchissez la page de l''application pour voir la notification!';
  ELSE
    RAISE NOTICE '❌ PROBLÈME DÉTECTÉ';
    RAISE NOTICE '';
    IF v_incidents_count = 0 THEN
      RAISE NOTICE '⚠️ Aucun incident créé - vérifier la fonction generate_daily_expired_incidents()';
    END IF;
    IF v_notifications_count = 0 THEN
      RAISE NOTICE '⚠️ Aucune notification créée - vérifier les triggers';
    END IF;
  END IF;
  RAISE NOTICE '';
END $$;
