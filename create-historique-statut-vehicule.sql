/*
  # Création de la table d'historisation des statuts de véhicules

  1. Nouvelle Table
    - `historique_statut_vehicule`
      - `id` (uuid, primary key)
      - `vehicule_id` (uuid, foreign key vers vehicule)
      - `ancien_statut` (text, nullable pour le premier enregistrement)
      - `nouveau_statut` (text, statut appliqué)
      - `modifie_par` (uuid, foreign key vers app_utilisateur)
      - `date_modification` (timestamptz, date du changement)
      - `commentaire` (text, optionnel)
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS
    - Policies pour lecture (tous utilisateurs authentifiés)
    - Policies pour insertion (via trigger automatique)

  3. Trigger
    - Automatiquement enregistrer chaque changement de statut
*/

-- Créer la table d'historique
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

-- Activer RLS
ALTER TABLE historique_statut_vehicule ENABLE ROW LEVEL SECURITY;

-- Policy de lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent voir l'historique des statuts"
  ON historique_statut_vehicule
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy d'insertion (principalement via trigger)
CREATE POLICY "Système peut insérer dans l'historique des statuts"
  ON historique_statut_vehicule
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_historique_statut_vehicule_vehicule_id
  ON historique_statut_vehicule(vehicule_id);

CREATE INDEX IF NOT EXISTS idx_historique_statut_vehicule_date
  ON historique_statut_vehicule(date_modification DESC);

-- Fonction trigger pour historiser les changements de statut
CREATE OR REPLACE FUNCTION trigger_historiser_statut_vehicule()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le statut a changé
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

  -- Si c'est une nouvelle insertion, enregistrer le statut initial
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

-- Créer le trigger
DROP TRIGGER IF EXISTS trg_historiser_statut_vehicule ON vehicule;
CREATE TRIGGER trg_historiser_statut_vehicule
  AFTER INSERT OR UPDATE OF statut ON vehicule
  FOR EACH ROW
  EXECUTE FUNCTION trigger_historiser_statut_vehicule();

-- Créer une vue pour faciliter la lecture de l'historique
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

-- Grant permissions sur la vue
GRANT SELECT ON v_historique_statut_vehicule TO authenticated;
