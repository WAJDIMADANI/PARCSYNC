-- ============================================================================
-- Migration: Ajout colonne fournisseur carte essence
-- Description: Ajoute la colonne carte_essence_fournisseur à la table vehicule
-- ============================================================================

-- Ajouter la colonne fournisseur pour la carte essence
ALTER TABLE vehicule
ADD COLUMN IF NOT EXISTS carte_essence_fournisseur text;

-- Vérification
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'vehicule'
  AND column_name IN ('carte_essence_fournisseur', 'carte_essence_numero', 'assurance_type', 'assurance_compagnie', 'assurance_numero_contrat')
ORDER BY column_name;
