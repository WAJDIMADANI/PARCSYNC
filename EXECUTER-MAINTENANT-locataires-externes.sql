/*
  # Système de locataires externes avec carnet d'adresses et historique

  1. Nouvelles tables
    - `locataire_externe` : Carnet d'adresses des locataires externes (personnes et entreprises)
    - `locataire_externe_history` : Historique des modifications des locataires externes

  2. Modifications de la table `attribution_vehicule`
    - Rendre profil_id nullable
    - Ajouter locataire_externe_id nullable
    - Ajouter date_fin optionnelle pour les locations temporaires
    - Ajouter contraintes CHECK

  3. Mise à jour de la vue `v_vehicles_list`
    - Inclure les locataires externes dans chauffeurs_actifs

  4. Sécurité
    - Enable RLS sur toutes les nouvelles tables
    - Policies pour authenticated users
    - Triggers pour historique automatique
*/

-- ============================================
-- 1. CRÉER LA TABLE LOCATAIRE_EXTERNE
-- ============================================

CREATE TABLE IF NOT EXISTS locataire_externe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('personne', 'entreprise')),
  nom text NOT NULL,
  telephone text,
  email text,
  adresse text,
  notes text,
  actif boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_locataire_externe_nom ON locataire_externe(nom);
CREATE INDEX IF NOT EXISTS idx_locataire_externe_type_actif ON locataire_externe(type, actif);
CREATE INDEX IF NOT EXISTS idx_locataire_externe_actif ON locataire_externe(actif);

-- ============================================
-- 2. CRÉER LA TABLE LOCATAIRE_EXTERNE_HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS locataire_externe_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locataire_externe_id uuid NOT NULL REFERENCES locataire_externe(id) ON DELETE CASCADE,
  type text NOT NULL,
  nom text NOT NULL,
  telephone text,
  email text,
  adresse text,
  notes text,
  changed_by_user_id uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour récupération rapide de l'historique
CREATE INDEX IF NOT EXISTS idx_locataire_externe_history_locataire_id
  ON locataire_externe_history(locataire_externe_id, changed_at DESC);

-- ============================================
-- 3. TRIGGERS POUR L'HISTORIQUE
-- ============================================

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_locataire_externe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_locataire_externe_updated_at ON locataire_externe;
CREATE TRIGGER trigger_update_locataire_externe_updated_at
  BEFORE UPDATE ON locataire_externe
  FOR EACH ROW
  EXECUTE FUNCTION update_locataire_externe_updated_at();

-- Trigger pour créer automatiquement une entrée d'historique lors d'une mise à jour
CREATE OR REPLACE FUNCTION create_locataire_externe_history_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Enregistrer l'ancienne version dans l'historique
  INSERT INTO locataire_externe_history (
    locataire_externe_id,
    type,
    nom,
    telephone,
    email,
    adresse,
    notes,
    changed_by_user_id,
    changed_at
  ) VALUES (
    OLD.id,
    OLD.type,
    OLD.nom,
    OLD.telephone,
    OLD.email,
    OLD.adresse,
    OLD.notes,
    auth.uid(),
    OLD.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_locataire_externe_history ON locataire_externe;
CREATE TRIGGER trigger_create_locataire_externe_history
  AFTER UPDATE ON locataire_externe
  FOR EACH ROW
  WHEN (
    OLD.type IS DISTINCT FROM NEW.type OR
    OLD.nom IS DISTINCT FROM NEW.nom OR
    OLD.telephone IS DISTINCT FROM NEW.telephone OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.adresse IS DISTINCT FROM NEW.adresse OR
    OLD.notes IS DISTINCT FROM NEW.notes
  )
  EXECUTE FUNCTION create_locataire_externe_history_entry();

-- ============================================
-- 4. MODIFIER LA TABLE ATTRIBUTION_VEHICULE
-- ============================================

-- Rendre profil_id nullable
ALTER TABLE attribution_vehicule
  ALTER COLUMN profil_id DROP NOT NULL;

-- Ajouter locataire_externe_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attribution_vehicule' AND column_name = 'locataire_externe_id'
  ) THEN
    ALTER TABLE attribution_vehicule
      ADD COLUMN locataire_externe_id uuid REFERENCES locataire_externe(id);
  END IF;
END $$;

-- Ajouter date_fin optionnelle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attribution_vehicule' AND column_name = 'date_fin'
  ) THEN
    ALTER TABLE attribution_vehicule
      ADD COLUMN date_fin date;
  END IF;
END $$;

-- Supprimer l'ancienne contrainte CHECK sur type_attribution si elle existe
DO $$
BEGIN
  ALTER TABLE attribution_vehicule
    DROP CONSTRAINT IF EXISTS attribution_vehicule_type_attribution_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Ajouter une contrainte CHECK pour s'assurer que soit profil_id soit locataire_externe_id est rempli
DO $$
BEGIN
  ALTER TABLE attribution_vehicule
    DROP CONSTRAINT IF EXISTS check_either_profil_or_locataire_externe;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE attribution_vehicule
  ADD CONSTRAINT check_either_profil_or_locataire_externe
  CHECK (
    (profil_id IS NOT NULL AND locataire_externe_id IS NULL) OR
    (profil_id IS NULL AND locataire_externe_id IS NOT NULL)
  );

-- Ajouter une contrainte pour que date_fin soit après date_debut
DO $$
BEGIN
  ALTER TABLE attribution_vehicule
    DROP CONSTRAINT IF EXISTS check_date_fin_after_date_debut;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE attribution_vehicule
  ADD CONSTRAINT check_date_fin_after_date_debut
  CHECK (date_fin IS NULL OR date_fin >= date_debut);

-- Index pour locataire_externe_id
CREATE INDEX IF NOT EXISTS idx_attribution_vehicule_locataire_externe_id
  ON attribution_vehicule(locataire_externe_id);

-- ============================================
-- 5. RECRÉER LA VUE V_VEHICLES_LIST
-- ============================================

DROP VIEW IF EXISTS v_vehicles_list CASCADE;

CREATE VIEW v_vehicles_list AS
SELECT
  v.id,
  v.immatriculation,
  v.marque,
  v.modele,
  v.date_mise_circulation,
  v.type_vehicule,
  v.statut,
  v.kilometrage_actuel,
  v.created_at,
  v.updated_at,

  -- Propriétaire/Loueur
  CASE
    WHEN v.proprietaire_id IS NOT NULL THEN 'TCA'
    WHEN v.loueur_id IS NOT NULL THEN 'Loueur'
    ELSE NULL
  END as type_propriete,

  COALESCE(
    prop.prenom || ' ' || prop.nom,
    loueur.nom
  ) as nom_proprietaire_loueur,

  -- Chauffeurs actifs (incluant locataires externes)
  (
    SELECT json_agg(
      json_build_object(
        'id', av.id,
        'type_locataire',
          CASE
            WHEN av.profil_id IS NOT NULL THEN 'salarie'
            WHEN le.type = 'personne' THEN 'personne_externe'
            WHEN le.type = 'entreprise' THEN 'entreprise_externe'
            ELSE NULL
          END,
        'type_attribution', av.type_attribution,
        'profil_id', p.id,
        'nom', COALESCE(p.nom, le.nom),
        'prenom', p.prenom,
        'matricule', p.matricule,
        'telephone', COALESCE(p.telephone_portable, le.telephone),
        'email', COALESCE(p.email, le.email),
        'adresse', le.adresse,
        'date_debut', av.date_debut,
        'date_fin', av.date_fin,
        'notes', av.notes,
        'locataire_externe_id', le.id,
        'loueur_nom', l.nom
      )
    )
    FROM attribution_vehicule av
    LEFT JOIN profil p ON av.profil_id = p.id
    LEFT JOIN locataire_externe le ON av.locataire_externe_id = le.id
    LEFT JOIN profil l ON av.loueur_id = l.id
    WHERE av.vehicule_id = v.id
      AND av.date_debut <= CURRENT_DATE
      AND (av.date_fin IS NULL OR av.date_fin >= CURRENT_DATE)
  ) as chauffeurs_actifs,

  -- Nombre de chauffeurs actifs
  (
    SELECT COUNT(*)
    FROM attribution_vehicule av
    WHERE av.vehicule_id = v.id
      AND av.date_debut <= CURRENT_DATE
      AND (av.date_fin IS NULL OR av.date_fin >= CURRENT_DATE)
  ) as nb_chauffeurs_actifs,

  -- Dernier kilométrage
  (
    SELECT kilometrage
    FROM historique_kilometrage hk
    WHERE hk.vehicule_id = v.id
    ORDER BY date_relevee DESC, created_at DESC
    LIMIT 1
  ) as dernier_kilometrage

FROM vehicule v
LEFT JOIN profil prop ON v.proprietaire_id = prop.id
LEFT JOIN profil loueur ON v.loueur_id = loueur.id;

-- ============================================
-- 6. ENABLE RLS SUR LES NOUVELLES TABLES
-- ============================================

ALTER TABLE locataire_externe ENABLE ROW LEVEL SECURITY;
ALTER TABLE locataire_externe_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. POLICIES POUR LOCATAIRE_EXTERNE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view locataires externes" ON locataire_externe;
CREATE POLICY "Authenticated users can view locataires externes"
  ON locataire_externe FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create locataires externes" ON locataire_externe;
CREATE POLICY "Authenticated users can create locataires externes"
  ON locataire_externe FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update locataires externes" ON locataire_externe;
CREATE POLICY "Authenticated users can update locataires externes"
  ON locataire_externe FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete locataires externes" ON locataire_externe;
CREATE POLICY "Authenticated users can delete locataires externes"
  ON locataire_externe FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 8. POLICIES POUR LOCATAIRE_EXTERNE_HISTORY
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view locataires externes history" ON locataire_externe_history;
CREATE POLICY "Authenticated users can view locataires externes history"
  ON locataire_externe_history FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "System can create locataires externes history" ON locataire_externe_history;
CREATE POLICY "System can create locataires externes history"
  ON locataire_externe_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
