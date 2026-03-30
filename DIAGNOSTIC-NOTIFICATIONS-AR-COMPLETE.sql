/*
  # DIAGNOSTIC COMPLET DES NOTIFICATIONS A&R

  Ce script permet de diagnostiquer les notifications A&R dans l'Inbox
  et de vérifier leur cohérence avec les événements compta_ar_events.
*/

-- 1. Lister toutes les notifications A&R existantes avec leurs détails
SELECT
  '=== NOTIFICATIONS A&R DANS INBOX ===' as section;

SELECT
  i.id as notification_id,
  i.titre,
  i.description,
  i.reference_id,
  i.created_at as notification_created,
  ar.id as ar_event_id,
  ar.ar_type,
  ar.start_date,
  ar.end_date,
  ar.end_date = CURRENT_DATE as is_today,
  p.matricule_tca,
  p.nom,
  p.prenom,
  CASE
    WHEN ar.id IS NULL THEN '❌ RÉFÉRENCE INVALIDE'
    WHEN ar.ar_type != 'ABSENCE' THEN '❌ MAUVAIS TYPE (pas une absence)'
    WHEN ar.end_date != CURRENT_DATE THEN '❌ DATE INCORRECTE (pas aujourd''hui)'
    ELSE '✅ OK'
  END as statut_validation
FROM inbox i
LEFT JOIN compta_ar_events ar ON i.reference_id = ar.id::text
LEFT JOIN profil p ON ar.profil_id = p.id
WHERE i.type = 'ar_fin_absence'
ORDER BY i.created_at DESC;

-- 2. Vérifier s'il existe des événements A&R qui devraient avoir une notification aujourd'hui
SELECT
  '=== ABSENCES SE TERMINANT AUJOURD''HUI (devraient avoir une notification) ===' as section;

SELECT
  ar.id as ar_event_id,
  ar.ar_type,
  ar.start_date,
  ar.end_date,
  p.matricule_tca,
  p.nom,
  p.prenom,
  p.statut as profil_statut,
  EXISTS (
    SELECT 1 FROM inbox
    WHERE type = 'ar_fin_absence'
    AND reference_id = ar.id::text
  ) as notification_existe,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM inbox WHERE type = 'ar_fin_absence' AND reference_id = ar.id::text)
    THEN '❌ NOTIFICATION MANQUANTE'
    ELSE '✅ NOTIFICATION EXISTE'
  END as statut
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
WHERE ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE
ORDER BY ar.end_date DESC;

-- 3. Rechercher des fonctions ou triggers de génération de notifications A&R
SELECT
  '=== FONCTIONS/TRIGGERS POUR NOTIFICATIONS A&R ===' as section;

SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname LIKE '%ar%notification%'
   OR proname LIKE '%generate%ar%'
   OR pg_get_functiondef(oid) ILIKE '%ar_fin_absence%'
ORDER BY proname;

-- 4. Vérifier les cron jobs existants
SELECT
  '=== CRON JOBS EXISTANTS ===' as section;

SELECT
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE command ILIKE '%ar%'
   OR command ILIKE '%absence%'
ORDER BY jobname;

-- 5. Compter les notifications par statut de validation
SELECT
  '=== RÉSUMÉ DES NOTIFICATIONS A&R ===' as section;

SELECT
  COUNT(*) as total_notifications,
  SUM(CASE WHEN ar.id IS NULL THEN 1 ELSE 0 END) as references_invalides,
  SUM(CASE WHEN ar.ar_type != 'ABSENCE' THEN 1 ELSE 0 END) as mauvais_type,
  SUM(CASE WHEN ar.end_date != CURRENT_DATE THEN 1 ELSE 0 END) as mauvaises_dates,
  SUM(CASE WHEN ar.id IS NOT NULL AND ar.ar_type = 'ABSENCE' AND ar.end_date = CURRENT_DATE THEN 1 ELSE 0 END) as notifications_valides
FROM inbox i
LEFT JOIN compta_ar_events ar ON i.reference_id = ar.id::text
WHERE i.type = 'ar_fin_absence';
