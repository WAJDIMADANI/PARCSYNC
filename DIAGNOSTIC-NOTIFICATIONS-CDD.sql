/*
  # DIAGNOSTIC - Notifications CDD

  Ce script permet de vérifier pourquoi les notifications CDD n'apparaissent pas
  dans l'onglet Notifications.

  Instructions: Exécutez chaque section séparément dans l'éditeur SQL de Supabase
*/

-- ========================================
-- SECTION 1: Vérifier les contrats CDD
-- ========================================

SELECT
  '--- CONTRATS CDD EXISTANTS ---' as diagnostic;

-- Tous les contrats CDD actifs
SELECT
  c.id,
  c.type,
  c.date_debut,
  c.date_fin,
  c.statut,
  CASE
    WHEN c.date_fin IS NULL THEN 'Pas de date de fin'
    WHEN c.date_fin < CURRENT_DATE THEN 'Expiré'
    WHEN c.date_fin <= CURRENT_DATE + INTERVAL '30 days' THEN 'Dans les 30 jours'
    ELSE 'Plus de 30 jours'
  END as echeance_status,
  EXTRACT(DAY FROM (c.date_fin - CURRENT_DATE)) as jours_restants,
  p.prenom,
  p.nom,
  p.email
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
WHERE c.type = 'CDD'
ORDER BY c.date_fin ASC;

-- ========================================
-- SECTION 2: Vérifier les notifications existantes
-- ========================================

SELECT
  '--- NOTIFICATIONS CDD EXISTANTES ---' as diagnostic;

-- Toutes les notifications de type contrat_cdd
SELECT
  n.id,
  n.type,
  n.date_echeance,
  n.date_notification,
  n.statut,
  n.email_envoye_at,
  n.created_at,
  p.prenom,
  p.nom,
  p.email
FROM notification n
LEFT JOIN profil p ON n.profil_id = p.id
WHERE n.type = 'contrat_cdd'
ORDER BY n.date_echeance ASC;

-- ========================================
-- SECTION 3: Vérifier la fonction
-- ========================================

SELECT
  '--- VERIFICATION DE LA FONCTION ---' as diagnostic;

-- Vérifier si la fonction existe
SELECT
  proname as nom_fonction,
  prosrc as code_source
FROM pg_proc
WHERE proname = 'generate_expiration_notifications';

-- ========================================
-- SECTION 4: Vérifier le cron job
-- ========================================

SELECT
  '--- VERIFICATION DU CRON JOB ---' as diagnostic;

-- Vérifier si pg_cron est installé
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- Si pg_cron est installé, vérifier les jobs programmés
-- Note: Cette requête peut échouer si pg_cron n'est pas activé
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron est installé - vérifiez les jobs avec: SELECT * FROM cron.job;';
  ELSE
    RAISE NOTICE 'pg_cron n''est PAS installé - vous devrez exécuter la fonction manuellement';
  END IF;
END $$;

-- ========================================
-- SECTION 5: Contrats CDD qui DEVRAIENT avoir une notification
-- ========================================

SELECT
  '--- CONTRATS CDD QUI DEVRAIENT AVOIR UNE NOTIFICATION (30 jours) ---' as diagnostic;

-- Contrats CDD se terminant dans les 30 prochains jours qui n'ont PAS de notification
SELECT
  c.id as contrat_id,
  c.type,
  c.date_fin,
  EXTRACT(DAY FROM (c.date_fin - CURRENT_DATE)) as jours_restants,
  p.prenom,
  p.nom,
  p.email,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM notification n
      WHERE n.profil_id = c.profil_id
        AND n.type = 'contrat_cdd'
        AND n.date_echeance = c.date_fin
    ) THEN 'OUI - Notification existe'
    ELSE 'NON - Notification manquante'
  END as notification_status
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
WHERE c.type = 'CDD'
  AND c.date_fin IS NOT NULL
  AND c.date_fin > CURRENT_DATE
  AND c.date_fin <= CURRENT_DATE + INTERVAL '30 days'
  AND c.statut = 'actif'
ORDER BY c.date_fin ASC;

-- ========================================
-- RÉSUMÉ
-- ========================================

SELECT
  '--- RÉSUMÉ ---' as diagnostic;

SELECT
  'Contrats CDD actifs' as categorie,
  COUNT(*) as nombre
FROM contrat
WHERE type = 'CDD' AND statut = 'actif'
UNION ALL
SELECT
  'Contrats CDD se terminant dans 30 jours' as categorie,
  COUNT(*) as nombre
FROM contrat
WHERE type = 'CDD'
  AND date_fin IS NOT NULL
  AND date_fin > CURRENT_DATE
  AND date_fin <= CURRENT_DATE + INTERVAL '30 days'
  AND statut = 'actif'
UNION ALL
SELECT
  'Notifications CDD actives' as categorie,
  COUNT(*) as nombre
FROM notification
WHERE type = 'contrat_cdd'
  AND statut IN ('active', 'email_envoye');
