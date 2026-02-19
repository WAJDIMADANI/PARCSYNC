-- ============================================================================
-- SCRIPT DE VÉRIFICATION : Exclusion des salariés sortis
-- ============================================================================

-- 1. Compter les salariés sortis
SELECT
  'Nombre de salariés sortis' as info,
  COUNT(*) as nombre
FROM profil
WHERE statut = 'sorti'
  AND deleted_at IS NULL;

-- 2. Vérifier les incidents actifs de salariés sortis (doit être 0)
SELECT
  'Incidents actifs de salariés sortis' as probleme,
  COUNT(*) as nombre_incorrect,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ OK'
    ELSE '❌ PROBLEME: Des incidents actifs existent pour des sortis'
  END as statut
FROM incident i
JOIN profil p ON i.profil_id = p.id
WHERE p.statut = 'sorti'
  AND i.statut IN ('actif', 'en_cours');

-- 3. Vérifier les notifications actives de salariés sortis (doit être 0)
SELECT
  'Notifications actives de salariés sortis' as probleme,
  COUNT(*) as nombre_incorrect,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ OK'
    ELSE '❌ PROBLEME: Des notifications actives existent pour des sortis'
  END as statut
FROM notification n
JOIN profil p ON n.profil_id = p.id
WHERE p.statut = 'sorti'
  AND n.statut IN ('active', 'email_envoye');

-- 4. Tester la fonction get_missing_documents_by_salarie()
SELECT
  'Documents manquants pour salariés sortis' as probleme,
  COUNT(*) as nombre_incorrect,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ OK'
    ELSE '❌ PROBLEME: Des documents manquants retournés pour des sortis'
  END as statut
FROM get_missing_documents_by_salarie() d
JOIN profil p ON d.profil_id = p.id
WHERE p.statut = 'sorti';

-- 5. Tester la fonction get_cdd_expires()
SELECT
  'CDD expirés pour salariés sortis' as probleme,
  COUNT(*) as nombre_incorrect,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ OK'
    ELSE '❌ PROBLEME: Des CDD retournés pour des sortis'
  END as statut
FROM get_cdd_expires() c
JOIN profil p ON c.profil_id = p.id
WHERE p.statut = 'sorti';

-- 6. Tester la vue v_incidents_ouverts_rh
SELECT
  'Vue v_incidents_ouverts_rh avec salariés sortis' as probleme,
  COUNT(*) as nombre_incorrect,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ OK'
    ELSE '❌ PROBLEME: La vue retourne des incidents de sortis'
  END as statut
FROM v_incidents_ouverts_rh v
JOIN profil p ON v.profil_id = p.id
WHERE p.statut = 'sorti';

-- 7. Liste détaillée des incidents problématiques (si existants)
SELECT
  'DETAIL: Incidents problématiques' as titre,
  i.id as incident_id,
  i.type as incident_type,
  i.statut as incident_statut,
  p.matricule,
  p.prenom,
  p.nom,
  p.statut as profil_statut
FROM incident i
JOIN profil p ON i.profil_id = p.id
WHERE p.statut = 'sorti'
  AND i.statut IN ('actif', 'en_cours')
ORDER BY i.created_at DESC;

-- 8. Liste détaillée des notifications problématiques (si existantes)
SELECT
  'DETAIL: Notifications problématiques' as titre,
  n.id as notification_id,
  n.type as notification_type,
  n.statut as notification_statut,
  p.matricule,
  p.prenom,
  p.nom,
  p.statut as profil_statut
FROM notification n
JOIN profil p ON n.profil_id = p.id
WHERE p.statut = 'sorti'
  AND n.statut IN ('active', 'email_envoye')
ORDER BY n.created_at DESC;

-- 9. Résumé final
SELECT
  '=== RÉSUMÉ FINAL ===' as titre,
  (SELECT COUNT(*) FROM profil WHERE statut = 'sorti') as total_sortis,
  (SELECT COUNT(*) FROM incident i JOIN profil p ON i.profil_id = p.id
   WHERE p.statut = 'sorti' AND i.statut IN ('actif', 'en_cours')) as incidents_problematiques,
  (SELECT COUNT(*) FROM notification n JOIN profil p ON n.profil_id = p.id
   WHERE p.statut = 'sorti' AND n.statut IN ('active', 'email_envoye')) as notifications_problematiques,
  CASE
    WHEN (SELECT COUNT(*) FROM incident i JOIN profil p ON i.profil_id = p.id
          WHERE p.statut = 'sorti' AND i.statut IN ('actif', 'en_cours')) = 0
     AND (SELECT COUNT(*) FROM notification n JOIN profil p ON n.profil_id = p.id
          WHERE p.statut = 'sorti' AND n.statut IN ('active', 'email_envoye')) = 0
    THEN '✅ TOUT EST OK - Les sortis sont bien exclus'
    ELSE '❌ PROBLEME DETECTE - Exécuter close_incidents_for_departed_employees() et archive_notifications_for_departed_employees()'
  END as statut_global;
