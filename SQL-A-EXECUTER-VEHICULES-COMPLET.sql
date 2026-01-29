/*
  # SCRIPT COMPLET - Tables et colonnes pour module véhicules

  Ce script vérifie et crée toutes les tables et colonnes nécessaires :
  1. Colonnes étendues de la table vehicule
  2. Table historique_kilometrage
  3. Table document_vehicule
  4. Index et RLS

  IMPORTANT: Ce script est idempotent, vous pouvez l'exécuter plusieurs fois sans problème.
*/

-- ============================================================================
-- 1. AJOUTER LES COLONNES MANQUANTES À LA TABLE VEHICULE
-- ============================================================================

DO $$
BEGIN
  -- reference_tca
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'reference_tca') THEN
    ALTER TABLE vehicule ADD COLUMN reference_tca text;
  END IF;

  -- immat_norm (immatriculation normalisée)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'immat_norm') THEN
    ALTER TABLE vehicule ADD COLUMN immat_norm text;
  END IF;

  -- date_premiere_mise_en_circulation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'date_premiere_mise_en_circulation') THEN
    ALTER TABLE vehicule ADD COLUMN date_premiere_mise_en_circulation date;
  END IF;

  -- assurance_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'assurance_type') THEN
    ALTER TABLE vehicule ADD COLUMN assurance_type text DEFAULT 'tca';
  END IF;

  -- assurance_compagnie
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'assurance_compagnie') THEN
    ALTER TABLE vehicule ADD COLUMN assurance_compagnie text;
  END IF;

  -- assurance_numero_contrat
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'assurance_numero_contrat') THEN
    ALTER TABLE vehicule ADD COLUMN assurance_numero_contrat text;
  END IF;

  -- licence_transport_numero
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'licence_transport_numero') THEN
    ALTER TABLE vehicule ADD COLUMN licence_transport_numero text;
  END IF;

  -- materiel_embarque (JSONB)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'materiel_embarque') THEN
    ALTER TABLE vehicule ADD COLUMN materiel_embarque jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- carte_essence_fournisseur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'carte_essence_fournisseur') THEN
    ALTER TABLE vehicule ADD COLUMN carte_essence_fournisseur text;
  END IF;

  -- carte_essence_numero
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'carte_essence_numero') THEN
    ALTER TABLE vehicule ADD COLUMN carte_essence_numero text;
  END IF;

  -- carte_essence_attribuee
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'carte_essence_attribuee') THEN
    ALTER TABLE vehicule ADD COLUMN carte_essence_attribuee boolean DEFAULT false;
  END IF;

  -- kilometrage_actuel
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'kilometrage_actuel') THEN
    ALTER TABLE vehicule ADD COLUMN kilometrage_actuel integer;
  END IF;

  -- derniere_maj_kilometrage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'derniere_maj_kilometrage') THEN
    ALTER TABLE vehicule ADD COLUMN derniere_maj_kilometrage date;
  END IF;

  -- photo_path
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'photo_path') THEN
    ALTER TABLE vehicule ADD COLUMN photo_path text;
  END IF;

  RAISE NOTICE 'Colonnes de vehicule vérifiées/ajoutées avec succès';
END $$;

-- Contrainte pour assurance_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicule_assurance_type_check'
  ) THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_assurance_type_check
    CHECK (assurance_type IN ('tca', 'externe'));
  END IF;
END $$;

-- ============================================================================
-- 2. CRÉER LA TABLE HISTORIQUE_KILOMETRAGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.historique_kilometrage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES public.vehicule(id) ON DELETE CASCADE,
  date_releve date NOT NULL,
  kilometrage integer NOT NULL,
  source text DEFAULT 'manuel',
  notes text,
  saisi_par uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Index pour historique_kilometrage
CREATE INDEX IF NOT EXISTS idx_historique_kilometrage_vehicule_id ON public.historique_kilometrage(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_historique_kilometrage_date_releve ON public.historique_kilometrage(date_releve);

-- Contrainte pour source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'historique_kilometrage_source_check'
  ) THEN
    ALTER TABLE historique_kilometrage
    ADD CONSTRAINT historique_kilometrage_source_check
    CHECK (source IN ('manuel', 'carburant', 'maintenance'));
  END IF;
END $$;

-- RLS pour historique_kilometrage
ALTER TABLE public.historique_kilometrage ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Authenticated users can read all mileage history" ON public.historique_kilometrage;
DROP POLICY IF EXISTS "Authenticated users can insert mileage records" ON public.historique_kilometrage;
DROP POLICY IF EXISTS "Users can update their own mileage records" ON public.historique_kilometrage;

-- Recréer les policies
CREATE POLICY "Authenticated users can read all mileage history"
  ON public.historique_kilometrage
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert mileage records"
  ON public.historique_kilometrage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own mileage records"
  ON public.historique_kilometrage
  FOR UPDATE
  TO authenticated
  USING (saisi_par = auth.uid())
  WITH CHECK (saisi_par = auth.uid());

-- ============================================================================
-- 3. CRÉER LA TABLE DOCUMENT_VEHICULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_vehicule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES public.vehicule(id) ON DELETE CASCADE,
  type_document text NOT NULL,
  nom_fichier text NOT NULL,
  fichier_url text NOT NULL,
  date_emission date,
  date_expiration date,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour document_vehicule
CREATE INDEX IF NOT EXISTS idx_document_vehicule_vehicule_id ON public.document_vehicule(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_type_document ON public.document_vehicule(type_document);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_date_expiration ON public.document_vehicule(date_expiration);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_actif ON public.document_vehicule(actif);

-- RLS pour document_vehicule
ALTER TABLE public.document_vehicule ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Authenticated users can read all documents" ON public.document_vehicule;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.document_vehicule;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.document_vehicule;

-- Recréer les policies
CREATE POLICY "Authenticated users can read all documents"
  ON public.document_vehicule
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON public.document_vehicule
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
  ON public.document_vehicule
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_document_vehicule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour document_vehicule
DROP TRIGGER IF EXISTS update_document_vehicule_updated_at_trigger ON document_vehicule;
CREATE TRIGGER update_document_vehicule_updated_at_trigger
  BEFORE UPDATE ON public.document_vehicule
  FOR EACH ROW
  EXECUTE FUNCTION update_document_vehicule_updated_at();

-- ============================================================================
-- 4. INDEX SUPPLÉMENTAIRES POUR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vehicule_reference_tca ON vehicule(reference_tca);
CREATE INDEX IF NOT EXISTS idx_vehicule_immat_norm ON vehicule(immat_norm);
CREATE INDEX IF NOT EXISTS idx_vehicule_statut ON vehicule(statut);

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

DO $$
DECLARE
  nb_colonnes_vehicule integer;
  nb_tables integer;
BEGIN
  -- Compter les colonnes de vehicule
  SELECT COUNT(*) INTO nb_colonnes_vehicule
  FROM information_schema.columns
  WHERE table_name = 'vehicule'
    AND column_name IN (
      'reference_tca', 'immat_norm', 'date_premiere_mise_en_circulation',
      'assurance_type', 'assurance_compagnie', 'assurance_numero_contrat',
      'licence_transport_numero', 'materiel_embarque', 'carte_essence_fournisseur',
      'carte_essence_numero', 'carte_essence_attribuee', 'kilometrage_actuel',
      'derniere_maj_kilometrage', 'photo_path'
    );

  -- Compter les tables créées
  SELECT COUNT(*) INTO nb_tables
  FROM information_schema.tables
  WHERE table_name IN ('historique_kilometrage', 'document_vehicule')
    AND table_schema = 'public';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION FINALE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Colonnes vehicule présentes: % / 14', nb_colonnes_vehicule;
  RAISE NOTICE 'Tables créées: % / 2', nb_tables;

  IF nb_colonnes_vehicule = 14 AND nb_tables = 2 THEN
    RAISE NOTICE '✓ Installation complète réussie !';
  ELSE
    RAISE WARNING '⚠ Installation incomplète. Vérifier les erreurs ci-dessus.';
  END IF;

  RAISE NOTICE '========================================';
END $$;
