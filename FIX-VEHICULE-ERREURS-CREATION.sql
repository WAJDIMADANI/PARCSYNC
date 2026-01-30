/*
  # Fix - Correction des erreurs de création de véhicules

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
    - Correction des erreurs PGRST204 et PGRST200
*/

-- ==============================================================================
-- ÉTAPE 1 : AJOUTER LES COLONNES À LA TABLE VEHICULE
-- ==============================================================================

DO $$
BEGIN
  -- fournisseur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'fournisseur') THEN
    ALTER TABLE vehicule ADD COLUMN fournisseur text;
    RAISE NOTICE 'Colonne fournisseur ajoutée';
  END IF;

  -- mode_acquisition
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'mode_acquisition') THEN
    ALTER TABLE vehicule ADD COLUMN mode_acquisition text;
    RAISE NOTICE 'Colonne mode_acquisition ajoutée';
  END IF;

  -- prix_ht
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'prix_ht') THEN
    ALTER TABLE vehicule ADD COLUMN prix_ht numeric(10, 2);
    RAISE NOTICE 'Colonne prix_ht ajoutée';
  END IF;

  -- prix_ttc
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'prix_ttc') THEN
    ALTER TABLE vehicule ADD COLUMN prix_ttc numeric(10, 2);
    RAISE NOTICE 'Colonne prix_ttc ajoutée';
  END IF;

  -- mensualite
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'mensualite') THEN
    ALTER TABLE vehicule ADD COLUMN mensualite numeric(10, 2);
    RAISE NOTICE 'Colonne mensualite ajoutée';
  END IF;

  -- duree_contrat_mois
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'duree_contrat_mois') THEN
    ALTER TABLE vehicule ADD COLUMN duree_contrat_mois integer;
    RAISE NOTICE 'Colonne duree_contrat_mois ajoutée';
  END IF;

  -- date_debut_contrat
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_debut_contrat') THEN
    ALTER TABLE vehicule ADD COLUMN date_debut_contrat date;
    RAISE NOTICE 'Colonne date_debut_contrat ajoutée';
  END IF;

  -- date_fin_prevue_contrat
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_fin_prevue_contrat') THEN
    ALTER TABLE vehicule ADD COLUMN date_fin_prevue_contrat date;
    RAISE NOTICE 'Colonne date_fin_prevue_contrat ajoutée';
  END IF;

  -- date_premiere_mise_en_circulation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_premiere_mise_en_circulation') THEN
    ALTER TABLE vehicule ADD COLUMN date_premiere_mise_en_circulation date;
    RAISE NOTICE 'Colonne date_premiere_mise_en_circulation ajoutée';
  END IF;

  -- date_mise_en_service
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_mise_en_service') THEN
    ALTER TABLE vehicule ADD COLUMN date_mise_en_service date;
    RAISE NOTICE 'Colonne date_mise_en_service ajoutée';
  END IF;

  -- annee
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'annee') THEN
    ALTER TABLE vehicule ADD COLUMN annee integer;
    RAISE NOTICE 'Colonne annee ajoutée';
  END IF;
END $$;

-- ==============================================================================
-- ÉTAPE 2 : AJOUTER CONTRAINTE POUR MODE_ACQUISITION
-- ==============================================================================

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
    RAISE NOTICE 'Contrainte mode_acquisition ajoutée';
  END IF;
END $$;

-- ==============================================================================
-- ÉTAPE 3 : AJOUTER LA COLONNE IS_READ À ALERTE
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alerte') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerte' AND column_name = 'is_read') THEN
      ALTER TABLE alerte ADD COLUMN is_read boolean DEFAULT false;
      RAISE NOTICE 'Colonne is_read ajoutée à la table alerte';
    END IF;
  END IF;
END $$;

-- ==============================================================================
-- ÉTAPE 4 : AJOUTER DES COMMENTAIRES POUR DOCUMENTATION
-- ==============================================================================

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

-- ==============================================================================
-- ÉTAPE 5 : VÉRIFICATION FINALE
-- ==============================================================================

DO $$
DECLARE
  v_colonnes_ajoutees integer := 0;
BEGIN
  -- Vérifier que toutes les colonnes ont été ajoutées
  SELECT COUNT(*) INTO v_colonnes_ajoutees
  FROM information_schema.columns
  WHERE table_name = 'vehicule'
  AND column_name IN (
    'fournisseur', 'mode_acquisition', 'prix_ht', 'prix_ttc',
    'mensualite', 'duree_contrat_mois', 'date_debut_contrat',
    'date_fin_prevue_contrat', 'date_premiere_mise_en_circulation',
    'date_mise_en_service', 'annee'
  );

  RAISE NOTICE '============================================';
  RAISE NOTICE 'VÉRIFICATION FINALE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Colonnes ajoutées/vérifiées : %/11', v_colonnes_ajoutees;

  IF v_colonnes_ajoutees = 11 THEN
    RAISE NOTICE '✓ Toutes les colonnes sont présentes !';
  ELSE
    RAISE WARNING '⚠ Certaines colonnes sont manquantes !';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- Afficher les colonnes de la table vehicule
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'vehicule'
AND column_name IN (
  'fournisseur', 'mode_acquisition', 'prix_ht', 'prix_ttc',
  'mensualite', 'duree_contrat_mois', 'date_debut_contrat',
  'date_fin_prevue_contrat', 'date_premiere_mise_en_circulation',
  'date_mise_en_service', 'annee'
)
ORDER BY column_name;
