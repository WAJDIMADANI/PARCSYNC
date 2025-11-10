/*
  # Ajouter le lien candidat dans profil

  1. Modifications
    - Ajoute la colonne `candidat_id` dans la table `profil` pour garder le lien avec le candidat d'origine
    - Permet de retrouver les documents (CV, lettre de motivation) du candidat

  2. Notes
    - Cette colonne est nullable car certains profils peuvent être créés directement sans passer par candidat
    - Le lien permet de récupérer l'historique complet du candidat devenu salarié
*/

-- Ajouter la colonne candidat_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'candidat_id'
  ) THEN
    ALTER TABLE profil ADD COLUMN candidat_id uuid REFERENCES candidat(id);
  END IF;
END $$;
