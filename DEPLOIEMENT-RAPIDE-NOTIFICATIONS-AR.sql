/*
  # DÉPLOIEMENT RAPIDE - Système de Notifications A&R

  Ce script déploie le système complet de notifications A&R en une seule fois.

  ATTENTION:
  - Ce script supprime les notifications A&R invalides existantes
  - Installez la fonction de génération automatique
  - Configure le CRON job pour exécution quotidienne

  AVANT D'EXÉCUTER:
  - Vérifiez que vous avez sauvegardé vos données
  - Exécutez d'abord DIAGNOSTIC-NOTIFICATIONS-AR-COMPLETE.sql
*/

BEGIN;

-- ============================================================================
-- ÉTAPE 1: NETTOYAGE DES NOTIFICATIONS INVALIDES
-- ============================================================================

SELECT '🧹 Nettoyage des notifications A&R invalides...' as etape;

-- Compter avant suppression
SELECT
  COUNT(*) as notifications_invalides_a_supprimer
FROM inbox i
LEFT JOIN compta_ar_events ar ON i.reference_id = ar.id::text
WHERE i.type = 'ar_fin_absence'
  AND (
    ar.id IS NULL
    OR ar.ar_type != 'ABSENCE'
    OR ar.end_date != CURRENT_DATE
  );

-- Suppression des notifications invalides
DELETE FROM inbox
WHERE type = 'ar_fin_absence'
  AND (
    -- Référence invalide
    NOT EXISTS (
      SELECT 1 FROM compta_ar_events
      WHERE id::text = inbox.reference_id
    )
    -- Ou mauvais type
    OR EXISTS (
      SELECT 1 FROM compta_ar_events ar
      WHERE ar.id::text = inbox.reference_id
        AND ar.ar_type != 'ABSENCE'
    )
    -- Ou mauvaise date
    OR EXISTS (
      SELECT 1 FROM compta_ar_events ar
      WHERE ar.id::text = inbox.reference_id
        AND ar.end_date != CURRENT_DATE
    )
  );

SELECT '✅ Nettoyage terminé' as resultat;

-- ============================================================================
-- ÉTAPE 2: CRÉATION DE LA FONCTION DE GÉNÉRATION
-- ============================================================================

SELECT '⚙️ Installation de la fonction de génération automatique...' as etape;

CREATE OR REPLACE FUNCTION generate_ar_fin_absence_notifications()
RETURNS jsonb AS $$
DECLARE
  v_ar_event RECORD;
  v_user RECORD;
  v_count INTEGER := 0;
  v_pole_compta_id uuid;
BEGIN
  -- Récupérer l'ID du pôle Comptabilité/RH
  SELECT id INTO v_pole_compta_id
  FROM pole
  WHERE LOWER(nom) LIKE '%comptabilit%'
     OR LOWER(nom) LIKE '%compta%'
  LIMIT 1;

  -- Pour chaque absence se terminant AUJOURD'HUI
  FOR v_ar_event IN
    SELECT
      ar.id,
      ar.profil_id,
      ar.start_date,
      ar.end_date,
      p.matricule_tca,
      p.nom,
      p.prenom
    FROM compta_ar_events ar
    JOIN profil p ON ar.profil_id = p.id
    WHERE ar.ar_type = 'ABSENCE'
      AND ar.end_date = CURRENT_DATE
      AND p.statut IN ('actif', 'contrat_signe')
  LOOP
    -- Pour chaque utilisateur du pôle Comptabilité ou avec permission compta/ar
    FOR v_user IN
      SELECT DISTINCT au.id
      FROM app_utilisateur au
      WHERE au.actif = true
        AND (
          au.pole_id = v_pole_compta_id
          OR au.permissions ? 'compta/ar'
          OR au.permissions ? 'comptabilite'
        )
    LOOP
      -- Vérifier si la notification existe déjà
      IF NOT EXISTS (
        SELECT 1 FROM inbox
        WHERE utilisateur_id = v_user.id
          AND type = 'ar_fin_absence'
          AND reference_id = v_ar_event.id::text
      ) THEN
        -- Créer la notification
        INSERT INTO inbox (
          utilisateur_id,
          type,
          titre,
          description,
          contenu,
          reference_id,
          reference_type,
          statut,
          lu
        ) VALUES (
          v_user.id,
          'ar_fin_absence',
          'Fin d''absence aujourd''hui',
          format(
            'L''absence de %s %s (matricule %s) se termine aujourd''hui (%s).',
            v_ar_event.prenom,
            v_ar_event.nom,
            v_ar_event.matricule_tca,
            to_char(v_ar_event.end_date, 'DD/MM/YYYY')
          ),
          jsonb_build_object(
            'profil_id', v_ar_event.profil_id,
            'matricule', v_ar_event.matricule_tca,
            'nom', v_ar_event.nom,
            'prenom', v_ar_event.prenom,
            'start_date', v_ar_event.start_date,
            'end_date', v_ar_event.end_date,
            'generated_at', now()
          ),
          v_ar_event.id::text,
          'compta_ar_event',
          'nouveau',
          false
        );

        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'notifications_created', v_count,
    'execution_date', CURRENT_DATE,
    'execution_time', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_ar_fin_absence_notifications() TO authenticated;

SELECT '✅ Fonction installée' as resultat;

-- ============================================================================
-- ÉTAPE 3: CONFIGURATION DU CRON JOB
-- ============================================================================

SELECT '📅 Configuration du CRON job...' as etape;

-- Supprimer le job s'il existe déjà
SELECT cron.unschedule('generate-ar-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-ar-notifications');

-- Créer le job (exécution quotidienne à 6h00 AM)
SELECT cron.schedule(
  'generate-ar-notifications',
  '0 6 * * *',
  'SELECT generate_ar_fin_absence_notifications();'
);

SELECT '✅ CRON job configuré (exécution quotidienne à 6h00 AM)' as resultat;

-- ============================================================================
-- ÉTAPE 4: TEST DE LA FONCTION
-- ============================================================================

SELECT '🧪 Test de la fonction...' as etape;

-- Exécuter une fois pour générer les notifications du jour
SELECT generate_ar_fin_absence_notifications() as resultat_test;

-- ============================================================================
-- ÉTAPE 5: VÉRIFICATION FINALE
-- ============================================================================

SELECT '📊 Vérification finale...' as etape;

-- Compter les notifications valides
SELECT
  COUNT(*) as notifications_ar_valides,
  COUNT(DISTINCT reference_id) as absences_uniques,
  COUNT(DISTINCT utilisateur_id) as destinataires_uniques
FROM inbox i
JOIN compta_ar_events ar ON i.reference_id = ar.id::text
WHERE i.type = 'ar_fin_absence'
  AND ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE;

-- Lister les absences du jour avec leurs notifications
SELECT
  ar.id as ar_event_id,
  p.matricule_tca,
  p.nom,
  p.prenom,
  ar.start_date,
  ar.end_date,
  COUNT(i.id) as nb_notifications
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
LEFT JOIN inbox i ON i.reference_id = ar.id::text AND i.type = 'ar_fin_absence'
WHERE ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE
GROUP BY ar.id, p.matricule_tca, p.nom, p.prenom, ar.start_date, ar.end_date;

-- Vérifier le CRON
SELECT
  jobname,
  schedule,
  command,
  active,
  last_run,
  next_run
FROM cron.job
WHERE jobname = 'generate-ar-notifications';

COMMIT;

SELECT '🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !' as resultat_final;

-- ============================================================================
-- INSTRUCTIONS POST-DÉPLOIEMENT
-- ============================================================================

/*
✅ Le système de notifications A&R est maintenant actif !

📋 Prochaines étapes:
1. Vérifier les résultats de la section "Vérification finale" ci-dessus
2. Tester dans l'UI:
   - Se connecter avec un compte ayant la permission compta/ar
   - Aller dans l'Inbox
   - Vérifier la carte "A&R" et le filtre
   - Cliquer sur une notification et vérifier la navigation vers A&R

🔧 Maintenance:
- Les notifications sont générées automatiquement chaque jour à 6h00 AM
- Pour générer manuellement: SELECT generate_ar_fin_absence_notifications();
- Pour vérifier les logs: SELECT * FROM cron.job_run_details WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'generate-ar-notifications');

📝 Règles de génération:
- Uniquement pour compta_ar_events.ar_type = 'ABSENCE'
- Uniquement si end_date = CURRENT_DATE
- Profil doit être statut = 'actif'
- Pas de doublons

👥 Destinataires:
- Utilisateurs du pôle "Comptabilité/RH"
- OU utilisateurs avec permission compta/ar
- OU utilisateurs avec permission comptabilite
- Seulement si actif = true
*/
