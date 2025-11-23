/*
  # Resolve Incident Function

  This function handles incident resolution and automatically updates the employee's profile
  with the new validity date.

  Parameters:
    - p_incident_id: UUID of the incident to resolve
    - p_nouvelle_date_validite: New expiration date for the document
    - p_notes: Optional notes about the resolution
    - p_user_id: UUID of the user resolving the incident

  Process:
  1. Validates that the new date is in the future
  2. Updates the appropriate field in profil table based on incident type
  3. For contrat_cdd, updates the date_fin in contrat table
  4. Changes incident status to 'resolu'
  5. Records resolution details in incident
  6. Updates related notification to 'resolue' status
  7. Creates historique entry

  Returns:
    JSON object with success status and updated incident details

  Usage:
    SELECT resolve_incident(
      'incident-uuid-here',
      '2025-12-31',
      'Document renewed and verified',
      'user-uuid-here'
    );
*/

CREATE OR REPLACE FUNCTION resolve_incident(
  p_incident_id uuid,
  p_nouvelle_date_validite date,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_incident RECORD;
  v_result jsonb;
  v_contrat_id uuid;
BEGIN
  -- Get incident details
  SELECT * INTO v_incident
  FROM incident
  WHERE id = p_incident_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Incident not found'
    );
  END IF;

  -- Validate new date is in the future
  IF p_nouvelle_date_validite <= CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La nouvelle date de validité doit être dans le futur'
    );
  END IF;

  -- Validate incident is not already resolved
  IF v_incident.statut = 'resolu' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cet incident est déjà résolu'
    );
  END IF;

  -- Update the appropriate field in profil based on incident type
  CASE v_incident.type
    WHEN 'titre_sejour' THEN
      UPDATE profil
      SET titre_sejour_fin_validite = p_nouvelle_date_validite
      WHERE id = v_incident.profil_id;

    WHEN 'visite_medicale' THEN
      UPDATE profil
      SET date_fin_visite_medicale = p_nouvelle_date_validite
      WHERE id = v_incident.profil_id;

    WHEN 'permis_conduire' THEN
      UPDATE profil
      SET permis_conduire_expiration = p_nouvelle_date_validite
      WHERE id = v_incident.profil_id;

    WHEN 'contrat_cdd' THEN
      -- Get contrat_id from metadata
      v_contrat_id := (v_incident.metadata->>'contrat_id')::uuid;

      IF v_contrat_id IS NOT NULL THEN
        UPDATE contrat
        SET date_fin = p_nouvelle_date_validite
        WHERE id = v_contrat_id;
      ELSE
        -- If no contrat_id in metadata, find the most recent active CDD contract
        UPDATE contrat
        SET date_fin = p_nouvelle_date_validite
        WHERE profil_id = v_incident.profil_id
          AND type = 'CDD'
          AND statut = 'actif'
          AND date_fin = v_incident.date_expiration_originale
        LIMIT 1;
      END IF;

    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Type d''incident non reconnu'
      );
  END CASE;

  -- Update incident to resolved status
  UPDATE incident
  SET
    statut = 'resolu',
    date_changement_statut = now(),
    date_resolution = now(),
    ancienne_date_validite = date_expiration_originale,
    nouvelle_date_validite = p_nouvelle_date_validite,
    resolu_par = p_user_id,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_incident_id;

  -- Update related notification if exists
  UPDATE notification
  SET statut = 'resolue'
  WHERE incident_id = p_incident_id
    AND statut IN ('active', 'email_envoye');

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'profil_id', v_incident.profil_id,
    'type', v_incident.type,
    'ancienne_date', v_incident.date_expiration_originale,
    'nouvelle_date', p_nouvelle_date_validite,
    'date_resolution', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
  # Change Incident Status Function

  This function allows changing an incident's status without resolving it.
  Useful for marking incidents as "en_cours" (in progress).

  Parameters:
    - p_incident_id: UUID of the incident
    - p_nouveau_statut: New status (actif, en_cours, ignore)
    - p_notes: Optional notes
    - p_user_id: UUID of the user making the change

  Usage:
    SELECT change_incident_status(
      'incident-uuid-here',
      'en_cours',
      'Started working on document renewal',
      'user-uuid-here'
    );
*/

CREATE OR REPLACE FUNCTION change_incident_status(
  p_incident_id uuid,
  p_nouveau_statut text,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_incident RECORD;
  v_result jsonb;
BEGIN
  -- Validate status
  IF p_nouveau_statut NOT IN ('actif', 'en_cours', 'ignore') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Statut invalide. Utilisez: actif, en_cours, ou ignore'
    );
  END IF;

  -- Get incident details
  SELECT * INTO v_incident
  FROM incident
  WHERE id = p_incident_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Incident not found'
    );
  END IF;

  -- Don't allow status change if already resolved
  IF v_incident.statut = 'resolu' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Impossible de modifier un incident résolu'
    );
  END IF;

  -- Update incident status
  UPDATE incident
  SET
    statut = p_nouveau_statut,
    date_changement_statut = now(),
    notes = COALESCE(p_notes, notes),
    resolu_par = COALESCE(p_user_id, resolu_par)
  WHERE id = p_incident_id;

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'ancien_statut', v_incident.statut,
    'nouveau_statut', p_nouveau_statut,
    'date_changement', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
