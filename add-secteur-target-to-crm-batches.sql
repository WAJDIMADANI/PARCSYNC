/*
  # Ajout du ciblage par secteur pour les emails CRM

  1. Modifications
    - Ajout de la colonne `target_secteur_ids` dans `crm_email_batches`
      - Type jsonb pour stocker un array de UUID de secteurs
      - NULL si non applicable (mode all ou selected)

  2. Notes
    - Cette colonne sert uniquement pour le mode 'sector'
    - Permet de tracer quels secteurs ont été ciblés dans l'historique
*/

-- Ajouter la colonne target_secteur_ids
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_email_batches'
    AND column_name = 'target_secteur_ids'
  ) THEN
    ALTER TABLE crm_email_batches
    ADD COLUMN target_secteur_ids jsonb DEFAULT NULL;
  END IF;
END $$;
