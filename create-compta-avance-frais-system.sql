/*
  # Système de gestion des avances de frais

  1. Tables
    - `compta_avance_frais`
      - `id` (uuid, primary key)
      - `profil_id` (uuid, référence à profil)
      - `montant` (numeric, montant de l'avance)
      - `motif` (text, raison de l'avance)
      - `date_demande` (date, date de la demande)
      - `statut` (text, statut de la demande)
      - `commentaire_validation` (text, commentaire lors de la validation/refus)
      - `valide_par` (uuid, référence à app_utilisateur)
      - `date_validation` (timestamptz, date de validation)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS sur `compta_avance_frais`
    - Policies pour créer, lire et voir ses propres avances
    - Policies pour les validateurs (RH/admin)

  3. Triggers
    - Créer automatiquement une demande_validation lors de la création d'une avance
    - Mettre à jour updated_at automatiquement
*/

-- Créer la table compta_avance_frais
CREATE TABLE IF NOT EXISTS compta_avance_frais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  montant numeric(10,2) NOT NULL CHECK (montant > 0),
  motif text NOT NULL,
  facture text DEFAULT 'A_FOURNIR' CHECK (facture IN ('A_FOURNIR', 'TRANSMIS', 'RECU')),
  facture_file_path text,
  date_demande date NOT NULL DEFAULT CURRENT_DATE,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'validee', 'refusee')),
  commentaire_validation text,
  valide_par uuid REFERENCES app_utilisateur(id),
  date_validation timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_compta_avance_frais_profil_id ON compta_avance_frais(profil_id);
CREATE INDEX IF NOT EXISTS idx_compta_avance_frais_statut ON compta_avance_frais(statut);
CREATE INDEX IF NOT EXISTS idx_compta_avance_frais_date_demande ON compta_avance_frais(date_demande);

-- Activer RLS
ALTER TABLE compta_avance_frais ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres avances
CREATE POLICY "Users can view their own avances"
  ON compta_avance_frais FOR SELECT
  TO authenticated
  USING (
    profil_id IN (
      SELECT p.id FROM profil p
      JOIN app_utilisateur au ON p.email = au.email
      WHERE au.user_id = auth.uid()
    )
  );

-- Politique: Les RH et admins peuvent voir toutes les avances
CREATE POLICY "RH and admins can view all avances"
  ON compta_avance_frais FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      JOIN user_permissions up ON au.id = up.user_id
      WHERE au.user_id = auth.uid()
      AND up.permission_name IN ('gerer_demandes', 'admin_total')
    )
  );

-- Politique: Les utilisateurs peuvent créer leurs propres avances
CREATE POLICY "Users can create their own avances"
  ON compta_avance_frais FOR INSERT
  TO authenticated
  WITH CHECK (
    profil_id IN (
      SELECT p.id FROM profil p
      JOIN app_utilisateur au ON p.email = au.email
      WHERE au.user_id = auth.uid()
    )
  );

-- Politique: Les RH et admins peuvent mettre à jour les avances (validation)
CREATE POLICY "RH and admins can update avances"
  ON compta_avance_frais FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      JOIN user_permissions up ON au.id = up.user_id
      WHERE au.user_id = auth.uid()
      AND up.permission_name IN ('gerer_demandes', 'admin_total')
    )
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_compta_avance_frais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_compta_avance_frais_updated_at_trigger ON compta_avance_frais;
CREATE TRIGGER update_compta_avance_frais_updated_at_trigger
  BEFORE UPDATE ON compta_avance_frais
  FOR EACH ROW
  EXECUTE FUNCTION update_compta_avance_frais_updated_at();

-- Fonction pour valider ou refuser une avance de frais
CREATE OR REPLACE FUNCTION valider_avance_frais(
  p_avance_id uuid,
  p_validation_statut text,
  p_commentaire text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_validator_id uuid;
BEGIN
  -- Récupérer l'ID du validateur
  SELECT id INTO v_validator_id
  FROM app_utilisateur
  WHERE user_id = auth.uid();

  -- Vérifier que le validateur a les permissions nécessaires
  IF NOT EXISTS (
    SELECT 1 FROM app_utilisateur au
    JOIN user_permissions up ON au.id = up.user_id
    WHERE au.user_id = auth.uid()
    AND up.permission_name IN ('gerer_demandes', 'admin_total')
  ) THEN
    RAISE EXCEPTION 'Vous n''avez pas les permissions nécessaires pour valider cette avance';
  END IF;

  -- Mettre à jour l'avance de frais
  UPDATE compta_avance_frais
  SET
    statut = CASE
      WHEN p_validation_statut = 'validee' THEN 'validee'
      WHEN p_validation_statut = 'refusee' THEN 'refusee'
      ELSE statut
    END,
    commentaire_validation = p_commentaire,
    valide_par = v_validator_id,
    date_validation = now()
  WHERE id = p_avance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avance de frais introuvable';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une vue pour joindre avec les informations du profil
CREATE OR REPLACE VIEW v_compta_avance_frais AS
SELECT
  caf.id,
  caf.profil_id,
  p.matricule_tca as matricule,
  p.nom,
  p.prenom,
  caf.motif,
  caf.montant,
  caf.facture,
  caf.facture_file_path,
  caf.date_demande,
  caf.statut,
  caf.commentaire_validation,
  caf.valide_par,
  caf.date_validation,
  caf.created_at,
  caf.updated_at
FROM compta_avance_frais caf
JOIN profil p ON caf.profil_id = p.id;

-- Créer un bucket storage pour les justificatifs d'avance de frais
INSERT INTO storage.buckets (id, name, public)
VALUES ('compta-avance-frais', 'compta-avance-frais', false)
ON CONFLICT (id) DO NOTHING;

-- Policies pour le bucket storage
CREATE POLICY "Authenticated users can upload justificatifs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'compta-avance-frais');

CREATE POLICY "Users can view justificatifs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'compta-avance-frais');

CREATE POLICY "RH can delete justificatifs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'compta-avance-frais' AND
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      JOIN user_permissions up ON au.id = up.user_id
      WHERE au.user_id = auth.uid()
      AND up.permission_name IN ('gerer_demandes', 'admin_total')
    )
  );
