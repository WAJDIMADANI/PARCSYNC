/*
  # Standardisation de la table document

  1. Renommer les colonnes
    - owner_id → proprietaire_id
    - owner_type → proprietaire_type
    - Garde: type, fichier_url, date_emission, date_expiration, statut, created_at

  2. Sécurité
    - Met à jour les policies RLS
*/

-- Renommer les colonnes
ALTER TABLE document RENAME COLUMN owner_id TO proprietaire_id;
ALTER TABLE document RENAME COLUMN owner_type TO proprietaire_type;

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can read own documents" ON document;
DROP POLICY IF EXISTS "Users can insert own documents" ON document;
DROP POLICY IF EXISTS "Users can update own documents" ON document;
DROP POLICY IF EXISTS "Users can delete own documents" ON document;

-- Nouvelles policies
CREATE POLICY "Users can read documents"
  ON document FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can insert documents"
  ON document FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Users can update documents"
  ON document FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Users can delete documents"
  ON document FOR DELETE
  TO authenticated
  USING (TRUE);
