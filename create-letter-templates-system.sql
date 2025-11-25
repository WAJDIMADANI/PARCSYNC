/*
  # Système de Modèles de Courriers

  1. Nouvelles Tables
    - `modele_courrier`
      - Table pour stocker les modèles de courriers créés par les admins
      - Variables système auto-remplies + variables personnalisées

    - `courrier_genere`
      - Table séparée pour les courriers générés depuis les modèles
      - Complètement indépendante de la table `courrier` existante

  2. Sécurité
    - Enable RLS on both tables
    - Policies for authenticated users with appropriate permissions

  3. Notes Importantes
    - Cette migration est 100% additive - aucune table existante n'est modifiée
    - La table `courrier` existante reste intacte
*/

-- Créer la table modele_courrier
CREATE TABLE IF NOT EXISTS modele_courrier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type_courrier TEXT NOT NULL,
  sujet TEXT NOT NULL,
  contenu TEXT NOT NULL,
  variables_systeme TEXT[] DEFAULT '{}',
  variables_personnalisees JSONB DEFAULT '{}',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES app_utilisateur(id)
);

-- Créer la table courrier_genere
CREATE TABLE IF NOT EXISTS courrier_genere (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id UUID NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  modele_courrier_id UUID REFERENCES modele_courrier(id) ON DELETE SET NULL,
  modele_nom TEXT NOT NULL,
  sujet TEXT NOT NULL,
  contenu_genere TEXT NOT NULL,
  variables_remplies JSONB NOT NULL DEFAULT '{}',
  fichier_pdf_url TEXT,
  status TEXT DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES app_utilisateur(id)
);

-- Créer les index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_modele_courrier_actif ON modele_courrier(actif);
CREATE INDEX IF NOT EXISTS idx_modele_courrier_type ON modele_courrier(type_courrier);
CREATE INDEX IF NOT EXISTS idx_courrier_genere_profil ON courrier_genere(profil_id);
CREATE INDEX IF NOT EXISTS idx_courrier_genere_modele ON courrier_genere(modele_courrier_id);
CREATE INDEX IF NOT EXISTS idx_courrier_genere_created ON courrier_genere(created_at DESC);

-- Enable RLS
ALTER TABLE modele_courrier ENABLE ROW LEVEL SECURITY;
ALTER TABLE courrier_genere ENABLE ROW LEVEL SECURITY;

-- Policies pour modele_courrier
CREATE POLICY "Users can view active letter templates"
  ON modele_courrier
  FOR SELECT
  TO authenticated
  USING (actif = true OR created_by = auth.uid());

CREATE POLICY "Admins can create letter templates"
  ON modele_courrier
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

CREATE POLICY "Admins can update letter templates"
  ON modele_courrier
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

CREATE POLICY "Admins can delete letter templates"
  ON modele_courrier
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- Policies pour courrier_genere
CREATE POLICY "Users can view generated letters"
  ON courrier_genere
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create generated letters"
  ON courrier_genere
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own generated letters"
  ON courrier_genere
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own generated letters"
  ON courrier_genere
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_modele_courrier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_modele_courrier_updated_at ON modele_courrier;
CREATE TRIGGER trigger_update_modele_courrier_updated_at
  BEFORE UPDATE ON modele_courrier
  FOR EACH ROW
  EXECUTE FUNCTION update_modele_courrier_updated_at();
