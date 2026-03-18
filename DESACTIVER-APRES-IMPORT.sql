/*
  # Désactiver les policies d'import ANON après l'import

  1. Modifications
    - Supprimer policy INSERT ANON pour vehicle_reference_brands
    - Supprimer policy INSERT ANON pour vehicle_reference_models

  2. Sécurité
    - À exécuter IMMÉDIATEMENT après l'import réussi
    - Restaure la sécurité normale des tables

  3. Note
    - Les policies SELECT restent actives pour la lecture publique
    - Seules les insertions ANON sont désactivées
*/

-- Supprimer policy INSERT ANON pour vehicle_reference_brands
DROP POLICY IF EXISTS "Allow anon insert vehicle brands for import" ON vehicle_reference_brands;

-- Supprimer policy INSERT ANON pour vehicle_reference_models
DROP POLICY IF EXISTS "Allow anon insert vehicle models for import" ON vehicle_reference_models;

-- Vérification
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('vehicle_reference_brands', 'vehicle_reference_models')
ORDER BY tablename, policyname;
