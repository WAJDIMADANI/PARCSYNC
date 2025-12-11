/*
  # Correction de la contrainte CHECK pour accepter le statut "actif"

  La fonction generate_daily_expired_incidents() cherche les contrats avec statut = 'actif'
  mais la contrainte CHECK ne l'acceptait pas.

  Cette correction ajoute 'actif' aux valeurs autorisées.
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_statut_check;

-- Ajouter la nouvelle contrainte avec 'actif' inclus
ALTER TABLE contrat ADD CONSTRAINT contrat_statut_check
  CHECK (statut IN ('envoye', 'en_attente_signature', 'signe', 'valide', 'actif'));

-- Vérification
SELECT
  'Contrainte mise à jour avec succès' as message,
  'Les statuts autorisés sont: envoye, en_attente_signature, signe, valide, actif' as details;
