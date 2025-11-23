/*
  # Create function to automatically generate expiration notifications

  1. Function: generate_expiration_notifications()
    - Scans profil table for documents expiring in 30 days:
      - titre_sejour_fin_validite (residence permit)
      - date_fin_visite_medicale (medical visit)
      - permis_conduire_expiration (driving license)
    - Scans contrat table for CDD contracts ending in 15 days
    - Creates notification records automatically
    - Prevents duplicate notifications

  2. Usage
    - Can be called manually: SELECT generate_expiration_notifications();
    - Should be scheduled via pg_cron to run daily
    - Safe to run multiple times (checks for duplicates)
*/

CREATE OR REPLACE FUNCTION generate_expiration_notifications()
RETURNS void AS $$
DECLARE
  v_profil RECORD;
  v_contrat RECORD;
  v_date_notif date;
BEGIN
  -- 1. Notifications for titre de sejour (30 days before expiration)
  FOR v_profil IN
    SELECT id, titre_sejour_fin_validite
    FROM profil
    WHERE titre_sejour_fin_validite IS NOT NULL
      AND titre_sejour_fin_validite > CURRENT_DATE
      AND titre_sejour_fin_validite <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.titre_sejour_fin_validite - INTERVAL '30 days';

    -- Create notification only if it doesn't already exist
    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'titre_sejour', v_profil.id, v_profil.titre_sejour_fin_validite, v_date_notif,
           jsonb_build_object('document', 'Titre de séjour')
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'titre_sejour'
        AND date_echeance = v_profil.titre_sejour_fin_validite
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

  -- 2. Notifications for medical visit (30 days before expiration)
  FOR v_profil IN
    SELECT id, date_fin_visite_medicale
    FROM profil
    WHERE date_fin_visite_medicale IS NOT NULL
      AND date_fin_visite_medicale > CURRENT_DATE
      AND date_fin_visite_medicale <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.date_fin_visite_medicale - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'visite_medicale', v_profil.id, v_profil.date_fin_visite_medicale, v_date_notif,
           jsonb_build_object('document', 'Visite médicale')
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'visite_medicale'
        AND date_echeance = v_profil.date_fin_visite_medicale
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

  -- 3. Notifications for driving license (30 days before expiration)
  FOR v_profil IN
    SELECT id, permis_conduire_expiration
    FROM profil
    WHERE permis_conduire_expiration IS NOT NULL
      AND permis_conduire_expiration > CURRENT_DATE
      AND permis_conduire_expiration <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.permis_conduire_expiration - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'permis_conduire', v_profil.id, v_profil.permis_conduire_expiration, v_date_notif,
           jsonb_build_object('document', 'Permis de conduire')
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'permis_conduire'
        AND date_echeance = v_profil.permis_conduire_expiration
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

  -- 4. Notifications for CDD contracts ending (15 days before end)
  FOR v_contrat IN
    SELECT id, profil_id, date_fin
    FROM contrat
    WHERE type = 'CDD'
      AND date_fin IS NOT NULL
      AND date_fin > CURRENT_DATE
      AND date_fin <= CURRENT_DATE + INTERVAL '15 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_contrat.date_fin - INTERVAL '15 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'contrat_cdd', v_contrat.profil_id, v_contrat.date_fin, v_date_notif,
           jsonb_build_object('document', 'Contrat CDD', 'contrat_id', v_contrat.id)
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_contrat.profil_id
        AND type = 'contrat_cdd'
        AND date_echeance = v_contrat.date_fin
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
