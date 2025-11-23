/*
  # Daily Automatic Incident Generation

  This function runs daily to create incidents for newly expired documents.
  It should be scheduled via pg_cron to run every day at 6:00 AM.

  Process:
  1. Scans all active employees for documents that expired TODAY (date = CURRENT_DATE)
  2. Creates incidents only for documents that expired exactly today (not before)
  3. Prevents duplicate incidents (checks if incident already exists)
  4. Links to existing notifications if they exist

  Usage (manual):
    SELECT generate_daily_expired_incidents();

  CRON setup (run daily at 6:00 AM):
    SELECT cron.schedule('generate-daily-incidents', '0 6 * * *', 'SELECT generate_daily_expired_incidents();');
*/

CREATE OR REPLACE FUNCTION generate_daily_expired_incidents()
RETURNS jsonb AS $$
DECLARE
  v_profil RECORD;
  v_contrat RECORD;
  v_notification_id uuid;
  v_incident_id uuid;
  v_count_titre_sejour INTEGER := 0;
  v_count_visite_medicale INTEGER := 0;
  v_count_permis_conduire INTEGER := 0;
  v_count_contrat_cdd INTEGER := 0;
  v_result jsonb;
BEGIN
  -- 1. Create incidents for titres de sejour expiring TODAY
  FOR v_profil IN
    SELECT id, titre_sejour_fin_validite
    FROM profil
    WHERE titre_sejour_fin_validite = CURRENT_DATE
      AND statut = 'actif'
  LOOP
    -- Check if incident already exists
    IF NOT EXISTS (
      SELECT 1 FROM incident
      WHERE profil_id = v_profil.id
        AND type = 'titre_sejour'
        AND date_expiration_originale = v_profil.titre_sejour_fin_validite
        AND statut IN ('actif', 'en_cours')
    ) THEN
      -- Find related notification if exists
      SELECT id INTO v_notification_id
      FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'titre_sejour'
        AND date_echeance = v_profil.titre_sejour_fin_validite
      LIMIT 1;

      -- Create incident
      INSERT INTO incident (
        type,
        profil_id,
        date_expiration_originale,
        date_creation_incident,
        statut,
        ancienne_date_validite,
        metadata
      ) VALUES (
        'titre_sejour',
        v_profil.id,
        v_profil.titre_sejour_fin_validite,
        CURRENT_DATE,
        'actif',
        v_profil.titre_sejour_fin_validite,
        jsonb_build_object(
          'document', 'Titre de séjour',
          'auto_generated', true,
          'notification_id', v_notification_id
        )
      ) RETURNING id INTO v_incident_id;

      -- Link notification to incident if exists
      IF v_notification_id IS NOT NULL THEN
        UPDATE notification
        SET incident_id = v_incident_id
        WHERE id = v_notification_id;
      END IF;

      v_count_titre_sejour := v_count_titre_sejour + 1;
    END IF;
  END LOOP;

  -- 2. Create incidents for visites medicales expiring TODAY
  FOR v_profil IN
    SELECT id, date_fin_visite_medicale
    FROM profil
    WHERE date_fin_visite_medicale = CURRENT_DATE
      AND statut = 'actif'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM incident
      WHERE profil_id = v_profil.id
        AND type = 'visite_medicale'
        AND date_expiration_originale = v_profil.date_fin_visite_medicale
        AND statut IN ('actif', 'en_cours')
    ) THEN
      SELECT id INTO v_notification_id
      FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'visite_medicale'
        AND date_echeance = v_profil.date_fin_visite_medicale
      LIMIT 1;

      INSERT INTO incident (
        type,
        profil_id,
        date_expiration_originale,
        date_creation_incident,
        statut,
        ancienne_date_validite,
        metadata
      ) VALUES (
        'visite_medicale',
        v_profil.id,
        v_profil.date_fin_visite_medicale,
        CURRENT_DATE,
        'actif',
        v_profil.date_fin_visite_medicale,
        jsonb_build_object(
          'document', 'Visite médicale',
          'auto_generated', true,
          'notification_id', v_notification_id
        )
      ) RETURNING id INTO v_incident_id;

      IF v_notification_id IS NOT NULL THEN
        UPDATE notification
        SET incident_id = v_incident_id
        WHERE id = v_notification_id;
      END IF;

      v_count_visite_medicale := v_count_visite_medicale + 1;
    END IF;
  END LOOP;

  -- 3. Create incidents for permis de conduire expiring TODAY
  FOR v_profil IN
    SELECT id, permis_conduire_expiration
    FROM profil
    WHERE permis_conduire_expiration = CURRENT_DATE
      AND statut = 'actif'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM incident
      WHERE profil_id = v_profil.id
        AND type = 'permis_conduire'
        AND date_expiration_originale = v_profil.permis_conduire_expiration
        AND statut IN ('actif', 'en_cours')
    ) THEN
      SELECT id INTO v_notification_id
      FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'permis_conduire'
        AND date_echeance = v_profil.permis_conduire_expiration
      LIMIT 1;

      INSERT INTO incident (
        type,
        profil_id,
        date_expiration_originale,
        date_creation_incident,
        statut,
        ancienne_date_validite,
        metadata
      ) VALUES (
        'permis_conduire',
        v_profil.id,
        v_profil.permis_conduire_expiration,
        CURRENT_DATE,
        'actif',
        v_profil.permis_conduire_expiration,
        jsonb_build_object(
          'document', 'Permis de conduire',
          'auto_generated', true,
          'notification_id', v_notification_id
        )
      ) RETURNING id INTO v_incident_id;

      IF v_notification_id IS NOT NULL THEN
        UPDATE notification
        SET incident_id = v_incident_id
        WHERE id = v_notification_id;
      END IF;

      v_count_permis_conduire := v_count_permis_conduire + 1;
    END IF;
  END LOOP;

  -- 4. Create incidents for CDD contracts expiring TODAY
  FOR v_contrat IN
    SELECT c.id, c.profil_id, c.date_fin
    FROM contrat c
    WHERE c.type = 'CDD'
      AND c.date_fin = CURRENT_DATE
      AND c.statut = 'actif'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM incident
      WHERE profil_id = v_contrat.profil_id
        AND type = 'contrat_cdd'
        AND date_expiration_originale = v_contrat.date_fin
        AND statut IN ('actif', 'en_cours')
    ) THEN
      SELECT id INTO v_notification_id
      FROM notification
      WHERE profil_id = v_contrat.profil_id
        AND type = 'contrat_cdd'
        AND date_echeance = v_contrat.date_fin
      LIMIT 1;

      INSERT INTO incident (
        type,
        profil_id,
        date_expiration_originale,
        date_creation_incident,
        statut,
        ancienne_date_validite,
        metadata
      ) VALUES (
        'contrat_cdd',
        v_contrat.profil_id,
        v_contrat.date_fin,
        CURRENT_DATE,
        'actif',
        v_contrat.date_fin,
        jsonb_build_object(
          'document', 'Contrat CDD',
          'contrat_id', v_contrat.id,
          'auto_generated', true,
          'notification_id', v_notification_id
        )
      ) RETURNING id INTO v_incident_id;

      IF v_notification_id IS NOT NULL THEN
        UPDATE notification
        SET incident_id = v_incident_id
        WHERE id = v_notification_id;
      END IF;

      v_count_contrat_cdd := v_count_contrat_cdd + 1;
    END IF;
  END LOOP;

  -- Build result JSON
  v_result := jsonb_build_object(
    'titre_sejour', v_count_titre_sejour,
    'visite_medicale', v_count_visite_medicale,
    'permis_conduire', v_count_permis_conduire,
    'contrat_cdd', v_count_contrat_cdd,
    'total', v_count_titre_sejour + v_count_visite_medicale + v_count_permis_conduire + v_count_contrat_cdd,
    'date_execution', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
