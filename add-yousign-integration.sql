/*
  # Intégration Yousign pour la signature électronique

  1. Modifications
    - Ajout de colonnes Yousign à la table `contrat`
    - Ajout de nouveaux statuts pour les contrats

  2. Colonnes ajoutées
    - `yousign_signature_request_id` - ID de la demande de signature
    - `yousign_signer_id` - ID du signataire
    - `yousign_signed_at` - Date de signature
    - `yousign_document_url` - URL du document signé

  3. Nouveaux statuts
    - `en_attente_signature` - Envoyé à Yousign, en attente de signature
    - `signe` - Signé via Yousign
    - `refuse` - Signature refusée
    - `expire` - Demande de signature expirée
*/

-- Ajouter les colonnes Yousign
ALTER TABLE contrat
ADD COLUMN IF NOT EXISTS yousign_signature_request_id TEXT,
ADD COLUMN IF NOT EXISTS yousign_signer_id TEXT,
ADD COLUMN IF NOT EXISTS yousign_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS yousign_document_url TEXT;

-- Ajouter des commentaires pour documenter
COMMENT ON COLUMN contrat.yousign_signature_request_id IS 'ID de la demande de signature Yousign';
COMMENT ON COLUMN contrat.yousign_signer_id IS 'ID du signataire dans Yousign';
COMMENT ON COLUMN contrat.yousign_signed_at IS 'Date de signature via Yousign';
COMMENT ON COLUMN contrat.yousign_document_url IS 'URL du document signé dans Yousign';
