/*
  # Fix attribution_vehicule pour locataires externes

  1. Modifications de structure
    - Rendre profil_id NULLABLE (pour permettre locataires externes)
    - Rendre type_attribution NULLABLE (pour locataires externes)
    - Mettre à jour la contrainte CHECK pour accepter NULL

  2. Sécurité
    - Garder les RLS policies existantes
    - Ajouter une contrainte pour vérifier que soit profil_id soit loueur_id est renseigné
*/

-- Modifier profil_id pour accepter NULL
ALTER TABLE attribution_vehicule
  ALTER COLUMN profil_id DROP NOT NULL;

-- Modifier type_attribution pour accepter NULL
ALTER TABLE attribution_vehicule
  ALTER COLUMN type_attribution DROP NOT NULL;

-- Supprimer l'ancienne contrainte CHECK sur type_attribution
ALTER TABLE attribution_vehicule
  DROP CONSTRAINT IF EXISTS attribution_vehicule_type_attribution_check;

-- Ajouter une nouvelle contrainte qui accepte NULL ou les valeurs valides
ALTER TABLE attribution_vehicule
  ADD CONSTRAINT attribution_vehicule_type_attribution_check
  CHECK (type_attribution IS NULL OR type_attribution IN ('principal', 'secondaire'));

-- Ajouter une contrainte pour s'assurer qu'au moins profil_id OU loueur_id est renseigné
-- mais pas les deux en même temps pour un locataire externe
ALTER TABLE attribution_vehicule
  ADD CONSTRAINT attribution_vehicule_profil_or_loueur_check
  CHECK (
    (profil_id IS NOT NULL AND loueur_id IS NULL) OR  -- Salarié TCA sans loueur
    (profil_id IS NOT NULL AND loueur_id IS NOT NULL) OR  -- Salarié avec loueur externe
    (profil_id IS NULL AND loueur_id IS NOT NULL)  -- Locataire externe seul
  );

-- Commentaires pour documentation
COMMENT ON COLUMN attribution_vehicule.profil_id IS 'ID du profil salarié TCA. NULL si locataire externe.';
COMMENT ON COLUMN attribution_vehicule.type_attribution IS 'Type d''attribution (principal/secondaire). NULL si locataire externe.';
COMMENT ON CONSTRAINT attribution_vehicule_profil_or_loueur_check ON attribution_vehicule
  IS 'Soit profil_id est renseigné (salarié TCA), soit loueur_id seul (locataire externe)';
