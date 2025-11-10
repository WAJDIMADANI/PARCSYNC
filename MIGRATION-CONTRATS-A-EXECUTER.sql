/*
  MIGRATION URGENTE - SYSTÈME DE CONTRATS

  Exécuter ce fichier dans l'éditeur SQL de Supabase :
  https://supabase.com/dashboard/project/[votre-projet]/editor

  Ce fichier crée :
  1. Table modeles_contrats (modèles de contrats)
  2. Table contrat (contrats des salariés)
  3. Toutes les politiques RLS nécessaires
*/

-- ============================================
-- ÉTAPE 1 : Créer la table modeles_contrats
-- ============================================

CREATE TABLE IF NOT EXISTS modeles_contrats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  type_contrat text NOT NULL,
  fichier_url text NOT NULL,
  fichier_nom text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE modeles_contrats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON modeles_contrats;
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON modeles_contrats;

-- Create policies
CREATE POLICY "Authenticated users can view templates"
  ON modeles_contrats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert templates"
  ON modeles_contrats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates"
  ON modeles_contrats FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete templates"
  ON modeles_contrats FOR DELETE
  TO authenticated
  USING (true);


-- ============================================
-- ÉTAPE 2 : Créer la table contrat
-- ============================================

CREATE TABLE IF NOT EXISTS contrat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  modele_id uuid NOT NULL REFERENCES modeles_contrats(id),
  site_id uuid REFERENCES site(id),
  variables jsonb DEFAULT '{}'::jsonb,
  fichier_contrat_url text,
  fichier_signe_url text,
  certificat_medical_id uuid REFERENCES document(id),
  dpae_id uuid REFERENCES document(id),
  date_envoi timestamptz DEFAULT now(),
  date_signature timestamptz,
  statut text NOT NULL DEFAULT 'envoye' CHECK (statut IN ('envoye', 'signe', 'valide')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_contrat_profil_id ON contrat(profil_id);
CREATE INDEX IF NOT EXISTS idx_contrat_statut ON contrat(statut);

-- Enable RLS
ALTER TABLE contrat ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON contrat;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON contrat;

-- Create policies
CREATE POLICY "Authenticated users can view contracts"
  ON contrat FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contracts"
  ON contrat FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
  ON contrat FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contracts"
  ON contrat FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger function if doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_contrat_updated_at ON contrat;

CREATE TRIGGER update_contrat_updated_at
  BEFORE UPDATE ON contrat
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- ÉTAPE 3 : Insérer un modèle de test
-- ============================================

INSERT INTO modeles_contrats (nom, type_contrat, fichier_url, fichier_nom, variables)
VALUES
  ('CDD - Conducteur scolaire - IDFM/N', 'CDD', 'https://placeholder.com/contract.pdf', 'contrat-cdd.pdf', '{}'::jsonb),
  ('CDI - Agent de quai', 'CDI', 'https://placeholder.com/contract.pdf', 'contrat-cdi.pdf', '{}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

-- Vérification : afficher les tables créées
SELECT 'Migration terminée avec succès!' as message;
SELECT COUNT(*) as nb_modeles FROM modeles_contrats;
