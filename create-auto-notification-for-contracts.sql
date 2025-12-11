/*
  # Fonction de génération automatique de notifications/incidents pour contrats

  1. Vue d'ensemble
    - Crée automatiquement une notification ou un incident après signature Yousign
    - Support pour: CDD, Avenant 1, Avenant 2
    - Gestion intelligente des dates multiples pour les avenants

  2. Logique de fusion des dates pour avenants
    - Consulte DEUX sources: contract.variables.date_fin ET profil.avenant_X_date_fin
    - Utilise GREATEST() pour prendre la date la plus récente
    - Fonctionne même si une seule source est renseignée

  3. Règles de création
    - Si date_fin > aujourd'hui + 30 jours: notification à J-30
    - Si aujourd'hui < date_fin <= aujourd'hui + 30 jours: notification immédiate
    - Si date_fin <= aujourd'hui: incident immédiat

  4. Anti-doublons
    - Vérifie qu'aucune notification/incident n'existe déjà pour ce profil et ce type
*/

-- Fonction principale de création
CREATE OR REPLACE FUNCTION create_notification_or_incident_for_contract(p_contract_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profil_id UUID;
  v_modele_type_contrat TEXT;
  v_variables_type_contrat TEXT;
  v_variables_date_fin DATE;
  v_profil_avenant_1_date_fin DATE;
  v_profil_avenant_2_date_fin DATE;
  v_notification_type TEXT;
  v_date_fin DATE;
  v_date_notification DATE;
  v_days_until_expiry INTEGER;
  v_existing_count INTEGER;
  v_created_id UUID;
  v_created_type TEXT;
  v_source_date TEXT;
  v_result JSON;
BEGIN
  -- Étape 1: Récupérer toutes les informations du contrat avec ses relations
  SELECT
    c.profil_id,
    m.type_contrat,
    (c.variables->>'type_contrat')::TEXT,
    (c.variables->>'date_fin')::DATE,
    p.avenant_1_date_fin,
    p.avenant_2_date_fin
  INTO
    v_profil_id,
    v_modele_type_contrat,
    v_variables_type_contrat,
    v_variables_date_fin,
    v_profil_avenant_1_date_fin,
    v_profil_avenant_2_date_fin
  FROM contrat c
  JOIN modele_contrat m ON c.modele_id = m.id
  JOIN profil p ON c.profil_id = p.id
  WHERE c.id = p_contract_id;

  -- Vérifier que le contrat existe
  IF v_profil_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Contrat non trouvé',
      'contract_id', p_contract_id
    );
  END IF;

  -- Étape 2: Déterminer le type de notification et la date_fin à utiliser
  IF v_modele_type_contrat = 'CDD' THEN
    -- Pour les CDD: utiliser uniquement variables.date_fin
    v_notification_type := 'contrat_cdd';
    v_date_fin := v_variables_date_fin;
    v_source_date := 'contract_variables';

  ELSIF v_modele_type_contrat = 'Avenant' AND v_variables_type_contrat = 'Avenant 1' THEN
    -- Pour Avenant 1: fusionner les deux sources et prendre la plus récente
    v_notification_type := 'avenant_1';

    IF v_variables_date_fin IS NOT NULL AND v_profil_avenant_1_date_fin IS NOT NULL THEN
      -- Les deux sources existent: prendre la plus récente
      v_date_fin := GREATEST(v_variables_date_fin, v_profil_avenant_1_date_fin);
      v_source_date := 'both_merged';
    ELSIF v_variables_date_fin IS NOT NULL THEN
      -- Seulement dans variables
      v_date_fin := v_variables_date_fin;
      v_source_date := 'contract_variables';
    ELSIF v_profil_avenant_1_date_fin IS NOT NULL THEN
      -- Seulement dans profil
      v_date_fin := v_profil_avenant_1_date_fin;
      v_source_date := 'profil';
    ELSE
      -- Aucune date trouvée
      v_date_fin := NULL;
      v_source_date := 'none';
    END IF;

  ELSIF v_modele_type_contrat = 'Avenant' AND v_variables_type_contrat = 'Avenant 2' THEN
    -- Pour Avenant 2: fusionner les deux sources et prendre la plus récente
    v_notification_type := 'avenant_2';

    IF v_variables_date_fin IS NOT NULL AND v_profil_avenant_2_date_fin IS NOT NULL THEN
      -- Les deux sources existent: prendre la plus récente
      v_date_fin := GREATEST(v_variables_date_fin, v_profil_avenant_2_date_fin);
      v_source_date := 'both_merged';
    ELSIF v_variables_date_fin IS NOT NULL THEN
      -- Seulement dans variables
      v_date_fin := v_variables_date_fin;
      v_source_date := 'contract_variables';
    ELSIF v_profil_avenant_2_date_fin IS NOT NULL THEN
      -- Seulement dans profil
      v_date_fin := v_profil_avenant_2_date_fin;
      v_source_date := 'profil';
    ELSE
      -- Aucune date trouvée
      v_date_fin := NULL;
      v_source_date := 'none';
    END IF;

  ELSE
    -- Type de contrat non supporté
    RETURN json_build_object(
      'success', false,
      'error', 'Type de contrat non supporté pour notifications automatiques',
      'modele_type', v_modele_type_contrat,
      'variables_type', v_variables_type_contrat
    );
  END IF;

  -- Étape 3: Valider la date_fin
  IF v_date_fin IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Aucune date_fin trouvée dans les sources disponibles',
      'notification_type', v_notification_type,
      'source_date', v_source_date
    );
  END IF;

  -- Étape 4: Vérifier les doublons
  SELECT COUNT(*) INTO v_existing_count
  FROM notification
  WHERE profil_id = v_profil_id AND type = v_notification_type;

  IF v_existing_count = 0 THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM incident
    WHERE profil_id = v_profil_id AND type = v_notification_type;
  END IF;

  IF v_existing_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Une notification ou incident existe déjà pour ce profil et ce type',
      'notification_type', v_notification_type,
      'profil_id', v_profil_id
    );
  END IF;

  -- Étape 5: Calculer le nombre de jours jusqu'à expiration
  v_days_until_expiry := v_date_fin - CURRENT_DATE;

  -- Étape 6: Créer notification ou incident selon les règles
  IF v_days_until_expiry > 30 THEN
    -- Cas 1: Contrat se termine dans plus de 30 jours -> notification à J-30
    v_date_notification := v_date_fin - INTERVAL '30 days';

    INSERT INTO notification (profil_id, type, date_notification, statut, metadata)
    VALUES (
      v_profil_id,
      v_notification_type,
      v_date_notification,
      'active',
      json_build_object(
        'origine', 'webhook_yousign',
        'contract_id', p_contract_id,
        'date_creation', CURRENT_TIMESTAMP,
        'date_fin', v_date_fin,
        'source_date', v_source_date,
        'date_fin_variables', v_variables_date_fin,
        'date_fin_profil', CASE
          WHEN v_notification_type = 'avenant_1' THEN v_profil_avenant_1_date_fin
          WHEN v_notification_type = 'avenant_2' THEN v_profil_avenant_2_date_fin
          ELSE NULL
        END
      )
    )
    RETURNING id INTO v_created_id;

    v_created_type := 'notification';

  ELSIF v_days_until_expiry > 0 THEN
    -- Cas 2: Contrat se termine dans 1 à 30 jours -> notification immédiate
    INSERT INTO notification (profil_id, type, date_notification, statut, metadata)
    VALUES (
      v_profil_id,
      v_notification_type,
      CURRENT_DATE,
      'active',
      json_build_object(
        'origine', 'webhook_yousign',
        'contract_id', p_contract_id,
        'date_creation', CURRENT_TIMESTAMP,
        'date_fin', v_date_fin,
        'source_date', v_source_date,
        'urgent', true,
        'date_fin_variables', v_variables_date_fin,
        'date_fin_profil', CASE
          WHEN v_notification_type = 'avenant_1' THEN v_profil_avenant_1_date_fin
          WHEN v_notification_type = 'avenant_2' THEN v_profil_avenant_2_date_fin
          ELSE NULL
        END
      )
    )
    RETURNING id INTO v_created_id;

    v_created_type := 'notification';

  ELSE
    -- Cas 3: Contrat déjà expiré -> incident immédiat
    INSERT INTO incident (profil_id, type, statut, metadata)
    VALUES (
      v_profil_id,
      v_notification_type,
      'actif',
      json_build_object(
        'origine', 'webhook_yousign',
        'contract_id', p_contract_id,
        'date_creation', CURRENT_TIMESTAMP,
        'date_fin', v_date_fin,
        'source_date', v_source_date,
        'jours_depuis_expiration', ABS(v_days_until_expiry),
        'date_fin_variables', v_variables_date_fin,
        'date_fin_profil', CASE
          WHEN v_notification_type = 'avenant_1' THEN v_profil_avenant_1_date_fin
          WHEN v_notification_type = 'avenant_2' THEN v_profil_avenant_2_date_fin
          ELSE NULL
        END
      )
    )
    RETURNING id INTO v_created_id;

    v_created_type := 'incident';
  END IF;

  -- Étape 7: Retourner le résultat
  v_result := json_build_object(
    'success', true,
    'type_created', v_created_type,
    'notification_type', v_notification_type,
    'id', v_created_id,
    'profil_id', v_profil_id,
    'date_fin_utilisee', v_date_fin,
    'source_date', v_source_date,
    'days_until_expiry', v_days_until_expiry,
    'message', CASE
      WHEN v_created_type = 'notification' THEN
        format('Notification %s créée pour le %s', v_notification_type, v_date_notification::TEXT)
      ELSE
        format('Incident %s créé (expiré depuis %s jours)', v_notification_type, ABS(v_days_until_expiry))
    END
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erreur lors de la création',
      'error_detail', SQLERRM,
      'contract_id', p_contract_id
    );
END;
$$;

-- Grant d'exécution pour authenticated users
GRANT EXECUTE ON FUNCTION create_notification_or_incident_for_contract TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification_or_incident_for_contract TO service_role;

-- Commentaire sur la fonction
COMMENT ON FUNCTION create_notification_or_incident_for_contract IS
'Crée automatiquement une notification ou un incident après signature d''un contrat CDD ou avenant via Yousign.
Gère intelligemment les dates multiples pour les avenants en consultant contract.variables ET profil.avenant_X_date_fin.';

-- Exemples d'utilisation
/*
-- Exemple 1: CDD se terminant dans 60 jours (créera une notification à J-30)
SELECT create_notification_or_incident_for_contract('uuid-du-contrat-cdd');

-- Exemple 2: Avenant 1 avec date dans les deux sources (prendra la plus récente)
SELECT create_notification_or_incident_for_contract('uuid-du-contrat-avenant-1');

-- Exemple 3: Avenant 2 expiré (créera un incident)
SELECT create_notification_or_incident_for_contract('uuid-du-contrat-avenant-2');

-- Requête de vérification des notifications créées avec leur source
SELECT
  n.id,
  n.type,
  n.date_notification,
  n.statut,
  n.metadata->>'source_date' as source_date,
  n.metadata->>'date_fin' as date_fin,
  n.metadata->>'date_fin_variables' as date_variables,
  n.metadata->>'date_fin_profil' as date_profil
FROM notification n
WHERE n.metadata->>'origine' = 'webhook_yousign'
ORDER BY n.created_at DESC;

-- Requête de vérification des incidents créés
SELECT
  i.id,
  i.type,
  i.statut,
  i.metadata->>'source_date' as source_date,
  i.metadata->>'date_fin' as date_fin,
  i.metadata->>'jours_depuis_expiration' as jours_expiré
FROM incident i
WHERE i.metadata->>'origine' = 'webhook_yousign'
ORDER BY i.created_at DESC;
*/
