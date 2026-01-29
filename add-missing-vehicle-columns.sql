/*
  # Ajouter les colonnes manquantes à la table vehicule

  Colonnes à ajouter :
  - carte_essence_fournisseur (text) - Fournisseur de la carte essence (Total, Shell, etc.)

  Note: Toutes les autres colonnes sont déjà dans add-vehicle-extended-fields.sql
*/

-- Ajouter la colonne carte_essence_fournisseur si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicule' AND column_name = 'carte_essence_fournisseur'
  ) THEN
    ALTER TABLE vehicule ADD COLUMN carte_essence_fournisseur text;
  END IF;
END $$;

-- Vérifier que toutes les colonnes requises existent
DO $$
DECLARE
  missing_columns text[] := ARRAY[]::text[];
BEGIN
  -- Liste des colonnes requises
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'reference_tca') THEN
    missing_columns := array_append(missing_columns, 'reference_tca');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'immat_norm') THEN
    missing_columns := array_append(missing_columns, 'immat_norm');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_premiere_mise_en_circulation') THEN
    missing_columns := array_append(missing_columns, 'date_premiere_mise_en_circulation');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'assurance_type') THEN
    missing_columns := array_append(missing_columns, 'assurance_type');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'assurance_compagnie') THEN
    missing_columns := array_append(missing_columns, 'assurance_compagnie');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'assurance_numero_contrat') THEN
    missing_columns := array_append(missing_columns, 'assurance_numero_contrat');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'licence_transport_numero') THEN
    missing_columns := array_append(missing_columns, 'licence_transport_numero');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'materiel_embarque') THEN
    missing_columns := array_append(missing_columns, 'materiel_embarque');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'carte_essence_numero') THEN
    missing_columns := array_append(missing_columns, 'carte_essence_numero');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'carte_essence_attribuee') THEN
    missing_columns := array_append(missing_columns, 'carte_essence_attribuee');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'kilometrage_actuel') THEN
    missing_columns := array_append(missing_columns, 'kilometrage_actuel');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'derniere_maj_kilometrage') THEN
    missing_columns := array_append(missing_columns, 'derniere_maj_kilometrage');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'photo_path') THEN
    missing_columns := array_append(missing_columns, 'photo_path');
  END IF;

  -- Afficher les colonnes manquantes
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE 'Colonnes manquantes détectées: %', array_to_string(missing_columns, ', ');
    RAISE NOTICE 'Veuillez exécuter add-vehicle-extended-fields.sql d''abord !';
  ELSE
    RAISE NOTICE 'Toutes les colonnes requises existent déjà. Parfait !';
  END IF;
END $$;
