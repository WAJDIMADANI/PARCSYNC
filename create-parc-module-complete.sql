/*
  # Module Parc - Gestion Avancée des Véhicules

  1. Nouvelles Tables
    - `loueur`
      - `id` (uuid, primary key)
      - `nom` (text, required) - Nom de la société de location
      - `contact` (text) - Nom du contact principal
      - `telephone` (text)
      - `email` (text)
      - `adresse` (text)
      - `siret` (text)
      - `actif` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `attribution_vehicule`
      - `id` (uuid, primary key)
      - `vehicule_id` (uuid, FK → vehicule)
      - `profil_id` (uuid, FK → profil) - Le chauffeur
      - `loueur_id` (uuid, FK → loueur, nullable) - NULL = propriété TCA
      - `date_debut` (date, required)
      - `date_fin` (date, nullable) - NULL = attribution active
      - `type_attribution` (text) - 'principal' ou 'secondaire'
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modifications Table vehicule
    - Ajout de `reference_tca` (text) - Référence interne TCA
    - Ajout de `immat_norm` (text, unique) - Immatriculation normalisée
    - Ajout de `photo_path` (text) - Chemin vers la photo dans Storage
    - Suppression de `conducteur_actuel_id` (obsolète)

  3. Fonctions
    - `normalize_immat()` - Normalise les immatriculations
    - Trigger pour auto-normaliser les immatriculations

  4. Index pour performance optimale

  5. Sécurité RLS
*/

-- ============================================================================
-- 1. CRÉATION DE LA TABLE LOUEUR
-- ============================================================================

CREATE TABLE IF NOT EXISTS loueur (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  contact text,
  telephone text,
  email text,
  adresse text,
  siret text,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loueur_nom ON loueur(nom);
CREATE INDEX IF NOT EXISTS idx_loueur_actif ON loueur(actif);

-- ============================================================================
-- 2. CRÉATION DE LA TABLE ATTRIBUTION_VEHICULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS attribution_vehicule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES vehicule(id) ON DELETE CASCADE,
  profil_id uuid NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  loueur_id uuid REFERENCES loueur(id) ON DELETE SET NULL,
  date_debut date NOT NULL,
  date_fin date,
  type_attribution text NOT NULL CHECK (type_attribution IN ('principal', 'secondaire')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attribution_vehicule_id ON attribution_vehicule(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_attribution_profil_id ON attribution_vehicule(profil_id);
CREATE INDEX IF NOT EXISTS idx_attribution_loueur_id ON attribution_vehicule(loueur_id);
CREATE INDEX IF NOT EXISTS idx_attribution_date_fin ON attribution_vehicule(date_fin);

CREATE INDEX IF NOT EXISTS idx_attribution_vehicule_active
  ON attribution_vehicule(vehicule_id, date_fin)
  WHERE date_fin IS NULL;

CREATE INDEX IF NOT EXISTS idx_attribution_profil_active
  ON attribution_vehicule(profil_id, date_fin)
  WHERE date_fin IS NULL;

-- ============================================================================
-- 3. MODIFICATIONS DE LA TABLE VEHICULE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicule' AND column_name = 'reference_tca'
  ) THEN
    ALTER TABLE vehicule ADD COLUMN reference_tca text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicule' AND column_name = 'immat_norm'
  ) THEN
    ALTER TABLE vehicule ADD COLUMN immat_norm text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicule' AND column_name = 'photo_path'
  ) THEN
    ALTER TABLE vehicule ADD COLUMN photo_path text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicule' AND column_name = 'conducteur_actuel_id'
  ) THEN
    ALTER TABLE vehicule DROP CONSTRAINT IF EXISTS vehicule_conducteur_actuel_id_fkey;
    ALTER TABLE vehicule DROP COLUMN conducteur_actuel_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vehicule_reference_tca ON vehicule(reference_tca);
CREATE INDEX IF NOT EXISTS idx_vehicule_statut ON vehicule(statut);
CREATE INDEX IF NOT EXISTS idx_vehicule_marque ON vehicule(marque);
CREATE INDEX IF NOT EXISTS idx_vehicule_modele ON vehicule(modele);
CREATE INDEX IF NOT EXISTS idx_vehicule_annee ON vehicule(annee);

-- ============================================================================
-- 4. FONCTION DE NORMALISATION D'IMMATRICULATION
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_immat(immat text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN UPPER(REGEXP_REPLACE(immat, '[\s\-]', '', 'g'));
END;
$$;

CREATE OR REPLACE FUNCTION trigger_normalize_immat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.immatriculation IS NOT NULL THEN
    NEW.immat_norm := normalize_immat(NEW.immatriculation);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_immat_norm ON vehicule;
CREATE TRIGGER set_immat_norm
  BEFORE INSERT OR UPDATE OF immatriculation ON vehicule
  FOR EACH ROW
  EXECUTE FUNCTION trigger_normalize_immat();

UPDATE vehicule
SET immat_norm = normalize_immat(immatriculation)
WHERE immatriculation IS NOT NULL AND (immat_norm IS NULL OR immat_norm = '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicule_immat_norm_unique ON vehicule(immat_norm);

-- ============================================================================
-- 5. FONCTION POUR METTRE À JOUR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_loueur_updated_at ON loueur;
CREATE TRIGGER update_loueur_updated_at
  BEFORE UPDATE ON loueur
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attribution_updated_at ON attribution_vehicule;
CREATE TRIGGER update_attribution_updated_at
  BEFORE UPDATE ON attribution_vehicule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE loueur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read loueur" ON loueur;
CREATE POLICY "Authenticated users can read loueur"
  ON loueur FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert loueur" ON loueur;
CREATE POLICY "Authenticated users can insert loueur"
  ON loueur FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update loueur" ON loueur;
CREATE POLICY "Authenticated users can update loueur"
  ON loueur FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete loueur" ON loueur;
CREATE POLICY "Authenticated users can delete loueur"
  ON loueur FOR DELETE
  TO authenticated
  USING (true);

ALTER TABLE attribution_vehicule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read attribution_vehicule" ON attribution_vehicule;
CREATE POLICY "Authenticated users can read attribution_vehicule"
  ON attribution_vehicule FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert attribution_vehicule" ON attribution_vehicule;
CREATE POLICY "Authenticated users can insert attribution_vehicule"
  ON attribution_vehicule FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update attribution_vehicule" ON attribution_vehicule;
CREATE POLICY "Authenticated users can update attribution_vehicule"
  ON attribution_vehicule FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete attribution_vehicule" ON attribution_vehicule;
CREATE POLICY "Authenticated users can delete attribution_vehicule"
  ON attribution_vehicule FOR DELETE
  TO authenticated
  USING (true);

ALTER TABLE vehicule ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vehicule' AND policyname = 'Authenticated users can read vehicule'
  ) THEN
    CREATE POLICY "Authenticated users can read vehicule"
      ON vehicule FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vehicule' AND policyname = 'Authenticated users can insert vehicule'
  ) THEN
    CREATE POLICY "Authenticated users can insert vehicule"
      ON vehicule FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vehicule' AND policyname = 'Authenticated users can update vehicule'
  ) THEN
    CREATE POLICY "Authenticated users can update vehicule"
      ON vehicule FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vehicule' AND policyname = 'Authenticated users can delete vehicule'
  ) THEN
    CREATE POLICY "Authenticated users can delete vehicule"
      ON vehicule FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- 7. DONNÉES INITIALES
-- ============================================================================

INSERT INTO loueur (nom, contact, telephone, email, actif)
VALUES
  ('ALD Automotive', 'Service Client', '01 41 98 98 98', 'contact@aldautomotive.fr', true),
  ('Leaseplan', 'Service Location', '01 55 69 25 00', 'info@leaseplan.com', true),
  ('Arval', 'Service Gestion', '01 57 69 50 00', 'contact@arval.fr', true),
  ('Alphabet France', 'Support Client', '01 57 69 47 00', 'info@alphabet.com', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. VUE OPTIMISÉE POUR LA LISTE DES VÉHICULES
-- ============================================================================

CREATE OR REPLACE VIEW v_vehicles_list AS
SELECT
  v.id,
  v.immatriculation,
  v.immat_norm,
  v.reference_tca,
  v.marque,
  v.modele,
  v.annee,
  v.type,
  v.statut,
  v.date_mise_en_service,
  v.date_fin_service,
  v.photo_path,
  v.site_id,
  v.created_at,

  -- Aggrégation des chauffeurs actifs
  COALESCE(
    json_agg(
      json_build_object(
        'id', p.id,
        'nom', p.nom,
        'prenom', p.prenom,
        'matricule_tca', p.matricule_tca,
        'type_attribution', av.type_attribution,
        'date_debut', av.date_debut,
        'loueur_id', av.loueur_id,
        'loueur_nom', l.nom
      )
      ORDER BY
        CASE av.type_attribution
          WHEN 'principal' THEN 1
          WHEN 'secondaire' THEN 2
        END,
        av.date_debut DESC
    ) FILTER (WHERE av.id IS NOT NULL),
    '[]'::json
  ) as chauffeurs_actifs,

  -- Compteur de chauffeurs actifs
  COUNT(av.id) FILTER (WHERE av.date_fin IS NULL) as nb_chauffeurs_actifs

FROM vehicule v

LEFT JOIN attribution_vehicule av
  ON v.id = av.vehicule_id
  AND av.date_fin IS NULL

LEFT JOIN profil p
  ON av.profil_id = p.id

LEFT JOIN loueur l
  ON av.loueur_id = l.id

GROUP BY
  v.id, v.immatriculation, v.immat_norm, v.reference_tca,
  v.marque, v.modele, v.annee, v.type, v.statut,
  v.date_mise_en_service, v.date_fin_service, v.photo_path,
  v.site_id, v.created_at;
