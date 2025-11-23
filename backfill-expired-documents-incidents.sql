/*
  # Backfill Existing Expired Documents as Incidents

  This script creates incidents for all documents that are already expired in the database.
  It should be run ONCE after creating the incidents system.

  Process:
  1. Scans all active employees (profil.statut = 'actif')
  2. Checks for expired documents:
     - titre_sejour_fin_validite < CURRENT_DATE
     - date_fin_visite_medicale < CURRENT_DATE
     - permis_conduire_expiration < CURRENT_DATE
  3. Checks for expired CDD contracts (contrat.type = 'CDD' AND date_fin < CURRENT_DATE)
  4. Creates incidents with statut = 'actif' for each expired document
  5. Marks metadata with 'backfill' = true to distinguish from normal incidents

  Usage:
    SELECT backfill_existing_expired_documents();

  Returns:
    JSON object with counts of incidents created by type
*/

CREATE OR REPLACE FUNCTION backfill_existing_expired_documents()
RETURNS jsonb AS $$
DECLARE
  v_profil RECORD;
  v_contrat RECORD;
  v_count_titre_sejour INTEGER := 0;
  v_count_visite_medicale INTEGER := 0;
  v_count_permis_conduire INTEGER := 0;
  v_count_contrat_cdd INTEGER := 0;
  v_result jsonb;
BEGIN
  -- 1. Create incidents for expired titres de sejour
  FOR v_profil IN
    SELECT id, titre_sejour_fin_validite
    FROM profil
    WHERE titre_sejour_fin_validite IS NOT NULL
      AND titre_sejour_fin_validite < CURRENT_DATE
      AND statut = 'actif'
  LOOP
    -- Check if incident already exists for this document
    IF NOT EXISTS (
      SELECT 1 FROM incident
      WHERE profil_id = v_profil.id
        AND type = 'titre_sejour'
        AND date_expiration_originale = v_profil.titre_sejour_fin_validite
        AND statut IN ('actif', 'en_cours')
    ) THEN
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
          'backfill', true,
          'document', 'Titre de séjour',
          'jours_depuis_expiration', CURRENT_DATE - v_profil.titre_sejour_fin_validite
        )
      );
      v_count_titre_sejour := v_count_titre_sejour + 1;
    END IF;
  END LOOP;

  -- 2. Create incidents for expired visites medicales
  FOR v_profil IN
    SELECT id, date_fin_visite_medicale
    FROM profil
    WHERE date_fin_visite_medicale IS NOT NULL
      AND date_fin_visite_medicale < CURRENT_DATE
      AND statut = 'actif'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM incident
      WHERE profil_id = v_profil.id
        AND type = 'visite_medicale'
        AND date_expiration_originale = v_profil.date_fin_visite_medicale
        AND statut IN ('actif', 'en_cours')
    ) THEN
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
          'backfill', true,
          'document', 'Visite médicale',
          'jours_depuis_expiration', CURRENT_DATE - v_profil.date_fin_visite_medicale
        )
      );
      v_count_visite_medicale := v_count_visite_medicale + 1;
    END IF;
  END LOOP;

  -- 3. Create incidents for expired permis de conduire
  FOR v_profil IN
    SELECT id, permis_conduire_expiration
    FROM profil
    WHERE permis_conduire_expiration IS NOT NULL
      AND permis_conduire_expiration < CURRENT_DATE
      AND statut = 'actif'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM incident
      WHERE profil_id = v_profil.id
        AND type = 'permis_conduire'
        AND date_expiration_originale = v_profil.permis_conduire_expiration
        AND statut IN ('actif', 'en_cours')
    ) THEN
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
          'backfill', true,
          'document', 'Permis de conduire',
          'jours_depuis_expiration', CURRENT_DATE - v_profil.permis_conduire_expiration
        )
      );
      v_count_permis_conduire := v_count_permis_conduire + 1;
    END IF;
  END LOOP;

  -- 4. Create incidents for expired CDD contracts
  FOR v_contrat IN
    SELECT c.id, c.profil_id, c.date_fin
    FROM contrat c
    WHERE c.type = 'CDD'
      AND c.date_fin IS NOT NULL
      AND c.date_fin < CURRENT_DATE
      AND c.statut = 'actif'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM incident
      WHERE profil_id = v_contrat.profil_id
        AND type = 'contrat_cdd'
        AND date_expiration_originale = v_contrat.date_fin
        AND statut IN ('actif', 'en_cours')
    ) THEN
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
          'backfill', true,
          'document', 'Contrat CDD',
          'contrat_id', v_contrat.id,
          'jours_depuis_expiration', CURRENT_DATE - v_contrat.date_fin
        )
      );
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
    'date_backfill', CURRENT_DATE
  );

  RAISE NOTICE 'Backfill completed: %', v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
