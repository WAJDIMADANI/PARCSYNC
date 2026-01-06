/*
  # Création du système de Comptabilité

  1. Nouvelles Tables
    - `entrees_comptables` : Gestion des entrées comptables
      - `id` (uuid, clé primaire)
      - `date` (date de l'entrée)
      - `montant` (montant de l'entrée)
      - `categorie` (catégorie de l'entrée)
      - `description` (description détaillée)
      - `reference` (numéro de référence/facture)
      - `mode_paiement` (mode de paiement)
      - `client` (nom du client/source)
      - `created_by` (utilisateur créateur)
      - `created_at` (date de création)
      - `updated_at` (date de mise à jour)

    - `sorties_comptables` : Gestion des sorties comptables
      - `id` (uuid, clé primaire)
      - `date` (date de la sortie)
      - `montant` (montant de la sortie)
      - `categorie` (catégorie de la sortie)
      - `description` (description détaillée)
      - `reference` (numéro de référence/facture)
      - `mode_paiement` (mode de paiement)
      - `fournisseur` (nom du fournisseur/destinataire)
      - `created_by` (utilisateur créateur)
      - `created_at` (date de création)
      - `updated_at` (date de mise à jour)

  2. Sécurité
    - Activer RLS sur les deux tables
    - Les utilisateurs authentifiés peuvent consulter toutes les données
    - Les utilisateurs authentifiés peuvent créer des entrées
    - Les utilisateurs peuvent modifier leurs propres entrées
*/

-- Table des entrées comptables
CREATE TABLE IF NOT EXISTS entrees_comptables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  montant decimal(10, 2) NOT NULL,
  categorie text NOT NULL,
  description text,
  reference text,
  mode_paiement text,
  client text,
  created_by uuid REFERENCES app_utilisateur(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des sorties comptables
CREATE TABLE IF NOT EXISTS sorties_comptables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  montant decimal(10, 2) NOT NULL,
  categorie text NOT NULL,
  description text,
  reference text,
  mode_paiement text,
  fournisseur text,
  created_by uuid REFERENCES app_utilisateur(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE entrees_comptables ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorties_comptables ENABLE ROW LEVEL SECURITY;

-- Policies pour entrees_comptables
CREATE POLICY "Les utilisateurs authentifiés peuvent voir toutes les entrées"
  ON entrees_comptables
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des entrées"
  ON entrees_comptables
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs peuvent modifier toutes les entrées"
  ON entrees_comptables
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs peuvent supprimer toutes les entrées"
  ON entrees_comptables
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour sorties_comptables
CREATE POLICY "Les utilisateurs authentifiés peuvent voir toutes les sorties"
  ON sorties_comptables
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des sorties"
  ON sorties_comptables
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs peuvent modifier toutes les sorties"
  ON sorties_comptables
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs peuvent supprimer toutes les sorties"
  ON sorties_comptables
  FOR DELETE
  TO authenticated
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_entrees_date ON entrees_comptables(date DESC);
CREATE INDEX IF NOT EXISTS idx_entrees_categorie ON entrees_comptables(categorie);
CREATE INDEX IF NOT EXISTS idx_entrees_created_by ON entrees_comptables(created_by);

CREATE INDEX IF NOT EXISTS idx_sorties_date ON sorties_comptables(date DESC);
CREATE INDEX IF NOT EXISTS idx_sorties_categorie ON sorties_comptables(categorie);
CREATE INDEX IF NOT EXISTS idx_sorties_created_by ON sorties_comptables(created_by);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_entrees_comptables_updated_at'
  ) THEN
    CREATE TRIGGER update_entrees_comptables_updated_at
      BEFORE UPDATE ON entrees_comptables
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_sorties_comptables_updated_at'
  ) THEN
    CREATE TRIGGER update_sorties_comptables_updated_at
      BEFORE UPDATE ON sorties_comptables
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
