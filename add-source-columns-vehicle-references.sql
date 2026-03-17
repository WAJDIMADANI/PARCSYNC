/*
  # Ajout des colonnes source et source_id aux tables de référence véhicules

  1. Modifications
    - Ajout de `source` (texte) pour identifier la source de données (ex: 'nhtsa', 'manual')
    - Ajout de `source_id` (texte) pour stocker l'ID de la source externe
    - Ajout d'index pour optimiser les recherches par source
    - Ajout de contraintes d'unicité pour éviter les doublons

  2. Tables modifiées
    - vehicle_reference_brands
    - vehicle_reference_models
*/

-- ============================================================================
-- 1. Ajout des colonnes à vehicle_reference_brands
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'vehicle_reference_brands'
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.vehicle_reference_brands
    ADD COLUMN source text DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'vehicle_reference_brands'
    AND column_name = 'source_id'
  ) THEN
    ALTER TABLE public.vehicle_reference_brands
    ADD COLUMN source_id text;
  END IF;
END $$;

-- Index pour recherche rapide par source
CREATE INDEX IF NOT EXISTS idx_vehicle_brands_source
  ON public.vehicle_reference_brands(source);

CREATE INDEX IF NOT EXISTS idx_vehicle_brands_source_id
  ON public.vehicle_reference_brands(source_id)
  WHERE source_id IS NOT NULL;

-- Contrainte unique pour éviter les doublons par source
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_brands_source_unique
  ON public.vehicle_reference_brands(source, source_id)
  WHERE source_id IS NOT NULL;

-- ============================================================================
-- 2. Ajout des colonnes à vehicle_reference_models
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'vehicle_reference_models'
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.vehicle_reference_models
    ADD COLUMN source text DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'vehicle_reference_models'
    AND column_name = 'source_id'
  ) THEN
    ALTER TABLE public.vehicle_reference_models
    ADD COLUMN source_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'vehicle_reference_models'
    AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE public.vehicle_reference_models
    ADD COLUMN vehicle_type text;
  END IF;
END $$;

-- Index pour recherche rapide par source
CREATE INDEX IF NOT EXISTS idx_vehicle_models_source
  ON public.vehicle_reference_models(source);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_source_id
  ON public.vehicle_reference_models(source_id)
  WHERE source_id IS NOT NULL;

-- Contrainte unique pour éviter les doublons par source
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_models_source_unique
  ON public.vehicle_reference_models(source, source_id)
  WHERE source_id IS NOT NULL;

-- Index pour recherche par type de véhicule
CREATE INDEX IF NOT EXISTS idx_vehicle_models_vehicle_type
  ON public.vehicle_reference_models(vehicle_type)
  WHERE vehicle_type IS NOT NULL;

-- ============================================================================
-- 3. Mettre à jour les données existantes avec source 'manual'
-- ============================================================================

UPDATE public.vehicle_reference_brands
SET source = 'manual'
WHERE source IS NULL;

UPDATE public.vehicle_reference_models
SET source = 'manual'
WHERE source IS NULL;
