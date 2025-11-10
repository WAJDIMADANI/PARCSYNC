/*
  # Ajouter le statut 'en_attente_signature' à la contrainte

  1. Modifications
    - Ajoute 'en_attente_signature' aux statuts autorisés pour la table contrat
    - Les statuts valides deviennent : 'envoye', 'en_attente_signature', 'signe', 'valide'
  
  2. Notes
    - Ce statut est utilisé par la fonction create-yousign-signature après création de la demande
    - Il permet de différencier un contrat simplement envoyé d'un contrat en attente de signature Yousign
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_statut_check;

-- Recréer la contrainte avec le nouveau statut
ALTER TABLE contrat ADD CONSTRAINT contrat_statut_check 
  CHECK (statut IN ('envoye', 'en_attente_signature', 'signe', 'valide'));
