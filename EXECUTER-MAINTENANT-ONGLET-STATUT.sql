/*
  GUIDE D'EXÉCUTION - Nouvel onglet Statut avec historisation automatique

  Ce script effectue les actions suivantes :
  1. Crée la table d'historisation des statuts de véhicules
  2. Met en place le trigger automatique pour tracer chaque changement
  3. Crée une vue pour faciliter la lecture de l'historique
  4. Supprime le champ date_fin_service (inutilisé)

  À EXÉCUTER DANS SUPABASE SQL EDITOR
*/

-- ========================================
-- ÉTAPE 1 : Créer la table d'historique
-- ========================================

CREATE TABLE IF NOT EXISTS historique_statut_vehicule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES vehicule(id) ON DELETE CASCADE,
  ancien_statut text,
  nouveau_statut text NOT NULL,
  modifie_par uuid REFERENCES app_utilisateur(id),
  date_modification timestamptz DEFAULT now(),
  commentaire text,
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- ÉTAPE 2 : Activer RLS
-- ========================================

ALTER TABLE historique_statut_vehicule ENABLE ROW LEVEL SECURITY;

-- Policy de lecture
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir l'historique des statuts" ON historique_statut_vehicule;
CREATE POLICY "Utilisateurs authentifiés peuvent voir l'historique des statuts"
  ON historique_statut_vehicule
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy d'insertion
DROP POLICY IF EXISTS "Système peut insérer dans l'historique des statuts" ON historique_statut_vehicule;
CREATE POLICY "Système peut insérer dans l'historique des statuts"
  ON historique_statut_vehicule
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ========================================
-- ÉTAPE 3 : Créer les index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_historique_statut_vehicule_vehicule_id
  ON historique_statut_vehicule(vehicule_id);

CREATE INDEX IF NOT EXISTS idx_historique_statut_vehicule_date
  ON historique_statut_vehicule(date_modification DESC);

-- ========================================
-- ÉTAPE 4 : Fonction trigger pour historiser
-- ========================================

CREATE OR REPLACE FUNCTION trigger_historiser_statut_vehicule()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le statut a changé (UPDATE)
  IF (TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut) THEN
    INSERT INTO historique_statut_vehicule (
      vehicule_id,
      ancien_statut,
      nouveau_statut,
      modifie_par,
      date_modification
    ) VALUES (
      NEW.id,
      OLD.statut,
      NEW.statut,
      auth.uid(),
      now()
    );
  END IF;

  -- Si c'est une nouvelle insertion (INSERT)
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO historique_statut_vehicule (
      vehicule_id,
      ancien_statut,
      nouveau_statut,
      modifie_par,
      date_modification
    ) VALUES (
      NEW.id,
      NULL,
      NEW.statut,
      auth.uid(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ÉTAPE 5 : Créer le trigger
-- ========================================

DROP TRIGGER IF EXISTS trg_historiser_statut_vehicule ON vehicule;
CREATE TRIGGER trg_historiser_statut_vehicule
  AFTER INSERT OR UPDATE OF statut ON vehicule
  FOR EACH ROW
  EXECUTE FUNCTION trigger_historiser_statut_vehicule();

-- ========================================
-- ÉTAPE 6 : Créer la vue
-- ========================================

CREATE OR REPLACE VIEW v_historique_statut_vehicule AS
SELECT
  h.id,
  h.vehicule_id,
  v.immatriculation,
  v.reference_tca,
  h.ancien_statut,
  h.nouveau_statut,
  h.date_modification,
  h.commentaire,
  u.prenom || ' ' || u.nom as modifie_par_nom,
  u.email as modifie_par_email,
  h.created_at
FROM historique_statut_vehicule h
LEFT JOIN vehicule v ON h.vehicule_id = v.id
LEFT JOIN app_utilisateur u ON h.modifie_par = u.id
ORDER BY h.date_modification DESC;

-- Grant permissions
GRANT SELECT ON v_historique_statut_vehicule TO authenticated;

-- ========================================
-- ÉTAPE 7 : Supprimer date_fin_service (optionnel)
-- ========================================

-- Note: Cette colonne peut être supprimée si elle n'est plus utilisée
-- Décommenter la ligne suivante si vous voulez la supprimer définitivement :
-- ALTER TABLE vehicule DROP COLUMN IF EXISTS date_fin_service;

-- ========================================
-- ÉTAPE 8 : Initialiser l'historique pour les véhicules existants
-- ========================================

-- Créer un enregistrement initial pour chaque véhicule existant
-- qui n'a pas encore d'historique
INSERT INTO historique_statut_vehicule (
  vehicule_id,
  ancien_statut,
  nouveau_statut,
  date_modification
)
SELECT
  v.id,
  NULL,
  v.statut,
  v.created_at
FROM vehicule v
WHERE NOT EXISTS (
  SELECT 1
  FROM historique_statut_vehicule h
  WHERE h.vehicule_id = v.id
);

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Vérifier que tout fonctionne :
SELECT
  v.immatriculation,
  v.statut as statut_actuel,
  COUNT(h.*) as nb_changements
FROM vehicule v
LEFT JOIN historique_statut_vehicule h ON h.vehicule_id = v.id
GROUP BY v.id, v.immatriculation, v.statut
ORDER BY v.immatriculation
LIMIT 10;

-- Voir l'historique d'un véhicule spécifique (remplacer 'AA-111-BB' par une vraie immat)
-- SELECT * FROM v_historique_statut_vehicule WHERE immatriculation = 'AA-111-BB';
