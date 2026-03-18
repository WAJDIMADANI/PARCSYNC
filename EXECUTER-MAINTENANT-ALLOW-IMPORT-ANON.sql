/*
  # Autoriser l'import massif des références véhicules avec clé ANON

  1. Modifications
    - Ajouter policy INSERT pour vehicle_reference_brands (rôle anon)
    - Ajouter policy INSERT pour vehicle_reference_models (rôle anon)

  2. Sécurité
    - Activation temporaire pour l'import uniquement
    - À désactiver après l'import via DESACTIVER-APRES-IMPORT.sql

  3. Note
    - Ce script permet l'insertion avec la clé ANON (VITE_SUPABASE_ANON_KEY)
    - Nécessaire pour le script d'import Node.js
*/

-- Policy INSERT pour vehicle_reference_brands (ANON)
DROP POLICY IF EXISTS "Allow anon insert vehicle brands for import" ON vehicle_reference_brands;
CREATE POLICY "Allow anon insert vehicle brands for import"
  ON vehicle_reference_brands
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy INSERT pour vehicle_reference_models (ANON)
DROP POLICY IF EXISTS "Allow anon insert vehicle models for import" ON vehicle_reference_models;
CREATE POLICY "Allow anon insert vehicle models for import"
  ON vehicle_reference_models
  FOR INSERT
  TO anon
  WITH CHECK (true);
