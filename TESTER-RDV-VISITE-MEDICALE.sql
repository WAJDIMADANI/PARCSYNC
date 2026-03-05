-- ============================================
-- SCRIPT DE TEST : Système de rappel RDV visite médicale
-- ============================================

-- 1. Vérifier que les colonnes ont été ajoutées
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profil'
  AND column_name IN ('visite_medicale_rdv_date', 'visite_medicale_rdv_heure')
ORDER BY column_name;

-- 2. Vérifier que le type d'incident existe
SELECT enumlabel
FROM pg_enum
WHERE enumlabel = 'rdv_visite_medicale'
  AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'incident_type');

-- 3. Vérifier que les fonctions existent
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('generate_rdv_visite_medicale_notifications', 'create_immediate_rdv_notification', 'trigger_rdv_notification')
ORDER BY routine_name;

-- 4. Vérifier que le trigger existe
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_rdv_visite_medicale_notification';

-- 5. Vérifier que le job CRON existe
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'generate-rdv-visite-medicale-notifications';

-- ============================================
-- TEST 1 : Créer un RDV test pour dans 2 jours
-- ============================================

-- Sélectionner un profil de test (prendre le premier trouvé)
SELECT id, prenom, nom, matricule_tca
FROM profil
WHERE deleted_at IS NULL
  AND statut NOT IN ('sorti', 'inactif')
LIMIT 1;

-- Mettre à jour avec un RDV dans 2 jours (REMPLACER 'xxx' par un vrai ID ci-dessus)
-- UPDATE profil
-- SET
--   visite_medicale_rdv_date = CURRENT_DATE + INTERVAL '2 days',
--   visite_medicale_rdv_heure = '14:30:00'
-- WHERE id = 'xxx';

-- ============================================
-- TEST 2 : Tester la fonction manuellement
-- ============================================

-- Exécuter la fonction pour générer les notifications
-- SELECT * FROM generate_rdv_visite_medicale_notifications();

-- ============================================
-- TEST 3 : Vérifier les notifications créées
-- ============================================

-- Voir toutes les notifications de type rdv_visite_medicale
-- SELECT
--   i.id,
--   i.titre,
--   i.description,
--   i.statut,
--   i.date_expiration,
--   i.created_at,
--   p.prenom,
--   p.nom,
--   p.matricule_tca,
--   au.email as assigned_to_email
-- FROM incident i
-- LEFT JOIN profil p ON i.profil_id = p.id
-- LEFT JOIN app_utilisateur au ON i.assigned_to = au.id
-- WHERE i.type = 'rdv_visite_medicale'
-- ORDER BY i.created_at DESC;

-- ============================================
-- TEST 4 : Tester notification immédiate (RDV < 2 jours)
-- ============================================

-- Créer un RDV pour demain (notification immédiate)
-- UPDATE profil
-- SET
--   visite_medicale_rdv_date = CURRENT_DATE + INTERVAL '1 day',
--   visite_medicale_rdv_heure = '09:00:00'
-- WHERE id = 'xxx';

-- Le trigger devrait créer automatiquement la notification

-- ============================================
-- TEST 5 : Vérifier les utilisateurs qui recevront les notifications
-- ============================================

SELECT DISTINCT
  au.id,
  au.email,
  au.prenom,
  au.nom,
  p.code as permission
FROM app_utilisateur au
INNER JOIN utilisateur_permission up ON au.id = up.utilisateur_id
INNER JOIN permission p ON up.permission_id = p.id
WHERE p.code IN ('accueil_recrutement', 'admin_full', 'rh_full')
  AND au.actif = true
ORDER BY au.email;

-- ============================================
-- NETTOYAGE (si nécessaire)
-- ============================================

-- Supprimer les notifications de test
-- DELETE FROM incident WHERE type = 'rdv_visite_medicale' AND created_at > NOW() - INTERVAL '1 hour';

-- Réinitialiser les RDV de test
-- UPDATE profil
-- SET
--   visite_medicale_rdv_date = NULL,
--   visite_medicale_rdv_heure = NULL
-- WHERE id = 'xxx';

-- ============================================
-- GUIDE D'UTILISATION
-- ============================================

/*
COMMENT UTILISER CE SYSTÈME :

1. DANS L'INTERFACE WEB :
   - Ouvrir un profil salarié
   - Cliquer sur "Modifier" dans la section "Documents administratifs"
   - Renseigner la "Date du rendez-vous" et "Heure du rendez-vous"
   - Cliquer sur "Enregistrer"

2. COMPORTEMENT AUTOMATIQUE :
   - Si le RDV est dans plus de 2 jours : Rien ne se passe immédiatement
   - Si le RDV est dans 2 jours ou moins : Notification immédiate créée
   - Chaque jour à 8h00 : Le système vérifie les RDV dans 2 jours et crée les notifications

3. QUI REÇOIT LES NOTIFICATIONS :
   - Tous les utilisateurs avec la permission "Accueil - Recrutement"
   - Tous les utilisateurs avec la permission "Admin Full"
   - Tous les utilisateurs avec la permission "RH Full"

4. FORMAT DES NOTIFICATIONS :
   Titre : "Rappel RDV Visite Médicale"
   Description : "Prénom Nom (matricule XXX) a un RDV le 07/03/2026 à 14:30"

5. MODIFICATION D'UN RDV :
   - Si vous modifiez la date/heure d'un RDV existant
   - Les anciennes notifications sont supprimées
   - De nouvelles notifications sont créées selon les règles ci-dessus

6. VISUALISATION :
   - Les notifications apparaissent dans l'inbox de chaque utilisateur concerné
   - Type : rdv_visite_medicale
   - Statut : ouvert
*/
