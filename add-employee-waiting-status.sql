/*
  # Add employee waiting status for contract signature

  1. Changes
    - Update profil.statut to accept 'en_attente_contrat' value
    - This allows automatic conversion from candidat to employee after onboarding
    
  2. Status values
    - 'actif': Active employee
    - 'inactif': Inactive employee
    - 'en_attente_contrat': Waiting for contract signature (new)
    
  3. Notes
    - When a candidate completes onboarding with all documents, they automatically become an employee with status 'en_attente_contrat'
    - HR can then send the contract for electronic signature
*/

-- No schema change needed, just documentation of the new status value
-- The profil.statut field is already text type and can accept any value
-- We'll use 'en_attente_contrat' as a new valid status

-- Add comment for clarity
COMMENT ON COLUMN profil.statut IS 'Employee status: actif, inactif, en_attente_contrat';
