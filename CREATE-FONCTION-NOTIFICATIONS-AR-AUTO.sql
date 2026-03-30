/*
  # Fonction de génération automatique des notifications A&R

  Cette fonction crée des notifications dans l'Inbox pour les absences
  qui se terminent aujourd'hui.

  RÈGLES:
  - Uniquement pour compta_ar_events.ar_type = 'ABSENCE'
  - Uniquement si end_date = CURRENT_DATE
  - Pas de doublons (vérifie si notification existe déjà)
  - Notification envoyée aux utilisateurs du pôle "Comptabilité/RH"

  CRON: Exécuter chaque jour à 6h00 AM
  SELECT cron.schedule('generate-ar-notifications', '0 6 * * *', 'SELECT generate_ar_fin_absence_notifications();');
*/

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

  -- Si pas de pôle trouvé, chercher par utilisateurs avec permission compta/ar
  IF v_pole_compta_id IS NULL THEN
    RAISE NOTICE 'Pôle Comptabilité non trouvé, envoi aux utilisateurs avec permission compta/ar';
  END IF;

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
      AND p.statut = 'actif'
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

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION generate_ar_fin_absence_notifications() TO authenticated;

-- Pour tester manuellement (ne crée que pour AUJOURD'HUI):
-- SELECT generate_ar_fin_absence_notifications();
