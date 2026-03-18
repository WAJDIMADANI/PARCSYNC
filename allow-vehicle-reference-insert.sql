/*
  # Autoriser l'insertion dans les tables de références véhicules

  1. Modifications
    - Ajouter policy INSERT pour vehicle_reference_brands (utilisateurs authentifiés)
    - Ajouter policy INSERT pour vehicle_reference_models (utilisateurs authentifiés)

  2. Sécurité
    - Seuls les utilisateurs authentifiés peuvent insérer
    - Les policies SELECT existantes restent inchangées
*/

-- Policy INSERT pour vehicle_reference_brands
DROP POLICY IF EXISTS "Authenticated users can insert vehicle brands" ON vehicle_reference_brands;
CREATE POLICY "Authenticated users can insert vehicle brands"
  ON vehicle_reference_brands
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy INSERT pour vehicle_reference_models
DROP POLICY IF EXISTS "Authenticated users can insert vehicle models" ON vehicle_reference_models;
CREATE POLICY "Authenticated users can insert vehicle models"
  ON vehicle_reference_models
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
