/*
  ============================================
  SYSTÈME DE COMPTABILITÉ - À EXÉCUTER MAINTENANT
  ============================================

  Ce script crée les tables nécessaires pour la comptabilité
  avec leurs permissions RLS.

  INSTRUCTIONS :
  1. Aller sur https://supabase.com/dashboard
  2. Ouvrir l'éditeur SQL (SQL Editor)
  3. Copier-coller ce script complet
  4. Cliquer sur "Run"
*/

-- ===========================================
-- 1. TABLE DES ENTRÉES COMPTABLES
-- ===========================================

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

-- ===========================================
-- 2. TABLE DES SORTIES COMPTABLES
-- ===========================================

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

-- ===========================================
-- 3. ACTIVER RLS (SÉCURITÉ)
-- ===========================================

ALTER TABLE entrees_comptables ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorties_comptables ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. POLICIES POUR ENTRÉES
-- ===========================================

DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir toutes les entrées" ON entrees_comptables;
CREATE POLICY "Les utilisateurs authentifiés peuvent voir toutes les entrées"
  ON entrees_comptables
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer des entrées" ON entrees_comptables;
CREATE POLICY "Les utilisateurs authentifiés peuvent créer des entrées"
  ON entrees_comptables
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier toutes les entrées" ON entrees_comptables;
CREATE POLICY "Les utilisateurs peuvent modifier toutes les entrées"
  ON entrees_comptables
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer toutes les entrées" ON entrees_comptables;
CREATE POLICY "Les utilisateurs peuvent supprimer toutes les entrées"
  ON entrees_comptables
  FOR DELETE
  TO authenticated
  USING (true);

-- ===========================================
-- 5. POLICIES POUR SORTIES
-- ===========================================

DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir toutes les sorties" ON sorties_comptables;
CREATE POLICY "Les utilisateurs authentifiés peuvent voir toutes les sorties"
  ON sorties_comptables
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer des sorties" ON sorties_comptables;
CREATE POLICY "Les utilisateurs authentifiés peuvent créer des sorties"
  ON sorties_comptables
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier toutes les sorties" ON sorties_comptables;
CREATE POLICY "Les utilisateurs peuvent modifier toutes les sorties"
  ON sorties_comptables
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer toutes les sorties" ON sorties_comptables;
CREATE POLICY "Les utilisateurs peuvent supprimer toutes les sorties"
  ON sorties_comptables
  FOR DELETE
  TO authenticated
  USING (true);

-- ===========================================
-- 6. INDEX POUR PERFORMANCES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_entrees_date ON entrees_comptables(date DESC);
CREATE INDEX IF NOT EXISTS idx_entrees_categorie ON entrees_comptables(categorie);
CREATE INDEX IF NOT EXISTS idx_entrees_created_by ON entrees_comptables(created_by);

CREATE INDEX IF NOT EXISTS idx_sorties_date ON sorties_comptables(date DESC);
CREATE INDEX IF NOT EXISTS idx_sorties_categorie ON sorties_comptables(categorie);
CREATE INDEX IF NOT EXISTS idx_sorties_created_by ON sorties_comptables(created_by);

-- ===========================================
-- 7. TRIGGER POUR UPDATED_AT
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_entrees_comptables_updated_at ON entrees_comptables;
CREATE TRIGGER update_entrees_comptables_updated_at
  BEFORE UPDATE ON entrees_comptables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sorties_comptables_updated_at ON sorties_comptables;
CREATE TRIGGER update_sorties_comptables_updated_at
  BEFORE UPDATE ON sorties_comptables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ✅ TERMINÉ !
-- ===========================================

SELECT 'Tables de comptabilité créées avec succès !' as message;
