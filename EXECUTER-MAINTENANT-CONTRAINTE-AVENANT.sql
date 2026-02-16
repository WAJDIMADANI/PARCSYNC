/*
  EXÉCUTER IMMÉDIATEMENT dans Supabase SQL Editor
  
  Fix : Contrainte avenant_num bloque contrats manuels
*/

-- ÉTAPE 1 : Voir la contrainte actuelle
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND conname = 'contrat_avenant_num_chk';

-- ÉTAPE 2 : Supprimer l'ancienne contrainte
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_avenant_num_chk;

-- ÉTAPE 3 : Recréer la contrainte pour permettre NULL
-- La contrainte vérifie que SI avenant_num est renseigné, il doit être > 0
-- Mais NULL est autorisé (pour les contrats normaux)
ALTER TABLE contrat ADD CONSTRAINT contrat_avenant_num_chk
  CHECK (avenant_num IS NULL OR avenant_num > 0);

-- ÉTAPE 4 : Vérification finale
SELECT 
  'Contrainte corrigée ✓' as status,
  'avenant_num peut maintenant être NULL' as details,
  pg_get_constraintdef(oid) as nouvelle_contrainte
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND conname = 'contrat_avenant_num_chk';
