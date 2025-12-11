/*
  # Scripts de test pour la génération automatique de notifications/incidents

  Ce fichier contient 10 scénarios de test complets pour valider le système de
  génération automatique de notifications et incidents pour les contrats CDD,
  Avenant 1 et Avenant 2.

  ## Prérequis
  - Les migrations update-notification-incident-types.sql et
    create-auto-notification-for-contracts.sql doivent être exécutées
  - Un profil de test doit exister
  - Des modèles de contrat CDD et Avenant doivent exister

  ## Comment utiliser ces tests
  1. Remplacez 'ID-DU-PROFIL-TEST' par un vrai UUID de profil
  2. Remplacez 'ID-MODELE-CDD' et 'ID-MODELE-AVENANT' par de vrais UUID
  3. Exécutez chaque test séparément
  4. Vérifiez les résultats avec les requêtes de vérification
  5. Nettoyez les données de test entre chaque scénario
*/

-- ====================================================================
-- PRÉPARATION: Créer des données de test (à adapter à votre base)
-- ====================================================================

-- Créer un profil de test si nécessaire
-- INSERT INTO profil (nom, prenom, email) VALUES
-- ('Test', 'Notification', 'test.notification@example.com')
-- RETURNING id;

-- Récupérer les IDs nécessaires
DO $$
DECLARE
  test_profil_id UUID;
  cdd_modele_id UUID;
  avenant_modele_id UUID;
BEGIN
  -- Récupérer un profil de test (adapter la condition)
  SELECT id INTO test_profil_id FROM profil LIMIT 1;

  -- Récupérer les modèles
  SELECT id INTO cdd_modele_id FROM modeles_contrats WHERE type_contrat = 'CDD' LIMIT 1;
  SELECT id INTO avenant_modele_id FROM modeles_contrats WHERE type_contrat = 'Avenant' LIMIT 1;

  RAISE NOTICE 'IDs à utiliser pour les tests:';
  RAISE NOTICE '  - Profil: %', test_profil_id;
  RAISE NOTICE '  - Modèle CDD: %', cdd_modele_id;
  RAISE NOTICE '  - Modèle Avenant: %', avenant_modele_id;
END $$;

-- ====================================================================
-- TEST 1: CDD se terminant dans 60 jours (créera notification à J-30)
-- ====================================================================

-- 1.1 Créer le contrat de test
DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  cdd_modele_id UUID;
  result JSON;
BEGIN
  -- Récupérer les IDs (adapter selon votre base)
  SELECT id INTO test_profil_id FROM profil LIMIT 1;
  SELECT id INTO cdd_modele_id FROM modeles_contrats WHERE type_contrat = 'CDD' LIMIT 1;

  -- Créer le contrat
  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    cdd_modele_id,
    'signe',
    jsonb_build_object(
      'type_contrat', 'CDD',
      'date_fin', (CURRENT_DATE + INTERVAL '60 days')::TEXT
    )
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'TEST 1: Contrat CDD créé: %', test_contract_id;

  -- Appeler la fonction
  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;

  -- Vérifications attendues
  RAISE NOTICE 'Vérifications:';
  RAISE NOTICE '  - Type créé: notification (car > 30 jours)';
  RAISE NOTICE '  - Notification type: contrat_cdd';
  RAISE NOTICE '  - Date notification: dans 30 jours';
  RAISE NOTICE '  - Source date: contract_variables';
END $$;

-- ====================================================================
-- TEST 2: CDD se terminant dans 15 jours (notification immédiate)
-- ====================================================================

DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  cdd_modele_id UUID;
  result JSON;
BEGIN
  SELECT id INTO test_profil_id FROM profil WHERE id NOT IN (
    SELECT profil_id FROM notification WHERE type = 'contrat_cdd'
  ) LIMIT 1;
  SELECT id INTO cdd_modele_id FROM modeles_contrats WHERE type_contrat = 'CDD' LIMIT 1;

  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    cdd_modele_id,
    'signe',
    jsonb_build_object(
      'type_contrat', 'CDD',
      'date_fin', (CURRENT_DATE + INTERVAL '15 days')::TEXT
    )
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'TEST 2: Contrat CDD créé: %', test_contract_id;

  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;
  RAISE NOTICE 'Attendu: notification immédiate avec metadata.urgent = true';
END $$;

-- ====================================================================
-- TEST 3: CDD expiré depuis hier (créera incident)
-- ====================================================================

DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  cdd_modele_id UUID;
  result JSON;
BEGIN
  SELECT id INTO test_profil_id FROM profil WHERE id NOT IN (
    SELECT profil_id FROM notification WHERE type = 'contrat_cdd'
    UNION
    SELECT profil_id FROM incident WHERE type = 'contrat_cdd'
  ) LIMIT 1;
  SELECT id INTO cdd_modele_id FROM modeles_contrats WHERE type_contrat = 'CDD' LIMIT 1;

  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    cdd_modele_id,
    'signe',
    jsonb_build_object(
      'type_contrat', 'CDD',
      'date_fin', (CURRENT_DATE - INTERVAL '1 day')::TEXT
    )
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'TEST 3: Contrat CDD créé: %', test_contract_id;

  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;
  RAISE NOTICE 'Attendu: incident avec jours_depuis_expiration = 1';
END $$;

-- ====================================================================
-- TEST 4: Avenant 1 avec date uniquement dans variables (45 jours)
-- ====================================================================

DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  avenant_modele_id UUID;
  result JSON;
BEGIN
  SELECT id INTO test_profil_id FROM profil WHERE id NOT IN (
    SELECT profil_id FROM notification WHERE type = 'avenant_1'
  ) LIMIT 1;
  SELECT id INTO avenant_modele_id FROM modeles_contrats WHERE type_contrat = 'Avenant' LIMIT 1;

  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    avenant_modele_id,
    'signe',
    jsonb_build_object(
      'type_contrat', 'Avenant 1',
      'date_fin', (CURRENT_DATE + INTERVAL '45 days')::TEXT
    )
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'TEST 4: Avenant 1 créé (date dans variables): %', test_contract_id;

  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;
  RAISE NOTICE 'Attendu: notification, source_date = contract_variables';
END $$;

-- ====================================================================
-- TEST 5: Avenant 1 avec date uniquement dans profil (20 jours)
-- ====================================================================

DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  avenant_modele_id UUID;
  result JSON;
BEGIN
  -- Trouver ou créer un profil avec avenant_1_date_fin
  SELECT id INTO test_profil_id FROM profil
  WHERE avenant_1_date_fin IS NOT NULL
  AND id NOT IN (SELECT profil_id FROM notification WHERE type = 'avenant_1')
  LIMIT 1;

  IF test_profil_id IS NULL THEN
    -- Créer un profil avec la date
    INSERT INTO profil (nom, prenom, email, avenant_1_date_fin)
    VALUES (
      'Test', 'Avenant1', 'test.av1@example.com',
      CURRENT_DATE + INTERVAL '20 days'
    )
    RETURNING id INTO test_profil_id;
  END IF;

  SELECT id INTO avenant_modele_id FROM modeles_contrats WHERE type_contrat = 'Avenant' LIMIT 1;

  -- Créer le contrat SANS date_fin dans variables
  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    avenant_modele_id,
    'signe',
    jsonb_build_object('type_contrat', 'Avenant 1')
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'TEST 5: Avenant 1 créé (date dans profil): %', test_contract_id;

  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;
  RAISE NOTICE 'Attendu: notification immédiate, source_date = profil';
END $$;

-- ====================================================================
-- TEST 6: Avenant 1 avec dates dans les deux sources (profil plus récente)
-- ====================================================================

DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  avenant_modele_id UUID;
  result JSON;
BEGIN
  -- Créer un profil avec avenant_1_date_fin plus récente
  INSERT INTO profil (nom, prenom, email, avenant_1_date_fin)
  VALUES (
    'Test', 'Double', 'test.double@example.com',
    CURRENT_DATE + INTERVAL '50 days'  -- Date dans profil plus récente
  )
  RETURNING id INTO test_profil_id;

  SELECT id INTO avenant_modele_id FROM modeles_contrats WHERE type_contrat = 'Avenant' LIMIT 1;

  -- Créer le contrat avec une date plus ancienne dans variables
  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    avenant_modele_id,
    'signe',
    jsonb_build_object(
      'type_contrat', 'Avenant 1',
      'date_fin', (CURRENT_DATE + INTERVAL '40 days')::TEXT  -- Date plus ancienne
    )
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'TEST 6: Avenant 1 créé (dates dans les deux sources): %', test_contract_id;
  RAISE NOTICE '  - Date variables: +40 jours';
  RAISE NOTICE '  - Date profil: +50 jours (plus récente)';

  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;
  RAISE NOTICE 'Attendu: source_date = both_merged, date_fin = celle dans profil';
END $$;

-- ====================================================================
-- TEST 7: Avenant 2 avec date uniquement dans variables (10 jours)
-- ====================================================================

DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  avenant_modele_id UUID;
  result JSON;
BEGIN
  SELECT id INTO test_profil_id FROM profil WHERE id NOT IN (
    SELECT profil_id FROM notification WHERE type = 'avenant_2'
  ) LIMIT 1;
  SELECT id INTO avenant_modele_id FROM modeles_contrats WHERE type_contrat = 'Avenant' LIMIT 1;

  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    avenant_modele_id,
    'signe',
    jsonb_build_object(
      'type_contrat', 'Avenant 2',
      'date_fin', (CURRENT_DATE + INTERVAL '10 days')::TEXT
    )
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'TEST 7: Avenant 2 créé: %', test_contract_id;

  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;
  RAISE NOTICE 'Attendu: notification immédiate, notification_type = avenant_2';
END $$;

-- ====================================================================
-- TEST 8: Avenant 2 avec dates dans les deux sources (variables plus récente)
-- ====================================================================

DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  avenant_modele_id UUID;
  result JSON;
BEGIN
  -- Créer un profil avec avenant_2_date_fin plus ancienne
  INSERT INTO profil (nom, prenom, email, avenant_2_date_fin)
  VALUES (
    'Test', 'Double2', 'test.double2@example.com',
    CURRENT_DATE + INTERVAL '35 days'  -- Date dans profil plus ancienne
  )
  RETURNING id INTO test_profil_id;

  SELECT id INTO avenant_modele_id FROM modeles_contrats WHERE type_contrat = 'Avenant' LIMIT 1;

  -- Créer le contrat avec une date plus récente dans variables
  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    avenant_modele_id,
    'signe',
    jsonb_build_object(
      'type_contrat', 'Avenant 2',
      'date_fin', (CURRENT_DATE + INTERVAL '55 days')::TEXT  -- Date plus récente
    )
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'TEST 8: Avenant 2 créé (dates dans les deux sources): %', test_contract_id;
  RAISE NOTICE '  - Date profil: +35 jours';
  RAISE NOTICE '  - Date variables: +55 jours (plus récente)';

  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;
  RAISE NOTICE 'Attendu: source_date = both_merged, date_fin = celle dans variables';
END $$;

-- ====================================================================
-- TEST 9: Avenant 2 expiré depuis 5 jours (créera incident)
-- ====================================================================

DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  avenant_modele_id UUID;
  result JSON;
BEGIN
  SELECT id INTO test_profil_id FROM profil WHERE id NOT IN (
    SELECT profil_id FROM incident WHERE type = 'avenant_2'
  ) LIMIT 1;
  SELECT id INTO avenant_modele_id FROM modeles_contrats WHERE type_contrat = 'Avenant' LIMIT 1;

  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    avenant_modele_id,
    'signe',
    jsonb_build_object(
      'type_contrat', 'Avenant 2',
      'date_fin', (CURRENT_DATE - INTERVAL '5 days')::TEXT
    )
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'TEST 9: Avenant 2 créé (expiré): %', test_contract_id;

  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;
  RAISE NOTICE 'Attendu: incident, jours_depuis_expiration = 5';
END $$;

-- ====================================================================
-- TEST 10: Appel multiple avec même contrat (vérification anti-doublon)
-- ====================================================================

DO $$
DECLARE
  test_contract_id UUID;
  result1 JSON;
  result2 JSON;
BEGIN
  -- Prendre un contrat existant du test précédent
  SELECT c.id INTO test_contract_id
  FROM contrat c
  WHERE c.statut = 'signe'
  AND EXISTS (
    SELECT 1 FROM notification n
    WHERE n.profil_id = c.profil_id
    AND n.metadata->>'contract_id' = c.id::TEXT
  )
  LIMIT 1;

  IF test_contract_id IS NULL THEN
    RAISE NOTICE 'TEST 10: Aucun contrat trouvé, créez-en un avec les tests précédents';
    RETURN;
  END IF;

  RAISE NOTICE 'TEST 10: Test anti-doublon avec contrat: %', test_contract_id;

  -- Premier appel (devrait échouer car notification existe déjà)
  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result1;

  RAISE NOTICE 'Premier appel: %', result1::TEXT;
  RAISE NOTICE 'Attendu: success = false, error contient "existe déjà"';

  -- Deuxième appel (même résultat)
  SELECT create_notification_or_incident_for_contract(test_contract_id) INTO result2;

  RAISE NOTICE 'Deuxième appel: %', result2::TEXT;
  RAISE NOTICE 'Attendu: même erreur (anti-doublon fonctionne)';
END $$;

-- ====================================================================
-- REQUÊTES DE VÉRIFICATION
-- ====================================================================

-- Voir toutes les notifications créées par le webhook
SELECT
  n.id,
  p.nom,
  p.prenom,
  n.type,
  n.date_notification,
  n.statut,
  n.metadata->>'source_date' as source_date,
  n.metadata->>'date_fin' as date_fin,
  n.metadata->>'date_fin_variables' as date_variables,
  n.metadata->>'date_fin_profil' as date_profil,
  n.metadata->>'urgent' as urgent,
  n.created_at
FROM notification n
JOIN profil p ON n.profil_id = p.id
WHERE n.metadata->>'origine' = 'webhook_yousign'
ORDER BY n.created_at DESC;

-- Voir tous les incidents créés par le webhook
SELECT
  i.id,
  p.nom,
  p.prenom,
  i.type,
  i.statut,
  i.metadata->>'source_date' as source_date,
  i.metadata->>'date_fin' as date_fin,
  i.metadata->>'jours_depuis_expiration' as jours_expiré,
  i.created_at
FROM incident i
JOIN profil p ON i.profil_id = p.id
WHERE i.metadata->>'origine' = 'webhook_yousign'
ORDER BY i.created_at DESC;

-- Statistiques par type
SELECT
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE metadata->>'source_date' = 'contract_variables') as source_variables,
  COUNT(*) FILTER (WHERE metadata->>'source_date' = 'profil') as source_profil,
  COUNT(*) FILTER (WHERE metadata->>'source_date' = 'both_merged') as source_both
FROM notification
WHERE metadata->>'origine' = 'webhook_yousign'
GROUP BY type;

-- Vérifier l'absence de doublons
SELECT
  profil_id,
  type,
  COUNT(*) as occurrences
FROM (
  SELECT profil_id, type FROM notification WHERE metadata->>'origine' = 'webhook_yousign'
  UNION ALL
  SELECT profil_id, type FROM incident WHERE metadata->>'origine' = 'webhook_yousign'
) combined
GROUP BY profil_id, type
HAVING COUNT(*) > 1;

-- ====================================================================
-- NETTOYAGE (à exécuter entre les tests ou à la fin)
-- ====================================================================

-- Supprimer toutes les notifications de test
-- DELETE FROM notification WHERE metadata->>'origine' = 'webhook_yousign';

-- Supprimer tous les incidents de test
-- DELETE FROM incident WHERE metadata->>'origine' = 'webhook_yousign';

-- Supprimer les contrats de test
-- DELETE FROM contrat WHERE id IN (
--   SELECT (metadata->>'contract_id')::UUID
--   FROM notification
--   WHERE metadata->>'origine' = 'webhook_yousign'
-- );
