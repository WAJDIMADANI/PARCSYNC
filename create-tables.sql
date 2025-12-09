-- Tables de base
CREATE TABLE IF NOT EXISTS site (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS secteur (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  prenom text NOT NULL,
  nom text NOT NULL,
  tel text,
  site_id uuid REFERENCES site(id),
  secteur_id uuid REFERENCES secteur(id),
  pipeline text DEFAULT 'nouveau',
  consent_rgpd_at timestamptz,
  genre text,
  date_naissance date,
  nationalite text,
  adresse text,
  code_postal text,
  ville text,
  date_permis_conduire date,
  cv_url text,
  lettre_motivation_url text,
  carte_identite_recto_url text,
  carte_identite_verso_url text,
  accepte_vivier boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  role text,
  email text NOT NULL,
  prenom text NOT NULL,
  nom text NOT NULL,
  tel text,
  statut text DEFAULT 'actif',
  site_id uuid REFERENCES site(id),
  secteur_id uuid REFERENCES secteur(id),
  manager_id uuid REFERENCES profil(id),
  date_entree date,
  date_sortie date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL,
  owner_id uuid NOT NULL,
  type text NOT NULL,
  fichier_url text,
  date_emission date,
  date_expiration date,
  statut text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contrat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid REFERENCES profil(id) NOT NULL,
  type text NOT NULL,
  date_debut date NOT NULL,
  date_fin date,
  remuneration_brut numeric,
  duree_hebdo_hours numeric,
  pdf_url text,
  esign text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courrier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid REFERENCES profil(id) NOT NULL,
  modele text,
  sujet text NOT NULL,
  body_md text,
  pdf_url text,
  canal text,
  status text DEFAULT 'sent',
  sent_to text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  cible_type text,
  cible_id uuid,
  message text NOT NULL,
  niveau text DEFAULT 'info',
  echeance date,
  statut text DEFAULT 'active',
  assignee_id uuid REFERENCES profil(id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE site ENABLE ROW LEVEL SECURITY;
ALTER TABLE secteur ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidat ENABLE ROW LEVEL SECURITY;
ALTER TABLE profil ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrat ENABLE ROW LEVEL SECURITY;
ALTER TABLE courrier ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerte ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for authenticated users)
CREATE POLICY "auth_all" ON site FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON secteur FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON candidat FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON profil FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON document FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON contrat FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON courrier FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON alerte FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public to read sites and secteurs (for /apply form)
CREATE POLICY "public_read_sites" ON site FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_secteurs" ON secteur FOR SELECT TO anon USING (true);

-- Allow public to insert candidates (for /apply form)
CREATE POLICY "public_insert_candidat" ON candidat FOR INSERT TO anon WITH CHECK (true);

-- Views
CREATE OR REPLACE VIEW v_docs_expirant AS
SELECT id, owner_type, owner_id, type, date_expiration, statut,
  (date_expiration - CURRENT_DATE) as jours_restants
FROM document
WHERE date_expiration IS NOT NULL
  AND date_expiration < CURRENT_DATE + INTERVAL '45 days'
  AND date_expiration >= CURRENT_DATE;

CREATE OR REPLACE VIEW v_contrats_cdd_fin AS
SELECT
  c.id,
  c.profil_id,
  c.type,
  c.date_fin,
  (c.date_fin - CURRENT_DATE) as jours_restants,
  p.nom,
  p.prenom,
  p.email,
  s.nom as secteur_nom
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
LEFT JOIN secteur s ON p.secteur_id = s.id
WHERE c.type = 'cdd'
  AND c.date_fin IS NOT NULL
  AND c.date_fin < CURRENT_DATE + INTERVAL '30 days'
  AND c.date_fin >= CURRENT_DATE;

-- Table vehicule
CREATE TABLE IF NOT EXISTS vehicule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation text UNIQUE NOT NULL,
  marque text,
  modele text,
  annee integer,
  type text,
  statut text DEFAULT 'actif',
  date_mise_en_service date,
  date_fin_service date,
  conducteur_actuel_id uuid REFERENCES profil(id),
  site_id uuid REFERENCES site(id),
  created_at timestamptz DEFAULT now()
);

-- Table carburant
CREATE TABLE IF NOT EXISTS carburant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid REFERENCES vehicule(id) NOT NULL,
  conducteur_id uuid REFERENCES profil(id) NOT NULL,
  date_plein date NOT NULL,
  litres numeric,
  montant numeric,
  kilometrage integer,
  station text,
  type_carburant text,
  facture_url text,
  created_at timestamptz DEFAULT now()
);

-- Table amende
CREATE TABLE IF NOT EXISTS amende (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid REFERENCES vehicule(id) NOT NULL,
  conducteur_id uuid REFERENCES profil(id),
  date_infraction date NOT NULL,
  type_infraction text NOT NULL,
  montant numeric NOT NULL,
  points_permis integer DEFAULT 0,
  lieu text,
  statut text DEFAULT 'pending',
  date_paiement date,
  pris_en_charge_par text,
  numero_avis text,
  document_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS for new tables
ALTER TABLE vehicule ENABLE ROW LEVEL SECURITY;
ALTER TABLE carburant ENABLE ROW LEVEL SECURITY;
ALTER TABLE amende ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON vehicule FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON carburant FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON amende FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Views for monitoring
CREATE OR REPLACE VIEW v_vehicules_actifs AS
SELECT v.*,
  p.prenom || ' ' || p.nom as conducteur_nom,
  s.nom as site_nom
FROM vehicule v
LEFT JOIN profil p ON v.conducteur_actuel_id = p.id
LEFT JOIN site s ON v.site_id = s.id
WHERE v.statut = 'actif';

CREATE OR REPLACE VIEW v_amendes_impayees AS
SELECT a.*,
  v.immatriculation,
  v.marque,
  v.modele,
  p.prenom || ' ' || p.nom as conducteur_nom
FROM amende a
JOIN vehicule v ON a.vehicule_id = v.id
LEFT JOIN profil p ON a.conducteur_id = p.id
WHERE a.statut IN ('pending', 'contestee')
ORDER BY a.date_infraction DESC;

-- Test data
INSERT INTO site (nom) VALUES ('Siège Paris'), ('Agence Lyon'), ('Agence Marseille') ON CONFLICT DO NOTHING;
INSERT INTO secteur (nom) VALUES ('Administration'), ('Commercial'), ('Technique'), ('Logistique') ON CONFLICT DO NOTHING;
