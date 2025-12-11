/*
  ╔════════════════════════════════════════════════════════════════════╗
  ║  DIAGNOSTIC: Pourquoi Wajdi n'apparaît pas dans les notifications ║
  ║  Son contrat expire AUJOURD'HUI (11/12/2025) avec 0 jour restant  ║
  ╚════════════════════════════════════════════════════════════════════╝
*/

-- ========================================
-- 1. Vérifier le contrat de Wajdi
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    CONTRAT DE WAJDI' as titre;

SELECT
  c.id,
  c.type as "Type",
  c.date_fin as "Date Fin",
  c.statut as "Statut",
  c.source as "Source",
  CURRENT_DATE as "Aujourd'hui",
  c.date_fin - CURRENT_DATE as "Jours restants",
  CASE
    WHEN c.date_fin = CURRENT_DATE THEN '⚠️ EXPIRE AUJOURD''HUI!'
    WHEN c.date_fin < CURRENT_DATE THEN '❌ DÉJÀ EXPIRÉ'
    WHEN c.date_fin <= CURRENT_DATE + 30 THEN '✅ Dans les 30 jours'
    ELSE '❌ Trop loin (> 30 jours)'
  END as "État"
FROM contrat c
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 2. Chercher une notification pour Wajdi
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    NOTIFICATIONS POUR WAJDI' as titre;

SELECT
  n.id,
  n.type as "Type Notif",
  n.metadata->>'document' as "Document",
  n.date_echeance as "Date Échéance",
  n.statut as "Statut",
  n.created_at as "Créée le",
  CASE
    WHEN n.date_echeance = c.date_fin THEN '✅ Date correspond'
    ELSE '❌ Date ne correspond pas'
  END as "Check Date"
FROM notification n
JOIN contrat c ON c.profil_id = n.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
  AND n.type IN ('contrat_cdd', 'contrat_cdd_expire')
ORDER BY n.created_at DESC;

-- ========================================
-- 3. Compter les notifications CDD
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    STATISTIQUES NOTIFICATIONS' as titre;

SELECT
  COUNT(*) as "Total notifications CDD",
  COUNT(CASE WHEN n.statut = 'active' THEN 1 END) as "Actives",
  COUNT(CASE WHEN n.statut = 'email_envoye' THEN 1 END) as "Email envoyé",
  COUNT(CASE WHEN n.statut = 'resolue' THEN 1 END) as "Résolues",
  COUNT(CASE WHEN n.statut = 'ignoree' THEN 1 END) as "Ignorées"
FROM notification n
WHERE n.type IN ('contrat_cdd', 'contrat_cdd_expire');

-- ========================================
-- 4. Voir TOUTES les notifications CDD
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    LISTE NOTIFICATIONS CDD' as titre;

SELECT
  p.matricule_tca as "Matricule",
  p.nom as "Nom",
  p.prenom as "Prénom",
  n.date_echeance as "Date Expiration",
  n.date_echeance - CURRENT_DATE as "Jours restants",
  n.statut as "Statut",
  c.source as "Source"
FROM notification n
JOIN profil p ON n.profil_id = p.id
LEFT JOIN contrat c ON c.profil_id = p.id AND c.date_fin = n.date_echeance
WHERE n.type IN ('contrat_cdd', 'contrat_cdd_expire')
ORDER BY n.date_echeance ASC
LIMIT 20;

-- ========================================
-- 5. Tester la condition de génération
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    TEST CONDITION GÉNÉRATION' as titre;

-- Simuler la requête de generate_expiration_notifications()
SELECT
  c.id,
  p.matricule_tca as "Matricule",
  p.nom as "Nom",
  c.type as "Type",
  c.date_fin as "Date Fin",
  c.statut as "Statut",
  CASE
    WHEN c.type = 'CDD' THEN '✅'
    ELSE '❌ Type: ' || COALESCE(c.type, 'NULL')
  END as "Check Type",
  CASE
    WHEN c.date_fin IS NOT NULL THEN '✅'
    ELSE '❌ Date NULL'
  END as "Check Date Not NULL",
  CASE
    WHEN c.date_fin > CURRENT_DATE THEN '❌ Future (' || (c.date_fin - CURRENT_DATE) || ' jours)'
    WHEN c.date_fin = CURRENT_DATE THEN '⚠️ AUJOURD''HUI'
    ELSE '❌ Passé'
  END as "Check Date > Now",
  CASE
    WHEN c.date_fin <= CURRENT_DATE + 30 THEN '✅'
    ELSE '❌ Trop loin'
  END as "Check Date <= +30j",
  CASE
    WHEN c.statut = 'actif' THEN '✅'
    ELSE '❌ Statut: ' || c.statut
  END as "Check Statut",
  CASE
    WHEN EXISTS (
      SELECT 1 FROM notification n
      WHERE n.profil_id = c.profil_id
        AND n.type = 'contrat_cdd'
        AND n.date_echeance = c.date_fin
        AND n.statut IN ('active', 'email_envoye')
    ) THEN '❌ Notification existe'
    ELSE '✅ Pas de notification'
  END as "Check Notification"
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- DIAGNOSTIC FINAL
-- ========================================
DO $$
DECLARE
  v_contrat RECORD;
  v_has_notification BOOLEAN;
BEGIN
  SELECT
    c.type,
    c.date_fin,
    c.statut,
    c.source
  INTO v_contrat
  FROM contrat c
  WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

  SELECT EXISTS (
    SELECT 1 FROM notification n
    JOIN contrat c ON c.profil_id = n.profil_id
    WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
      AND n.type IN ('contrat_cdd', 'contrat_cdd_expire')
      AND n.date_echeance = c.date_fin
  ) INTO v_has_notification;

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  DIAGNOSTIC FINAL                                         ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Contrat de Wajdi:';
  RAISE NOTICE '  Type: %', COALESCE(v_contrat.type, 'NULL');
  RAISE NOTICE '  Date fin: %', v_contrat.date_fin;
  RAISE NOTICE '  Statut: %', v_contrat.statut;
  RAISE NOTICE '  Source: %', COALESCE(v_contrat.source, 'NULL');
  RAISE NOTICE '';

  IF v_has_notification THEN
    RAISE NOTICE '✅ UNE NOTIFICATION EXISTE!';
    RAISE NOTICE '';
    RAISE NOTICE 'Le contrat de Wajdi a bien une notification.';
    RAISE NOTICE '';
    RAISE NOTICE 'Si vous ne la voyez pas dans l''interface:';
    RAISE NOTICE '  1. Vérifiez les FILTRES de l''interface';
    RAISE NOTICE '  2. Vérifiez l''onglet actif (Active/Toutes/Résolues)';
    RAISE NOTICE '  3. Rafraîchissez la page (F5)';
    RAISE NOTICE '  4. Cherchez "wajdi" ou "15901"';
  ELSE
    RAISE NOTICE '❌ AUCUNE NOTIFICATION';
    RAISE NOTICE '';

    IF v_contrat.date_fin = CURRENT_DATE THEN
      RAISE NOTICE '⚠️  Le contrat expire AUJOURD''HUI mais pas de notification!';
      RAISE NOTICE '';
      RAISE NOTICE 'PROBLÈME: La fonction ne génère pas pour date_fin = CURRENT_DATE';
      RAISE NOTICE '          Elle cherche: date_fin > CURRENT_DATE';
      RAISE NOTICE '          Mais Wajdi: date_fin = CURRENT_DATE';
      RAISE NOTICE '';
      RAISE NOTICE 'SOLUTION: Modifier la condition de la fonction';
      RAISE NOTICE '          date_fin > CURRENT_DATE  →  date_fin >= CURRENT_DATE';
    ELSIF v_contrat.date_fin < CURRENT_DATE THEN
      RAISE NOTICE '❌ Le contrat est DÉJÀ EXPIRÉ';
      RAISE NOTICE '   La fonction ne génère pas pour les contrats passés';
    ELSE
      RAISE NOTICE '⚠️  Autre problème - vérifier les conditions ci-dessus';
    END IF;
  END IF;
  RAISE NOTICE '';
END $$;
