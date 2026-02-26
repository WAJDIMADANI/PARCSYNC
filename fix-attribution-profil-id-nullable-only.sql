/*
  # Fix attribution_vehicule - Rendre colonnes nullable seulement

  La contrainte attribution_vehicule_profil_or_loueur_check existe déjà,
  donc on applique uniquement les modifications de colonnes.
*/

-- Rendre profil_id nullable
ALTER TABLE attribution_vehicule
  ALTER COLUMN profil_id DROP NOT NULL;

-- Rendre type_attribution nullable
ALTER TABLE attribution_vehicule
  ALTER COLUMN type_attribution DROP NOT NULL;

-- Mettre à jour la contrainte type_attribution
ALTER TABLE attribution_vehicule
  DROP CONSTRAINT IF EXISTS attribution_vehicule_type_attribution_check;

ALTER TABLE attribution_vehicule
  ADD CONSTRAINT attribution_vehicule_type_attribution_check
  CHECK (type_attribution IS NULL OR type_attribution IN ('principal', 'secondaire'));

-- Commentaires
COMMENT ON COLUMN attribution_vehicule.profil_id IS 'ID du profil salarié TCA. NULL si locataire externe.';
COMMENT ON COLUMN attribution_vehicule.type_attribution IS 'Type d''attribution (principal/secondaire). NULL si locataire externe.';
