/*
  # Ajouter colonne date_validation à la table contrat

  1. Modifications
    - Ajoute la colonne `date_validation` de type timestamptz à la table `contrat`
    - Cette colonne stocke la date à laquelle le RH a validé le contrat et activé le salarié
    - La valeur est NULL tant que le contrat n'est pas validé
    - Quand le RH clique sur "Activer le salarié", cette date est enregistrée

  2. Notes
    - Cette date sera affichée comme "DATE D'ENTRÉE" dans l'onglet Contrats
    - Elle représente la date officielle d'entrée du salarié dans l'entreprise
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'date_validation'
  ) THEN
    ALTER TABLE contrat ADD COLUMN date_validation timestamptz;
  END IF;
END $$;
