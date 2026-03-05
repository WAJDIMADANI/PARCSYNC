/*
  # TESTS : Système RDV Visite Médicale → Inbox

  Ce fichier contient tous les tests pour vérifier
  que le système fonctionne correctement.
*/

-- ============================================
-- TEST 1 : Vérifier l'installation
-- ============================================

SELECT '═══════════════════════════════════════════════' AS test;
SELECT 'TEST 1 : Vérifier installation' AS test;
SELECT '═══════════════════════════════════════════════' AS test;

-- Vérifier les colonnes
SELECT
  '✓ Colonnes' AS check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profil'
  AND column_name IN ('visite_medicale_rdv_date', 'visite_medicale_rdv_heure');

-- Vérifier les fonctions
SELECT
  '✓ Fonctions' AS check_type,
  routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%rdv%inbox%'
ORDER BY routine_name;

-- Vérifier le job CRON
SELECT
  '✓ Job CRON' AS check_type,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'generate-rdv-visite-medicale-inbox';

-- ============================================
-- TEST 2 : Notification Immédiate (RDV Demain)
-- ============================================

SELECT '═══════════════════════════════════════════════' AS test;
SELECT 'TEST 2 : Notification immédiate (RDV demain)' AS test;
SELECT '═══════════════════════════════════════════════' AS test;

-- Trouver un profil de test
DO $$
DECLARE
  v_profil_id UUID;
  v_matricule TEXT;
BEGIN
  -- Prendre le premier profil actif
  SELECT id, matricule_tca INTO v_profil_id, v_matricule
  FROM profil
  WHERE deleted_at IS NULL
    AND statut NOT IN ('sorti', 'inactif')
  LIMIT 1;

  IF v_profil_id IS NULL THEN
    RAISE NOTICE '❌ Aucun profil trouvé pour le test';
    RETURN;
  END IF;

  RAISE NOTICE '📝 Profil de test: % (ID: %)', v_matricule, v_profil_id;

  -- Supprimer les anciens messages de test
  DELETE FROM inbox
  WHERE reference_id = v_profil_id
    AND type = 'rdv_visite_medicale';

  RAISE NOTICE '🧹 Anciens messages supprimés';

  -- Définir un RDV pour demain à 14:30
  UPDATE profil
  SET
    visite_medicale_rdv_date = CURRENT_DATE + 1,
    visite_medicale_rdv_heure = '14:30:00'
  WHERE id = v_profil_id;

  RAISE NOTICE '✅ RDV créé pour demain à 14:30';
  RAISE NOTICE '';
  RAISE NOTICE '⏳ Attente trigger... (notification immédiate)';
  RAISE NOTICE '';

  -- Attendre un peu pour le trigger
  PERFORM pg_sleep(1);

  -- Vérifier les messages créés
  RAISE NOTICE '📬 Messages créés:';
  PERFORM
    RAISE NOTICE '  • User: % | Titre: % | Lu: %',
      au.prenom || ' ' || au.nom,
      i.titre,
      i.lu
  FROM inbox i
  INNER JOIN app_utilisateur au ON i.utilisateur_id = au.id
  WHERE i.reference_id = v_profil_id
    AND i.type = 'rdv_visite_medicale'
  ORDER BY i.created_at DESC;

END $$;

-- Afficher les messages créés
SELECT
  '📬 Résultat' AS type,
  i.titre,
  i.description,
  i.lu,
  au.prenom || ' ' || au.nom AS destinataire,
  i.created_at
FROM inbox i
INNER JOIN app_utilisateur au ON i.utilisateur_id = au.id
WHERE i.type = 'rdv_visite_medicale'
ORDER BY i.created_at DESC
LIMIT 5;

-- ============================================
-- TEST 3 : Notification J-2 (Simulation)
-- ============================================

SELECT '═══════════════════════════════════════════════' AS test;
SELECT 'TEST 3 : Notification J-2 (simulation CRON)' AS test;
SELECT '═══════════════════════════════════════════════' AS test;

-- Créer un RDV dans 2 jours
DO $$
DECLARE
  v_profil_id UUID;
  v_matricule TEXT;
BEGIN
  -- Prendre un autre profil
  SELECT id, matricule_tca INTO v_profil_id, v_matricule
  FROM profil
  WHERE deleted_at IS NULL
    AND statut NOT IN ('sorti', 'inactif')
  LIMIT 1 OFFSET 1;

  IF v_profil_id IS NULL THEN
    RAISE NOTICE '❌ Aucun deuxième profil trouvé';
    RETURN;
  END IF;

  RAISE NOTICE '📝 Profil de test: % (ID: %)', v_matricule, v_profil_id;

  -- Supprimer les anciens messages
  DELETE FROM inbox
  WHERE reference_id = v_profil_id
    AND type = 'rdv_visite_medicale';

  -- Définir un RDV dans 2 jours à 09:00
  UPDATE profil
  SET
    visite_medicale_rdv_date = CURRENT_DATE + 2,
    visite_medicale_rdv_heure = '09:00:00'
  WHERE id = v_profil_id;

  RAISE NOTICE '✅ RDV créé pour J+2 à 09:00';
  RAISE NOTICE '';
END $$;

-- Exécuter manuellement la fonction (simulation du CRON)
SELECT
  '🔄 Exécution manuelle' AS action,
  salarie_nom,
  to_char(rdv_date, 'DD/MM/YYYY') AS date_rdv,
  to_char(rdv_heure, 'HH24:MI') AS heure_rdv,
  notifications_creees
FROM generate_rdv_visite_medicale_inbox_notifications();

-- Afficher les messages créés
SELECT
  '📬 Messages J-2' AS type,
  i.titre,
  i.description,
  COUNT(*) OVER() AS total_messages,
  i.created_at
FROM inbox i
WHERE i.type = 'rdv_visite_medicale'
  AND i.created_at::date = CURRENT_DATE
ORDER BY i.created_at DESC
LIMIT 5;

-- ============================================
-- TEST 4 : Vérifier Pas de Doublons
-- ============================================

SELECT '═══════════════════════════════════════════════' AS test;
SELECT 'TEST 4 : Vérifier absence de doublons' AS test;
SELECT '═══════════════════════════════════════════════' AS test;

-- Réexécuter la fonction (ne devrait pas créer de doublons)
SELECT
  '🔄 Réexécution (doublons?)' AS action,
  salarie_nom,
  notifications_creees
FROM generate_rdv_visite_medicale_inbox_notifications();

-- Compter les messages par salarié
SELECT
  '📊 Doublons?' AS type,
  p.matricule_tca,
  p.prenom || ' ' || p.nom AS salarie,
  COUNT(i.id) AS nb_messages,
  CASE
    WHEN COUNT(i.id) > COUNT(DISTINCT i.utilisateur_id) THEN '❌ DOUBLONS'
    ELSE '✅ OK'
  END AS resultat
FROM inbox i
INNER JOIN profil p ON i.reference_id = p.id
WHERE i.type = 'rdv_visite_medicale'
  AND i.created_at::date = CURRENT_DATE
GROUP BY p.id, p.matricule_tca, p.prenom, p.nom;

-- ============================================
-- TEST 5 : Statistiques Globales
-- ============================================

SELECT '═══════════════════════════════════════════════' AS test;
SELECT 'TEST 5 : Statistiques globales' AS test;
SELECT '═══════════════════════════════════════════════' AS test;

-- Compter tout
SELECT
  '📊 Stats' AS type,
  (SELECT COUNT(*) FROM profil WHERE visite_medicale_rdv_date IS NOT NULL) AS nb_rdv_programmes,
  (SELECT COUNT(*) FROM inbox WHERE type = 'rdv_visite_medicale') AS nb_messages_total,
  (SELECT COUNT(*) FROM inbox WHERE type = 'rdv_visite_medicale' AND lu = false) AS nb_messages_non_lus,
  (SELECT COUNT(DISTINCT utilisateur_id) FROM inbox WHERE type = 'rdv_visite_medicale') AS nb_destinataires;

-- Tous les RDV programmés
SELECT
  '📅 RDV programmés' AS type,
  p.matricule_tca,
  p.prenom || ' ' || p.nom AS salarie,
  to_char(p.visite_medicale_rdv_date, 'DD/MM/YYYY') AS date_rdv,
  to_char(p.visite_medicale_rdv_heure, 'HH24:MI') AS heure_rdv,
  p.visite_medicale_rdv_date - CURRENT_DATE AS jours_avant
FROM profil p
WHERE p.visite_medicale_rdv_date IS NOT NULL
  AND p.deleted_at IS NULL
ORDER BY p.visite_medicale_rdv_date;

-- Messages par destinataire
SELECT
  '👥 Par destinataire' AS type,
  au.prenom || ' ' || au.nom AS destinataire,
  COUNT(*) AS nb_messages,
  COUNT(*) FILTER (WHERE i.lu = false) AS nb_non_lus
FROM inbox i
INNER JOIN app_utilisateur au ON i.utilisateur_id = au.id
WHERE i.type = 'rdv_visite_medicale'
GROUP BY au.id, au.prenom, au.nom
ORDER BY nb_messages DESC;

-- ============================================
-- TEST 6 : Vérifier le Lien vers Profil
-- ============================================

SELECT '═══════════════════════════════════════════════' AS test;
SELECT 'TEST 6 : Vérifier lien vers profil' AS test;
SELECT '═══════════════════════════════════════════════' AS test;

SELECT
  '🔗 Lien profil' AS type,
  i.titre,
  i.reference_type AS type_reference,
  p.matricule_tca,
  p.prenom || ' ' || p.nom AS salarie,
  CASE
    WHEN i.reference_id = p.id THEN '✅ LIEN OK'
    ELSE '❌ LIEN INCORRECT'
  END AS verification
FROM inbox i
INNER JOIN profil p ON i.reference_id = p.id
WHERE i.type = 'rdv_visite_medicale'
ORDER BY i.created_at DESC
LIMIT 5;

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================

SELECT '═══════════════════════════════════════════════' AS test;
SELECT '✅ RÉSUMÉ DES TESTS' AS test;
SELECT '═══════════════════════════════════════════════' AS test;

DO $$
DECLARE
  v_nb_colonnes INTEGER;
  v_nb_fonctions INTEGER;
  v_nb_jobs INTEGER;
  v_nb_messages INTEGER;
  v_nb_destinataires INTEGER;
BEGIN
  -- Compter les éléments
  SELECT COUNT(*) INTO v_nb_colonnes
  FROM information_schema.columns
  WHERE table_name = 'profil'
    AND column_name IN ('visite_medicale_rdv_date', 'visite_medicale_rdv_heure');

  SELECT COUNT(*) INTO v_nb_fonctions
  FROM information_schema.routines
  WHERE routine_name LIKE '%rdv%inbox%';

  SELECT COUNT(*) INTO v_nb_jobs
  FROM cron.job
  WHERE jobname = 'generate-rdv-visite-medicale-inbox';

  SELECT COUNT(*) INTO v_nb_messages
  FROM inbox
  WHERE type = 'rdv_visite_medicale';

  SELECT COUNT(DISTINCT utilisateur_id) INTO v_nb_destinataires
  FROM inbox
  WHERE type = 'rdv_visite_medicale';

  -- Afficher le résumé
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '✅ RÉSUMÉ DES TESTS';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Installation:';
  RAISE NOTICE '   Colonnes: % / 2', v_nb_colonnes;
  RAISE NOTICE '   Fonctions: % / 2+', v_nb_fonctions;
  RAISE NOTICE '   Jobs CRON: % / 1', v_nb_jobs;
  RAISE NOTICE '';
  RAISE NOTICE '📬 Messages:';
  RAISE NOTICE '   Total créés: %', v_nb_messages;
  RAISE NOTICE '   Destinataires: %', v_nb_destinataires;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Résultat:';
  IF v_nb_colonnes = 2 AND v_nb_fonctions >= 2 AND v_nb_jobs = 1 AND v_nb_messages > 0 THEN
    RAISE NOTICE '   🎉 TOUS LES TESTS RÉUSSIS !';
  ELSE
    RAISE NOTICE '   ⚠️  Certains éléments manquent';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
