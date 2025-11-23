/*
  # Add columns for Excel import functionality

  1. New columns in profil table
    - `matricule_tca` (text) - Employee TCA registration number
    - `poste` (text) - Job position/title
    - `type_piece_identite` (text) - Type of identity document
    - `titre_sejour_fin_validite` (date) - Residence permit expiration date
    - `date_visite_medicale` (date) - Medical visit start date
    - `date_fin_visite_medicale` (date) - Medical visit end date
    - `periode_essai` (text) - Trial period end information
    - `modele_contrat` (text) - Contract template reference
    - `numero_securite_sociale` (text) - Social security number (duplicates nir for consistency)

  2. Notes
    - All columns are nullable to support flexible imports
    - Some fields may already exist from previous migrations
    - Uses IF NOT EXISTS to avoid errors on re-run
*/

-- Add missing columns to profil table for Excel import
DO $$
BEGIN
  -- Matricule TCA
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'matricule_tca'
  ) THEN
    ALTER TABLE profil ADD COLUMN matricule_tca text;
  END IF;

  -- Poste (Job position)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'poste'
  ) THEN
    ALTER TABLE profil ADD COLUMN poste text;
  END IF;

  -- Type de pièce d'identité
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'type_piece_identite'
  ) THEN
    ALTER TABLE profil ADD COLUMN type_piece_identite text;
  END IF;

  -- Titre de séjour - fin de validité
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'titre_sejour_fin_validite'
  ) THEN
    ALTER TABLE profil ADD COLUMN titre_sejour_fin_validite date;
  END IF;

  -- Date début visite médicale
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'date_visite_medicale'
  ) THEN
    ALTER TABLE profil ADD COLUMN date_visite_medicale date;
  END IF;

  -- Date fin visite médicale
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'date_fin_visite_medicale'
  ) THEN
    ALTER TABLE profil ADD COLUMN date_fin_visite_medicale date;
  END IF;

  -- Période d'essai
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'periode_essai'
  ) THEN
    ALTER TABLE profil ADD COLUMN periode_essai text;
  END IF;

  -- Modèle de contrat
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'modele_contrat'
  ) THEN
    ALTER TABLE profil ADD COLUMN modele_contrat text;
  END IF;

  -- Numéro de sécurité sociale (alias for nir)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'numero_securite_sociale'
  ) THEN
    ALTER TABLE profil ADD COLUMN numero_securite_sociale text;
  END IF;

  -- Nom de naissance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'nom_naissance'
  ) THEN
    ALTER TABLE profil ADD COLUMN nom_naissance text;
  END IF;

  -- Lieu de naissance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'lieu_naissance'
  ) THEN
    ALTER TABLE profil ADD COLUMN lieu_naissance text;
  END IF;

  -- Pays de naissance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'pays_naissance'
  ) THEN
    ALTER TABLE profil ADD COLUMN pays_naissance text;
  END IF;

  -- Complément d'adresse
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'complement_adresse'
  ) THEN
    ALTER TABLE profil ADD COLUMN complement_adresse text;
  END IF;

  -- Genre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'genre'
  ) THEN
    ALTER TABLE profil ADD COLUMN genre text;
  END IF;

  -- Nationalité
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'nationalite'
  ) THEN
    ALTER TABLE profil ADD COLUMN nationalite text;
  END IF;

  -- IBAN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'iban'
  ) THEN
    ALTER TABLE profil ADD COLUMN iban text;
  END IF;

  -- BIC
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'bic'
  ) THEN
    ALTER TABLE profil ADD COLUMN bic text;
  END IF;
END $$;
