/*
  # Extension complète du module véhicule

  1. Nouveaux champs dans la table vehicule
    - reference_tca (référence TCA)
    - date_premiere_mise_en_circulation
    - assurance_type (tca/externe)
    - assurance_compagnie
    - assurance_numero_contrat
    - licence_transport_numero
    - materiel_embarque (JSONB)
    - carte_essence_numero
    - carte_essence_attribuee
    - kilometrage_actuel
    - derniere_maj_kilometrage
    - immat_norm (immatriculation normalisée)
    - photo_path (chemin photo stockage)

  2. Nouvelle table document_vehicule
    - Stockage des documents (carte grise, assurance, RIS, etc.)

  3. Nouvelle table historique_kilometrage
    - Suivi de l'évolution du kilométrage

  4. Vues et index optimisés
*/

-- Ajouter les nouveaux champs à la table vehicule
ALTER TABLE vehicule
ADD COLUMN IF NOT EXISTS reference_tca text,
ADD COLUMN IF NOT EXISTS immat_norm text,
ADD COLUMN IF NOT EXISTS date_premiere_mise_en_circulation date,
ADD COLUMN IF NOT EXISTS assurance_type text DEFAULT 'tca',
ADD COLUMN IF NOT EXISTS assurance_compagnie text,
ADD COLUMN IF NOT EXISTS assurance_numero_contrat text,
ADD COLUMN IF NOT EXISTS licence_transport_numero text,
ADD COLUMN IF NOT EXISTS materiel_embarque jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS carte_essence_numero text,
ADD COLUMN IF NOT EXISTS carte_essence_attribuee boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kilometrage_actuel integer,
ADD COLUMN IF NOT EXISTS derniere_maj_kilometrage date,
ADD COLUMN IF NOT EXISTS photo_path text;

-- Créer une contrainte pour assurance_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicule_assurance_type_check'
  ) THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_assurance_type_check
    CHECK (assurance_type IN ('tca', 'externe'));
  END IF;
END $$;

-- Créer la table document_vehicule
CREATE TABLE IF NOT EXISTS document_vehicule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid REFERENCES vehicule(id) ON DELETE CASCADE NOT NULL,
  type_document text NOT NULL,
  nom_fichier text NOT NULL,
  fichier_url text NOT NULL,
  date_emission date,
  date_expiration date,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contrainte pour type_document
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_vehicule_type_check'
  ) THEN
    ALTER TABLE document_vehicule
    ADD CONSTRAINT document_vehicule_type_check
    CHECK (type_document IN ('carte_grise', 'assurance', 'carte_ris', 'controle_technique', 'autre'));
  END IF;
END $$;

-- Créer la table historique_kilometrage
CREATE TABLE IF NOT EXISTS historique_kilometrage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid REFERENCES vehicule(id) ON DELETE CASCADE NOT NULL,
  date_releve date NOT NULL,
  kilometrage integer NOT NULL,
  source text DEFAULT 'manuel',
  saisi_par uuid REFERENCES profil(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Contrainte pour source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'historique_kilometrage_source_check'
  ) THEN
    ALTER TABLE historique_kilometrage
    ADD CONSTRAINT historique_kilometrage_source_check
    CHECK (source IN ('manuel', 'carburant', 'maintenance'));
  END IF;
END $$;

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_vehicule_reference_tca ON vehicule(reference_tca);
CREATE INDEX IF NOT EXISTS idx_vehicule_immat_norm ON vehicule(immat_norm);
CREATE INDEX IF NOT EXISTS idx_vehicule_statut ON vehicule(statut);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_vehicule_id ON document_vehicule(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_type ON document_vehicule(type_document);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_expiration ON document_vehicule(date_expiration) WHERE date_expiration IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_historique_km_vehicule_id ON historique_kilometrage(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_historique_km_date ON historique_kilometrage(date_releve DESC);

-- RLS pour document_vehicule
ALTER TABLE document_vehicule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicle documents"
  ON document_vehicule FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vehicle documents"
  ON document_vehicule FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicle documents"
  ON document_vehicule FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vehicle documents"
  ON document_vehicule FOR DELETE
  TO authenticated
  USING (true);

-- RLS pour historique_kilometrage
ALTER TABLE historique_kilometrage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view kilometrage history"
  ON historique_kilometrage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert kilometrage"
  ON historique_kilometrage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update kilometrage"
  ON historique_kilometrage FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete kilometrage"
  ON historique_kilometrage FOR DELETE
  TO authenticated
  USING (true);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour document_vehicule
DROP TRIGGER IF EXISTS update_document_vehicule_updated_at ON document_vehicule;
CREATE TRIGGER update_document_vehicule_updated_at
  BEFORE UPDATE ON document_vehicule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vue pour les documents véhicule expirant
CREATE OR REPLACE VIEW v_documents_vehicule_expirant AS
SELECT
  dv.id,
  dv.vehicule_id,
  dv.type_document,
  dv.nom_fichier,
  dv.date_expiration,
  (dv.date_expiration - CURRENT_DATE) as jours_restants,
  v.immatriculation,
  v.marque,
  v.modele,
  v.reference_tca
FROM document_vehicule dv
JOIN vehicule v ON dv.vehicule_id = v.id
WHERE dv.actif = true
  AND dv.date_expiration IS NOT NULL
  AND dv.date_expiration <= CURRENT_DATE + INTERVAL '60 days'
  AND dv.date_expiration >= CURRENT_DATE
ORDER BY dv.date_expiration ASC;

-- Vue enrichie pour la liste des véhicules avec chauffeurs
-- Supprimer l'ancienne vue si elle existe (nécessaire pour changer l'ordre des colonnes)
DROP VIEW IF EXISTS v_vehicles_list CASCADE;

-- Recréer la vue avec la structure correcte
CREATE VIEW v_vehicles_list AS
SELECT
  v.*,
  COALESCE(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'id', av.profil_id,
        'nom', p.nom,
        'prenom', p.prenom,
        'matricule_tca', p.matricule_tca,
        'type_attribution', av.type_attribution,
        'date_debut', av.date_debut,
        'loueur_id', l.id,
        'loueur_nom', l.nom
      )
    ) FILTER (WHERE av.profil_id IS NOT NULL AND av.date_fin IS NULL),
    '[]'::jsonb
  ) as chauffeurs_actifs,
  COUNT(DISTINCT av.profil_id) FILTER (WHERE av.date_fin IS NULL) as nb_chauffeurs_actifs
FROM vehicule v
LEFT JOIN attribution_vehicule av ON v.id = av.vehicule_id AND av.date_fin IS NULL
LEFT JOIN profil p ON av.profil_id = p.id
LEFT JOIN loueur l ON av.loueur_id = l.id
GROUP BY v.id;

-- Fonction pour normaliser l'immatriculation
CREATE OR REPLACE FUNCTION normalize_immatriculation(immat text)
RETURNS text AS $$
BEGIN
  RETURN UPPER(REGEXP_REPLACE(immat, '[^A-Z0-9]', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger pour auto-normaliser l'immatriculation
CREATE OR REPLACE FUNCTION set_normalized_immat()
RETURNS TRIGGER AS $$
BEGIN
  NEW.immat_norm = normalize_immatriculation(NEW.immatriculation);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_vehicule_immat ON vehicule;
CREATE TRIGGER normalize_vehicule_immat
  BEFORE INSERT OR UPDATE OF immatriculation ON vehicule
  FOR EACH ROW
  EXECUTE FUNCTION set_normalized_immat();

-- Vue pour le tableau de bord véhicules
CREATE OR REPLACE VIEW v_vehicules_dashboard AS
SELECT
  v.id,
  v.immatriculation,
  v.reference_tca,
  v.marque,
  v.modele,
  v.annee,
  v.statut,
  v.kilometrage_actuel,
  v.derniere_maj_kilometrage,
  (SELECT COUNT(*) FROM document_vehicule WHERE vehicule_id = v.id AND actif = true) as nb_documents,
  (SELECT COUNT(*) FROM document_vehicule WHERE vehicule_id = v.id AND actif = true AND date_expiration < CURRENT_DATE) as nb_documents_expires,
  (SELECT COUNT(*) FROM document_vehicule WHERE vehicule_id = v.id AND actif = true AND date_expiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as nb_documents_expirant_bientot,
  (SELECT MAX(date_releve) FROM historique_kilometrage WHERE vehicule_id = v.id) as derniere_saisie_km
FROM vehicule v;
