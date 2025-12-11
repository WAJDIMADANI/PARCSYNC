/*
  # Extension des types de notifications et incidents pour avenants

  1. Modifications
    - Supprime les anciennes contraintes CHECK sur les tables notification et incident
    - Recrée les contraintes pour inclure les types 'avenant_1' et 'avenant_2'

  2. Types supportés après migration
    - notification: titre_sejour, visite_medicale, permis_conduire, contrat_cdd, avenant_1, avenant_2
    - incident: titre_sejour, visite_medicale, permis_conduire, contrat_cdd, avenant_1, avenant_2

  3. Sécurité
    - Opération idempotente: peut être exécutée plusieurs fois sans erreur
    - Les données existantes sont conservées
*/

-- Supprimer l'ancienne contrainte CHECK sur la table notification
ALTER TABLE notification
DROP CONSTRAINT IF EXISTS notification_type_check;

-- Recréer la contrainte avec les nouveaux types incluant avenant_1 et avenant_2
ALTER TABLE notification
ADD CONSTRAINT notification_type_check
CHECK (type IN ('titre_sejour', 'visite_medicale', 'permis_conduire', 'contrat_cdd', 'avenant_1', 'avenant_2'));

-- Supprimer l'ancienne contrainte CHECK sur la table incident
ALTER TABLE incident
DROP CONSTRAINT IF EXISTS incident_type_check;

-- Recréer la contrainte avec les nouveaux types incluant avenant_1 et avenant_2
ALTER TABLE incident
ADD CONSTRAINT incident_type_check
CHECK (type IN ('titre_sejour', 'visite_medicale', 'permis_conduire', 'contrat_cdd', 'avenant_1', 'avenant_2'));

-- Vérification: Compter les notifications et incidents existants par type
DO $$
DECLARE
  notif_count INTEGER;
  incident_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO notif_count FROM notification;
  SELECT COUNT(*) INTO incident_count FROM incident;

  RAISE NOTICE 'Migration terminée avec succès!';
  RAISE NOTICE 'Notifications existantes: %', notif_count;
  RAISE NOTICE 'Incidents existants: %', incident_count;
  RAISE NOTICE 'Les types avenant_1 et avenant_2 sont maintenant acceptés.';
END $$;
