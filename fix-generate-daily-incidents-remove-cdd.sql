/*
  # Correction: Suppression des incidents CDD de generate_daily_expired_incidents()

  ## Problème
  La fonction generate_daily_expired_incidents() créait des incidents de type 'contrat_cdd'
  pour TOUS les CDD expirés, SANS filtrer les salariés ayant un CDI actif.

  ## Solution
  - Supprimer complètement la section qui crée des incidents 'contrat_cdd'
  - Garder uniquement : titre_sejour, visite_medicale, permis_conduire
  - Les contrats expirés sont déjà gérés par generate_expired_contract_incidents()
    qui utilise la vue v_incidents_contrats_affichables (filtre correctement les CDI actifs)

  ## Changements
  1. Suppression de la variable v_count_contrat_cdd
  2. Suppression de la boucle qui crée les incidents contrat_cdd (lignes 196-249)
  3. Mise à jour du résultat JSON (sans contrat_cdd)
*/

CREATE OR REPLACE FUNCTION generate_daily_expired_incidents()
RETURNS jsonb AS $$
DECLARE
  v_profil RECORD;
  v_notification_id uuid;
  v_incident_id uuid;
  v_count_titre_sejour INTEGER := 0;
  v_count_visite_medicale INTEGER := 0;
  v_count_permis_conduire INTEGER := 0;
  v_result jsonb;
BEGIN
  -- 1. Create incidents for titres de sejour expiring TODAY
  FOR v_profil IN
    SELECT id, titre_sejour_fin_validite
    FROM profil
    WHERE titre_sejour_fin_validite = CURRENT_DATE
      AND statut = 'actif'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM incident
      WHERE profil_id = v_profil.id
        AND type = 'titre_sejour'
        AND date_expiration_originale = v_profil.titre_sejour_fin_validite
        AND statut IN ('actif', 'en_cours')
    ) THEN
      SELECT id INTO v_notification_id
      FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'titre_sejour'
        AND date_echeance = v_profil.titre_sejour_fin_validite
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

  -- NOTE: CDD contracts are now handled EXCLUSIVELY by generate_expired_contract_incidents()
  -- This function uses v_incidents_contrats_affichables which properly filters out:
  --   - Employees with active CDI contracts
  --   - Contracts that should not generate incidents
  -- This ensures CDI actifs are never shown as incidents

  -- Build result JSON (without contrat_cdd)
  v_result := jsonb_build_object(
    'titre_sejour', v_count_titre_sejour,
    'visite_medicale', v_count_visite_medicale,
    'permis_conduire', v_count_permis_conduire,
    'total', v_count_titre_sejour + v_count_visite_medicale + v_count_permis_conduire,
    'date_execution', now(),
    'note', 'CDD incidents are handled by generate_expired_contract_incidents()'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérification
SELECT generate_daily_expired_incidents();
