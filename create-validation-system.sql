/*
  # Système de Validation des Demandes Standardistes

  1. Nouvelles Tables
    - `demande_validation`
      - Stocke les demandes de validation faites par les standardistes
      - Colonnes : id, demande_id, demandeur_id, validateur_id, type_action, statut, priorite
      - Permet de demander validation, approuver, rejeter, transférer
      - Traçabilité complète avec timestamps

    - `message_validation`
      - Stocke les messages de la conversation entre demandeur et validateur
      - Colonnes : id, demande_validation_id, auteur_id, message, created_at, lu
      - Permet une communication bidirectionnelle

  2. Vues
    - `validations_avec_details`
      - Joint toutes les informations nécessaires pour l'affichage
      - Retourne : validation, demande, demandeur, validateur, salarié, messages

  3. Fonctions
    - `get_validations_stats()` - Statistiques pour le dashboard
    - `marquer_messages_lus()` - Marquer messages comme lus

  4. Sécurité (RLS)
    - Policies restrictives : seuls demandeurs et validateurs voient leurs validations
    - Super admins (permission admin/utilisateurs) voient tout
    - Messages accessibles uniquement aux participants

  Notes importantes :
    - Intégration avec le système de demandes existant (demande_standard)
    - Notifications temps réel via Supabase Realtime
    - Système de conversation pour clarifications
    - Transfert de validations entre validateurs
*/

-- =====================================================
-- 1. TYPES ENUM
-- =====================================================

-- Type enum pour le statut de validation
DO $$ BEGIN
  CREATE TYPE validation_statut AS ENUM ('en_attente', 'approuvee', 'rejetee', 'transferee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Type enum pour le type d'action demandée
DO $$ BEGIN
  CREATE TYPE validation_type_action AS ENUM (
    'modification_demande',
    'suppression_demande',
    'changement_priorite',
    'reassignation',
    'autre'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLE: demande_validation
-- =====================================================

CREATE TABLE IF NOT EXISTS demande_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Liens
  demande_id UUID NOT NULL REFERENCES demande_standard(id) ON DELETE CASCADE,
  demandeur_id UUID NOT NULL REFERENCES app_utilisateur(id) ON DELETE CASCADE,
  validateur_id UUID NOT NULL REFERENCES app_utilisateur(id) ON DELETE SET NULL,

  -- Détails de la validation
  type_action validation_type_action NOT NULL,
  priorite demande_priorite DEFAULT 'normale',
  statut validation_statut DEFAULT 'en_attente',

  -- Messages
  message_demande TEXT NOT NULL,
  commentaire_validateur TEXT,

  -- Traçabilité
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,

  -- Transfert (si transférée à un autre validateur)
  transferee_vers UUID REFERENCES app_utilisateur(id) ON DELETE SET NULL,
  raison_transfert TEXT,

  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_demande_validation_demande_id ON demande_validation(demande_id);
CREATE INDEX IF NOT EXISTS idx_demande_validation_demandeur_id ON demande_validation(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_demande_validation_validateur_id ON demande_validation(validateur_id);
CREATE INDEX IF NOT EXISTS idx_demande_validation_statut ON demande_validation(statut);
CREATE INDEX IF NOT EXISTS idx_demande_validation_priorite ON demande_validation(priorite);
CREATE INDEX IF NOT EXISTS idx_demande_validation_created_at ON demande_validation(created_at DESC);

-- Enable RLS
ALTER TABLE demande_validation ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir les validations où ils sont demandeurs ou validateurs
CREATE POLICY "Users can view their validations"
  ON demande_validation
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      WHERE au.auth_user_id = auth.uid()
      AND (
        demandeur_id = au.id
        OR validateur_id = au.id
        OR transferee_vers = au.id
      )
    )
    OR EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'admin/utilisateurs'
      AND up.actif = true
    )
  );

-- Policy: Les standardistes peuvent créer des validations
CREATE POLICY "Users can create validations"
  ON demande_validation
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      WHERE au.auth_user_id = auth.uid()
      AND demandeur_id = au.id
    )
  );

-- Policy: Les validateurs peuvent mettre à jour leurs validations
CREATE POLICY "Validators can update validations"
  ON demande_validation
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      WHERE au.auth_user_id = auth.uid()
      AND (validateur_id = au.id OR transferee_vers = au.id)
    )
    OR EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'admin/utilisateurs'
      AND up.actif = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur au
      WHERE au.auth_user_id = auth.uid()
      AND (validateur_id = au.id OR transferee_vers = au.id)
    )
    OR EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'admin/utilisateurs'
      AND up.actif = true
    )
  );

-- =====================================================
-- 3. TABLE: message_validation
-- =====================================================

CREATE TABLE IF NOT EXISTS message_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  demande_validation_id UUID NOT NULL REFERENCES demande_validation(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES app_utilisateur(id) ON DELETE CASCADE,

  message TEXT NOT NULL,
  lu BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_message_validation_demande_validation_id ON message_validation(demande_validation_id);
CREATE INDEX IF NOT EXISTS idx_message_validation_auteur_id ON message_validation(auteur_id);
CREATE INDEX IF NOT EXISTS idx_message_validation_created_at ON message_validation(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_message_validation_lu ON message_validation(lu);

-- Enable RLS
ALTER TABLE message_validation ENABLE ROW LEVEL SECURITY;

-- Policy: Les participants peuvent voir les messages de leurs validations
CREATE POLICY "Participants can view messages"
  ON message_validation
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM demande_validation dv
      INNER JOIN app_utilisateur au ON au.auth_user_id = auth.uid()
      WHERE dv.id = message_validation.demande_validation_id
      AND (dv.demandeur_id = au.id OR dv.validateur_id = au.id OR dv.transferee_vers = au.id)
    )
    OR EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'admin/utilisateurs'
      AND up.actif = true
    )
  );

-- Policy: Les participants peuvent créer des messages
CREATE POLICY "Participants can create messages"
  ON message_validation
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM demande_validation dv
      INNER JOIN app_utilisateur au ON au.auth_user_id = auth.uid()
      WHERE dv.id = message_validation.demande_validation_id
      AND (dv.demandeur_id = au.id OR dv.validateur_id = au.id OR dv.transferee_vers = au.id)
      AND auteur_id = au.id
    )
  );

-- Policy: Les participants peuvent mettre à jour les messages (pour marquer comme lu)
CREATE POLICY "Participants can update messages"
  ON message_validation
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM demande_validation dv
      INNER JOIN app_utilisateur au ON au.auth_user_id = auth.uid()
      WHERE dv.id = message_validation.demande_validation_id
      AND (dv.demandeur_id = au.id OR dv.validateur_id = au.id OR dv.transferee_vers = au.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM demande_validation dv
      INNER JOIN app_utilisateur au ON au.auth_user_id = auth.uid()
      WHERE dv.id = message_validation.demande_validation_id
      AND (dv.demandeur_id = au.id OR dv.validateur_id = au.id OR dv.transferee_vers = au.id)
    )
  );

-- =====================================================
-- 4. VUE: validations_avec_details
-- =====================================================

CREATE OR REPLACE VIEW validations_avec_details AS
SELECT
  dv.id,
  dv.demande_id,
  dv.demandeur_id,
  dv.validateur_id,
  dv.type_action,
  dv.priorite,
  dv.statut,
  dv.message_demande,
  dv.commentaire_validateur,
  dv.created_at,
  dv.responded_at,
  dv.transferee_vers,
  dv.raison_transfert,
  dv.updated_at,

  -- Info demande
  ds.type_demande,
  ds.description as demande_description,
  ds.statut as demande_statut,
  ds.nom_salarie,
  ds.prenom_salarie,
  ds.matricule_salarie,

  -- Info demandeur
  au_demandeur.email as demandeur_email,
  au_demandeur.nom as demandeur_nom,
  au_demandeur.prenom as demandeur_prenom,

  -- Info validateur
  au_validateur.email as validateur_email,
  au_validateur.nom as validateur_nom,
  au_validateur.prenom as validateur_prenom,

  -- Nombre de messages non lus pour le validateur
  COALESCE(
    (SELECT COUNT(*) FROM message_validation mv
     WHERE mv.demande_validation_id = dv.id
     AND mv.lu = false
     AND mv.auteur_id = dv.demandeur_id),
    0
  ) as messages_non_lus_validateur,

  -- Nombre de messages non lus pour le demandeur
  COALESCE(
    (SELECT COUNT(*) FROM message_validation mv
     WHERE mv.demande_validation_id = dv.id
     AND mv.lu = false
     AND mv.auteur_id = dv.validateur_id),
    0
  ) as messages_non_lus_demandeur

FROM demande_validation dv
INNER JOIN demande_standard ds ON ds.id = dv.demande_id
INNER JOIN app_utilisateur au_demandeur ON au_demandeur.id = dv.demandeur_id
LEFT JOIN app_utilisateur au_validateur ON au_validateur.id = dv.validateur_id;

-- =====================================================
-- 5. FONCTION: Trigger updated_at
-- =====================================================

-- Trigger pour demande_validation
DROP TRIGGER IF EXISTS update_demande_validation_updated_at ON demande_validation;
CREATE TRIGGER update_demande_validation_updated_at
  BEFORE UPDATE ON demande_validation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. FONCTION: Statistiques des validations
-- =====================================================

CREATE OR REPLACE FUNCTION get_validations_stats()
RETURNS TABLE (
  total_en_attente BIGINT,
  total_approuvees BIGINT,
  total_rejetees BIGINT,
  total_urgentes_en_attente BIGINT,
  total_avec_messages_non_lus BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE statut = 'en_attente') as total_en_attente,
    COUNT(*) FILTER (WHERE statut = 'approuvee') as total_approuvees,
    COUNT(*) FILTER (WHERE statut = 'rejetee') as total_rejetees,
    COUNT(*) FILTER (WHERE statut = 'en_attente' AND priorite = 'urgente') as total_urgentes_en_attente,
    COUNT(DISTINCT dv.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM message_validation mv
        WHERE mv.demande_validation_id = dv.id
        AND mv.lu = false
      )
    ) as total_avec_messages_non_lus
  FROM demande_validation dv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FONCTION: Marquer messages comme lus
-- =====================================================

CREATE OR REPLACE FUNCTION marquer_messages_lus(p_demande_validation_id UUID, p_utilisateur_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE message_validation
  SET lu = true
  WHERE demande_validation_id = p_demande_validation_id
  AND auteur_id != p_utilisateur_id
  AND lu = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. COMMENTAIRES (Documentation)
-- =====================================================

COMMENT ON TABLE demande_validation IS 'Demandes de validation faites par les standardistes aux RH/admins';
COMMENT ON TABLE message_validation IS 'Messages de conversation entre demandeur et validateur';
COMMENT ON VIEW validations_avec_details IS 'Vue complète des validations avec tous les détails nécessaires';
COMMENT ON FUNCTION get_validations_stats IS 'Fonction retournant les statistiques des validations pour le dashboard';
COMMENT ON FUNCTION marquer_messages_lus IS 'Marque tous les messages d''une validation comme lus pour un utilisateur';

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
