/*
  # Système d'historique et gestion des départs des employés

  1. Nouvelles colonnes dans profil
    - motif_depart : raison du départ (démission, licenciement, etc.)
    - commentaire_depart : notes internes sur le départ
    - checklist_depart : JSON avec le statut des tâches de sortie

  2. Nouvelle table employee_events
    - Trace tous les événements importants dans la vie du salarié
    - Types : embauche, changement_poste, changement_site, changement_salaire, promotion, depart

  3. Vue pour documents par employé
    - v_employee_documents : tous les documents d'un employé

  4. Vue pour historique complet
    - v_employee_timeline : chronologie complète des événements
*/

-- Ajouter les nouvelles colonnes à profil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'motif_depart'
  ) THEN
    ALTER TABLE profil ADD COLUMN motif_depart text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'commentaire_depart'
  ) THEN
    ALTER TABLE profil ADD COLUMN commentaire_depart text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'checklist_depart'
  ) THEN
    ALTER TABLE profil ADD COLUMN checklist_depart jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'adresse'
  ) THEN
    ALTER TABLE profil ADD COLUMN adresse text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'complement_adresse'
  ) THEN
    ALTER TABLE profil ADD COLUMN complement_adresse text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'code_postal'
  ) THEN
    ALTER TABLE profil ADD COLUMN code_postal text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'ville'
  ) THEN
    ALTER TABLE profil ADD COLUMN ville text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'date_naissance'
  ) THEN
    ALTER TABLE profil ADD COLUMN date_naissance date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'nationalite'
  ) THEN
    ALTER TABLE profil ADD COLUMN nationalite text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'date_permis_conduire'
  ) THEN
    ALTER TABLE profil ADD COLUMN date_permis_conduire date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'iban'
  ) THEN
    ALTER TABLE profil ADD COLUMN iban text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'bic'
  ) THEN
    ALTER TABLE profil ADD COLUMN bic text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'nir'
  ) THEN
    ALTER TABLE profil ADD COLUMN nir text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'permis_categorie'
  ) THEN
    ALTER TABLE profil ADD COLUMN permis_categorie text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'permis_points'
  ) THEN
    ALTER TABLE profil ADD COLUMN permis_points integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'nom_naissance'
  ) THEN
    ALTER TABLE profil ADD COLUMN nom_naissance text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'lieu_naissance'
  ) THEN
    ALTER TABLE profil ADD COLUMN lieu_naissance text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'pays_naissance'
  ) THEN
    ALTER TABLE profil ADD COLUMN pays_naissance text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'genre'
  ) THEN
    ALTER TABLE profil ADD COLUMN genre text;
  END IF;
END $$;

-- Créer la table employee_events pour l'historique
CREATE TABLE IF NOT EXISTS employee_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid REFERENCES profil(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  description text,
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_employee_events_profil_id ON employee_events(profil_id);
CREATE INDEX IF NOT EXISTS idx_employee_events_type ON employee_events(event_type);
CREATE INDEX IF NOT EXISTS idx_employee_events_date ON employee_events(event_date DESC);

-- Vue pour les documents par employé
CREATE OR REPLACE VIEW v_employee_documents AS
SELECT
  d.id,
  d.owner_id as profil_id,
  d.type as type_document,
  d.fichier_url,
  d.date_emission,
  d.date_expiration,
  d.statut,
  d.created_at,
  CASE
    WHEN d.date_expiration IS NULL THEN 'ok'
    WHEN d.date_expiration < CURRENT_DATE THEN 'expire'
    WHEN d.date_expiration < CURRENT_DATE + INTERVAL '30 days' THEN 'bientot_expire'
    ELSE 'ok'
  END as alerte_expiration
FROM document d
WHERE d.owner_type = 'profil';

-- Vue pour la timeline complète d'un employé
CREATE OR REPLACE VIEW v_employee_timeline AS
SELECT
  'event' as source,
  ee.id,
  ee.profil_id,
  ee.event_type as type,
  ee.event_date as date,
  ee.description,
  ee.metadata,
  ee.created_at
FROM employee_events ee
UNION ALL
SELECT
  'contrat' as source,
  c.id,
  c.profil_id,
  'contrat_' || c.type as type,
  c.date_debut as date,
  'Contrat ' || c.type ||
    CASE WHEN c.date_fin IS NOT NULL
    THEN ' jusqu''au ' || to_char(c.date_fin, 'DD/MM/YYYY')
    ELSE ' (CDI)'
    END as description,
  jsonb_build_object(
    'type', c.type,
    'date_debut', c.date_debut,
    'date_fin', c.date_fin,
    'remuneration', c.remuneration_brut
  ) as metadata,
  c.created_at
FROM contrat c
UNION ALL
SELECT
  'courrier' as source,
  co.id,
  co.profil_id,
  'courrier' as type,
  co.sent_at::date as date,
  co.sujet as description,
  jsonb_build_object(
    'modele', co.modele,
    'canal', co.canal,
    'status', co.status
  ) as metadata,
  co.created_at
FROM courrier co
WHERE co.sent_at IS NOT NULL
ORDER BY date DESC, created_at DESC;

-- RLS pour employee_events
ALTER TABLE employee_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_employee_events"
ON employee_events
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Fonction pour créer automatiquement un événement d'embauche
CREATE OR REPLACE FUNCTION create_hire_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO employee_events (
    profil_id,
    event_type,
    event_date,
    description,
    new_value,
    metadata
  ) VALUES (
    NEW.id,
    'embauche',
    COALESCE(NEW.date_entree, CURRENT_DATE),
    'Embauche - ' || NEW.prenom || ' ' || NEW.nom,
    NEW.role,
    jsonb_build_object(
      'site_id', NEW.site_id,
      'secteur_id', NEW.secteur_id,
      'role', NEW.role
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement l'événement d'embauche
DROP TRIGGER IF EXISTS trigger_hire_event ON profil;
CREATE TRIGGER trigger_hire_event
  AFTER INSERT ON profil
  FOR EACH ROW
  EXECUTE FUNCTION create_hire_event();

-- Fonction pour créer automatiquement un événement de départ
CREATE OR REPLACE FUNCTION create_departure_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.statut = 'actif' AND NEW.statut = 'inactif' AND NEW.date_sortie IS NOT NULL THEN
    INSERT INTO employee_events (
      profil_id,
      event_type,
      event_date,
      description,
      old_value,
      new_value,
      metadata
    ) VALUES (
      NEW.id,
      'depart',
      NEW.date_sortie,
      'Départ de ' || NEW.prenom || ' ' || NEW.nom,
      'actif',
      'inactif',
      jsonb_build_object(
        'motif_depart', NEW.motif_depart,
        'commentaire', NEW.commentaire_depart
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement l'événement de départ
DROP TRIGGER IF EXISTS trigger_departure_event ON profil;
CREATE TRIGGER trigger_departure_event
  AFTER UPDATE ON profil
  FOR EACH ROW
  WHEN (OLD.statut IS DISTINCT FROM NEW.statut OR OLD.date_sortie IS DISTINCT FROM NEW.date_sortie)
  EXECUTE FUNCTION create_departure_event();
