/*
  # Trigger automatique pour notifications de contrats

  Ce trigger détecte automatiquement quand un contrat est signé (peu importe la source)
  et crée les notifications/incidents appropriés.

  1. Fonctionnement
     - Se déclenche quand un contrat passe au statut "signe"
     - Fonctionne pour TOUS les types de contrats :
       * Contrats Yousign
       * Contrats manuels uploadés
       * Contrats importés en masse
     - Crée automatiquement :
       * Une notification si le contrat expire dans plus de 30 jours
       * Un incident si le contrat expire dans moins de 30 jours ou est déjà expiré

  2. Logique de détection
     - Contrats CDD uniquement (type = 'CDD')
     - Calcul automatique : date_fin - 30 jours
     - Empêche les doublons (vérifie si notification/incident existe déjà)

  3. Sécurité
     - Idempotent : peut être exécuté plusieurs fois sans créer de doublons
     - Gère les cas limites (contrats sans date de fin, etc.)
*/

-- Fonction trigger qui sera appelée automatiquement
CREATE OR REPLACE FUNCTION auto_create_contract_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_date_alerte DATE;
  v_existing_notification_id UUID;
  v_existing_incident_id UUID;
BEGIN
  -- Ne traiter que les contrats CDD qui passent au statut "signe"
  IF NEW.statut = 'signe' AND NEW.type = 'CDD' AND NEW.date_fin IS NOT NULL THEN

    -- Calculer la date d'alerte (30 jours avant la fin du contrat)
    v_date_alerte := NEW.date_fin - INTERVAL '30 days';

    -- Vérifier si une notification existe déjà pour ce salarié et ce type
    SELECT id INTO v_existing_notification_id
    FROM notification
    WHERE salarie_id = NEW.salarie_id
      AND type = 'contrat_cdd'
      AND statut != 'resolue'
    LIMIT 1;

    -- Vérifier si un incident existe déjà pour ce salarié et ce type
    SELECT id INTO v_existing_incident_id
    FROM incident
    WHERE salarie_id = NEW.salarie_id
      AND type = 'contrat_cdd'
      AND statut != 'resolu'
    LIMIT 1;

    -- Si le contrat est déjà expiré ou expire dans moins de 30 jours
    IF NEW.date_fin <= CURRENT_DATE + INTERVAL '30 days' THEN

      -- Créer un INCIDENT si aucun n'existe déjà
      IF v_existing_incident_id IS NULL THEN
        INSERT INTO incident (
          salarie_id,
          type,
          description,
          date_echeance,
          statut,
          priorite
        ) VALUES (
          NEW.salarie_id,
          'contrat_cdd',
          'Le contrat CDD du salarié arrive à échéance le ' || TO_CHAR(NEW.date_fin, 'DD/MM/YYYY') || '.',
          NEW.date_fin,
          'en_attente',
          CASE
            WHEN NEW.date_fin < CURRENT_DATE THEN 'haute'
            WHEN NEW.date_fin <= CURRENT_DATE + INTERVAL '15 days' THEN 'haute'
            ELSE 'moyenne'
          END
        );

        RAISE NOTICE 'Incident créé automatiquement pour le contrat % (salarié %)', NEW.id, NEW.salarie_id;
      ELSE
        RAISE NOTICE 'Incident existant trouvé pour le salarié %, pas de doublon créé', NEW.salarie_id;
      END IF;

    ELSE

      -- Créer une NOTIFICATION si aucune n'existe déjà
      IF v_existing_notification_id IS NULL THEN
        INSERT INTO notification (
          salarie_id,
          type,
          message,
          date_echeance,
          statut
        ) VALUES (
          NEW.salarie_id,
          'contrat_cdd',
          'Le contrat CDD du salarié expire le ' || TO_CHAR(NEW.date_fin, 'DD/MM/YYYY') || '. Prévoir le renouvellement ou la fin de contrat.',
          NEW.date_fin,
          'en_attente'
        );

        RAISE NOTICE 'Notification créée automatiquement pour le contrat % (salarié %)', NEW.id, NEW.salarie_id;
      ELSE
        RAISE NOTICE 'Notification existante trouvée pour le salarié %, pas de doublon créé', NEW.salarie_id;
      END IF;

    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_auto_notification_contrat ON contrat;

-- Créer le trigger qui se déclenche APRÈS l'insertion ou la mise à jour d'un contrat
CREATE TRIGGER trigger_auto_notification_contrat
AFTER INSERT OR UPDATE OF statut ON contrat
FOR EACH ROW
EXECUTE FUNCTION auto_create_contract_notification();

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Trigger automatique activé avec succès!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Le système créera automatiquement :';
  RAISE NOTICE '- Une NOTIFICATION si le contrat expire dans > 30 jours';
  RAISE NOTICE '- Un INCIDENT si le contrat expire dans < 30 jours';
  RAISE NOTICE '';
  RAISE NOTICE 'Cela fonctionne pour :';
  RAISE NOTICE '✓ Contrats signés via Yousign';
  RAISE NOTICE '✓ Contrats uploadés manuellement';
  RAISE NOTICE '✓ Contrats importés en masse';
  RAISE NOTICE '';
  RAISE NOTICE 'Testez maintenant en créant un contrat manuel!';
END $$;
