/*
  # Ajout du type de pièce d'identité et date de fin de validité

  1. Modifications
    - Ajoute la colonne `type_piece_identite` à la table `candidat`
      - Valeurs possibles: 'carte_identite', 'passeport', 'carte_sejour'
      - Par défaut: 'carte_identite'
    - Ajoute la colonne `date_fin_validite_piece` à la table `candidat`
      - Date de fin de validité de la pièce d'identité
      - Obligatoire pour les cartes de séjour
      - Optionnelle pour les autres types

  2. Notes
    - Pas de modification des colonnes existantes (carte_identite_recto_url, carte_identite_verso_url)
    - Compatible avec tous les formulaires existants
*/

-- Ajouter le type de pièce d'identité
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'type_piece_identite'
  ) THEN
    ALTER TABLE candidat ADD COLUMN type_piece_identite text DEFAULT 'carte_identite';
  END IF;
END $$;

-- Ajouter la date de fin de validité de la pièce
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'date_fin_validite_piece'
  ) THEN
    ALTER TABLE candidat ADD COLUMN date_fin_validite_piece date;
  END IF;
END $$;
