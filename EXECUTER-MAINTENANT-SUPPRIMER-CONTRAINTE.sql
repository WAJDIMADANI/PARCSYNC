-- ========================================
-- SUPPRIMER LA CONTRAINTE IMMÉDIATEMENT
-- ========================================

-- Supprimer la contrainte qui empêche plusieurs contrats
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS ux_contrat_one_base_per_group;

-- Vérification
SELECT 'Contrainte supprimée avec succès' as resultat;

-- Vérifier qu'elle n'existe plus
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SUCCÈS - Plus aucune contrainte bloquante'
    ELSE '⚠️ Il reste encore des contraintes'
  END as status
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND conname = 'ux_contrat_one_base_per_group';
