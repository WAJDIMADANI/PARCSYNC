/*
  # Fix - Ajout des colonnes manquantes pour le module véhicules

  1. Colonnes ajoutées à la table vehicule
    - `fournisseur` - Fournisseur du véhicule
    - `mode_acquisition` - Mode d'acquisition (LLD, LOA, LCD, Achat pur, Prêt, Location société)
    - `prix_ht` - Prix HT
    - `prix_ttc` - Prix TTC
    - `mensualite` - Mensualité
    - `duree_contrat_mois` - Durée du contrat en mois
    - `date_debut_contrat` - Date de début du contrat
    - `date_fin_prevue_contrat` - Date de fin prévue du contrat
    - `date_premiere_mise_en_circulation` - Date de première mise en circulation
    - `date_mise_en_service` - Date de mise en service
    - `annee` - Année du véhicule

  2. Ajout de la colonne is_read à la table alerte
    - `is_read` - Statut de lecture de l'alerte

  3. Notes
    - Cette migration ajoute toutes les colonnes requises par le module véhicules
    - Toutes les colonnes sont optionnelles (nullable)
*/

-- Ajouter les colonnes d'acquisition à la table vehicule
DO $$
BEGIN
  -- fournisseur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'fournisseur') THEN
    ALTER TABLE vehicule ADD COLUMN fournisseur text;
  END IF;

  -- mode_acquisition
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'mode_acquisition') THEN
    ALTER TABLE vehicule ADD COLUMN mode_acquisition text;
  END IF;

  -- prix_ht
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'prix_ht') THEN
    ALTER TABLE vehicule ADD COLUMN prix_ht numeric(10, 2);
  END IF;

  -- prix_ttc
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'prix_ttc') THEN
    ALTER TABLE vehicule ADD COLUMN prix_ttc numeric(10, 2);
  END IF;

  -- mensualite
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'mensualite') THEN
    ALTER TABLE vehicule ADD COLUMN mensualite numeric(10, 2);
  END IF;

  -- duree_contrat_mois
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'duree_contrat_mois') THEN
    ALTER TABLE vehicule ADD COLUMN duree_contrat_mois integer;
  END IF;

  -- date_debut_contrat
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_debut_contrat') THEN
    ALTER TABLE vehicule ADD COLUMN date_debut_contrat date;
  END IF;

  -- date_fin_prevue_contrat
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_fin_prevue_contrat') THEN
    ALTER TABLE vehicule ADD COLUMN date_fin_prevue_contrat date;
  END IF;

  -- date_premiere_mise_en_circulation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_premiere_mise_en_circulation') THEN
    ALTER TABLE vehicule ADD COLUMN date_premiere_mise_en_circulation date;
  END IF;

  -- date_mise_en_service
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_mise_en_service') THEN
    ALTER TABLE vehicule ADD COLUMN date_mise_en_service date;
  END IF;

  -- annee
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'annee') THEN
    ALTER TABLE vehicule ADD COLUMN annee integer;
  END IF;
END $$;

-- Ajouter une contrainte de validation pour mode_acquisition si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicule_mode_acquisition_check'
    AND conrelid = 'vehicule'::regclass
  ) THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_mode_acquisition_check
    CHECK (mode_acquisition IS NULL OR mode_acquisition IN ('LLD', 'LOA', 'LCD', 'Achat pur', 'Prêt', 'Location société'));
  END IF;
END $$;

-- Ajouter la colonne is_read à la table alerte si elle existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alerte') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerte' AND column_name = 'is_read') THEN
      ALTER TABLE alerte ADD COLUMN is_read boolean DEFAULT false;
    END IF;
  END IF;
END $$;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN vehicule.fournisseur IS 'Fournisseur du véhicule (concessionnaire, loueur, etc.)';
COMMENT ON COLUMN vehicule.mode_acquisition IS 'Mode d''acquisition du véhicule : LLD, LOA, LCD, Achat pur, Prêt, Location société';
COMMENT ON COLUMN vehicule.prix_ht IS 'Prix Hors Taxes (pour achat ou valeur du véhicule)';
COMMENT ON COLUMN vehicule.prix_ttc IS 'Prix TTC calculé automatiquement (prix_ht * 1.20)';
COMMENT ON COLUMN vehicule.mensualite IS 'Montant de la mensualité (pour locations uniquement)';
COMMENT ON COLUMN vehicule.duree_contrat_mois IS 'Durée du contrat en mois';
COMMENT ON COLUMN vehicule.date_debut_contrat IS 'Date de début du contrat d''acquisition';
COMMENT ON COLUMN vehicule.date_fin_prevue_contrat IS 'Date de fin prévue du contrat';
COMMENT ON COLUMN vehicule.date_premiere_mise_en_circulation IS 'Date de première mise en circulation du véhicule';
COMMENT ON COLUMN vehicule.date_mise_en_service IS 'Date de mise en service dans l''entreprise';
COMMENT ON COLUMN vehicule.annee IS 'Année du véhicule';
