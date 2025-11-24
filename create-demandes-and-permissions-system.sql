/*
  # Système de Demandes Standardistes et Gestion des Permissions

  1. Nouvelles Tables
    - `app_utilisateur`
      - Stocke les utilisateurs internes de l'application (standardistes, RH, admins)
      - Colonnes : id, auth_user_id, email, nom, prenom, actif, created_at, updated_at
      - Lié à auth.users pour l'authentification Supabase

    - `utilisateur_permissions`
      - Stocke les permissions granulaires par section pour chaque utilisateur
      - Colonnes : id, utilisateur_id, section_id, actif
      - section_id correspond aux vues de la Sidebar (ex: 'rh/salaries', 'rh/demandes')
      - Permet de cocher quelles sections chaque utilisateur peut voir

    - `demande_standard`
      - Stocke les demandes créées par les standardistes lors des appels téléphoniques
      - Colonnes principales : type_demande, description, priorite, statut
      - Colonnes salarié : nom_salarie, prenom_salarie, tel_salarie, matricule_salarie, email_salarie
      - Colonnes traçabilité : created_by, created_at, assigned_to, treated_by, treated_at
      - Permet de lier ou non à un profil existant (profil_id nullable)

  2. Vue
    - `utilisateur_avec_permissions`
      - Facilite la récupération d'un utilisateur avec toutes ses permissions en une requête
      - Retourne : id, email, nom, prenom, actif, permissions (array)

  3. Sécurité (RLS)
    - Enable RLS sur toutes les tables
    - app_utilisateur : SELECT pour authentifiés, INSERT/UPDATE/DELETE pour admins
    - utilisateur_permissions : SELECT pour authentifiés
    - demande_standard : Accès basé sur la permission 'rh/demandes'

  4. Index
    - Index sur auth_user_id, utilisateur_id, section_id pour performances optimales

  Notes importantes :
    - Ce système remplace les rôles fixes par un système de permissions granulaires
    - L'admin peut cocher individuellement chaque section accessible pour chaque utilisateur
    - Un utilisateur peut avoir uniquement 'rh/salaries' + 'rh/demandes' (profil standardiste)
    - Un autre peut avoir toutes les permissions RH (profil RH complet)
    - Système évolutif : facile d'ajouter de nouvelles sections/permissions
*/

-- =====================================================
-- 1. TABLE: app_utilisateur
-- =====================================================

CREATE TABLE IF NOT EXISTS app_utilisateur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_app_utilisateur_auth_user_id ON app_utilisateur(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_app_utilisateur_email ON app_utilisateur(email);
CREATE INDEX IF NOT EXISTS idx_app_utilisateur_actif ON app_utilisateur(actif);

-- Enable RLS
ALTER TABLE app_utilisateur ENABLE ROW LEVEL SECURITY;

-- Policy: Tous les utilisateurs authentifiés peuvent voir les utilisateurs
CREATE POLICY "Authenticated users can view users"
  ON app_utilisateur
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 2. TABLE: utilisateur_permissions
-- =====================================================

CREATE TABLE IF NOT EXISTS utilisateur_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID NOT NULL REFERENCES app_utilisateur(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(utilisateur_id, section_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_utilisateur_permissions_utilisateur_id ON utilisateur_permissions(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_utilisateur_permissions_section_id ON utilisateur_permissions(section_id);
CREATE INDEX IF NOT EXISTS idx_utilisateur_permissions_actif ON utilisateur_permissions(actif);

-- Enable RLS
ALTER TABLE utilisateur_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs authentifiés peuvent voir toutes les permissions
CREATE POLICY "Authenticated users can view all permissions"
  ON utilisateur_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 3. TABLE: demande_standard
-- =====================================================

-- Type enum pour le statut
DO $$ BEGIN
  CREATE TYPE demande_statut AS ENUM ('en_attente', 'en_cours', 'traitee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Type enum pour la priorité
DO $$ BEGIN
  CREATE TYPE demande_priorite AS ENUM ('normale', 'urgente');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS demande_standard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lien vers le profil salarié (nullable si salarié non trouvé)
  profil_id UUID REFERENCES profil(id) ON DELETE SET NULL,

  -- Informations salarié (remplies manuellement si profil_id null)
  nom_salarie TEXT,
  prenom_salarie TEXT,
  tel_salarie TEXT,
  matricule_salarie TEXT,
  email_salarie TEXT,

  -- Détails de la demande
  type_demande TEXT NOT NULL,
  description TEXT NOT NULL,
  priorite demande_priorite DEFAULT 'normale',
  statut demande_statut DEFAULT 'en_attente',

  -- Traçabilité
  created_by UUID NOT NULL REFERENCES app_utilisateur(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Gestion par RH
  assigned_to UUID REFERENCES app_utilisateur(id) ON DELETE SET NULL,
  treated_by UUID REFERENCES app_utilisateur(id) ON DELETE SET NULL,
  treated_at TIMESTAMPTZ,

  -- Résolution
  notes_resolution TEXT,

  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_demande_standard_profil_id ON demande_standard(profil_id);
CREATE INDEX IF NOT EXISTS idx_demande_standard_statut ON demande_standard(statut);
CREATE INDEX IF NOT EXISTS idx_demande_standard_priorite ON demande_standard(priorite);
CREATE INDEX IF NOT EXISTS idx_demande_standard_created_by ON demande_standard(created_by);
CREATE INDEX IF NOT EXISTS idx_demande_standard_created_at ON demande_standard(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demande_standard_assigned_to ON demande_standard(assigned_to);
CREATE INDEX IF NOT EXISTS idx_demande_standard_treated_by ON demande_standard(treated_by);

-- Enable RLS
ALTER TABLE demande_standard ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs avec permission 'rh/demandes' peuvent voir toutes les demandes
CREATE POLICY "Users with rh/demandes permission can view demands"
  ON demande_standard
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'rh/demandes'
      AND up.actif = true
    )
  );

-- Policy: Les utilisateurs avec permission 'rh/demandes' peuvent créer des demandes
CREATE POLICY "Users with rh/demandes permission can create demands"
  ON demande_standard
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'rh/demandes'
      AND up.actif = true
      AND created_by = au.id
    )
  );

-- Policy: Les utilisateurs avec permission 'rh/demandes' peuvent mettre à jour les demandes
CREATE POLICY "Users with rh/demandes permission can update demands"
  ON demande_standard
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'rh/demandes'
      AND up.actif = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'rh/demandes'
      AND up.actif = true
    )
  );

-- =====================================================
-- 4. VUE: utilisateur_avec_permissions
-- =====================================================

CREATE OR REPLACE VIEW utilisateur_avec_permissions AS
SELECT
  au.id,
  au.auth_user_id,
  au.email,
  au.nom,
  au.prenom,
  au.actif,
  au.created_at,
  au.updated_at,
  COALESCE(
    array_agg(up.section_id) FILTER (WHERE up.actif = true AND up.section_id IS NOT NULL),
    ARRAY[]::text[]
  ) as permissions
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
GROUP BY au.id, au.auth_user_id, au.email, au.nom, au.prenom, au.actif, au.created_at, au.updated_at;

-- =====================================================
-- 5. FONCTION: Mise à jour automatique updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour app_utilisateur
DROP TRIGGER IF EXISTS update_app_utilisateur_updated_at ON app_utilisateur;
CREATE TRIGGER update_app_utilisateur_updated_at
  BEFORE UPDATE ON app_utilisateur
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour demande_standard
DROP TRIGGER IF EXISTS update_demande_standard_updated_at ON demande_standard;
CREATE TRIGGER update_demande_standard_updated_at
  BEFORE UPDATE ON demande_standard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. FONCTION: Récupérer les statistiques des demandes
-- =====================================================

CREATE OR REPLACE FUNCTION get_demandes_stats()
RETURNS TABLE (
  total_en_attente BIGINT,
  total_en_cours BIGINT,
  total_traitees BIGINT,
  total_urgentes_en_attente BIGINT,
  total_du_jour BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE statut = 'en_attente') as total_en_attente,
    COUNT(*) FILTER (WHERE statut = 'en_cours') as total_en_cours,
    COUNT(*) FILTER (WHERE statut = 'traitee') as total_traitees,
    COUNT(*) FILTER (WHERE statut = 'en_attente' AND priorite = 'urgente') as total_urgentes_en_attente,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as total_du_jour
  FROM demande_standard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. COMMENTAIRES (Documentation)
-- =====================================================

COMMENT ON TABLE app_utilisateur IS 'Utilisateurs internes de l''application avec authentification Supabase';
COMMENT ON TABLE utilisateur_permissions IS 'Permissions granulaires par section pour chaque utilisateur';
COMMENT ON TABLE demande_standard IS 'Demandes créées par les standardistes lors des appels téléphoniques des salariés';
COMMENT ON VIEW utilisateur_avec_permissions IS 'Vue facilitant la récupération d''un utilisateur avec toutes ses permissions';
COMMENT ON FUNCTION get_demandes_stats IS 'Fonction retournant les statistiques des demandes pour le dashboard';

-- =====================================================
-- 8. POLICIES ADMIN (à ajouter après création des tables)
-- =====================================================

-- Policy: Seuls les admins peuvent créer/modifier/supprimer des utilisateurs
CREATE POLICY "Admins can manage users"
  ON app_utilisateur
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'admin/utilisateurs'
      AND up.actif = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'admin/utilisateurs'
      AND up.actif = true
    )
  );

-- Policy: Seuls les admins peuvent gérer les permissions
CREATE POLICY "Admins can manage permissions"
  ON utilisateur_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'admin/utilisateurs'
      AND up.actif = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'admin/utilisateurs'
      AND up.actif = true
    )
  );

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
