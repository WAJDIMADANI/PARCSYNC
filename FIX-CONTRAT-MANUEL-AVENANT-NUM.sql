/*
  # FIX : Contrainte avenant_num bloque contrats manuels
  
  Problème : La contrainte CHECK "contrat_avenant_num_chk" bloque l'insertion
  Solution : Permettre NULL pour avenant_num (contrats normaux)
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_avenant_num_chk;

-- Recréer la contrainte pour permettre NULL
-- avenant_num doit être > 0 si renseigné, mais peut être NULL
ALTER TABLE contrat ADD CONSTRAINT contrat_avenant_num_chk
  CHECK (avenant_num IS NULL OR avenant_num > 0);

-- Vérification
SELECT
  'Contrainte corrigée' as status,
  'avenant_num peut maintenant être NULL pour les contrats normaux' as details;
