/*
  # Création des tables pour marques et modèles de véhicules

  1. Nouvelles tables
    - `vehicule_marque` - Liste des marques de véhicules
    - `vehicule_modele` - Liste des modèles par marque

  2. Données initiales
    - Marques populaires (Peugeot, Renault, Citroën, etc.)
    - Modèles associés à chaque marque

  3. Sécurité
    - RLS activé pour lecture par tous les utilisateurs authentifiés
*/

-- Créer la table vehicule_marque
CREATE TABLE IF NOT EXISTS vehicule_marque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Créer la table vehicule_modele
CREATE TABLE IF NOT EXISTS vehicule_modele (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marque_id uuid REFERENCES vehicule_marque(id) ON DELETE CASCADE NOT NULL,
  nom text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(marque_id, nom)
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_vehicule_modele_marque_id ON vehicule_modele(marque_id);
CREATE INDEX IF NOT EXISTS idx_vehicule_marque_nom ON vehicule_marque(nom);
CREATE INDEX IF NOT EXISTS idx_vehicule_modele_nom ON vehicule_modele(nom);

-- RLS pour vehicule_marque
ALTER TABLE vehicule_marque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view brands"
  ON vehicule_marque FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert brands"
  ON vehicule_marque FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS pour vehicule_modele
ALTER TABLE vehicule_modele ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view models"
  ON vehicule_modele FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert models"
  ON vehicule_modele FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insérer les marques populaires
INSERT INTO vehicule_marque (nom) VALUES
  ('Peugeot'),
  ('Renault'),
  ('Citroën'),
  ('Volkswagen'),
  ('Mercedes-Benz'),
  ('BMW'),
  ('Audi'),
  ('Ford'),
  ('Opel'),
  ('Fiat'),
  ('Toyota'),
  ('Nissan'),
  ('Hyundai'),
  ('Kia'),
  ('Dacia'),
  ('Seat'),
  ('Skoda'),
  ('Volvo'),
  ('Mazda'),
  ('Honda')
ON CONFLICT (nom) DO NOTHING;

-- Insérer les modèles par marque
DO $$
DECLARE
  marque_id_peugeot uuid;
  marque_id_renault uuid;
  marque_id_citroen uuid;
  marque_id_vw uuid;
  marque_id_mercedes uuid;
  marque_id_ford uuid;
  marque_id_dacia uuid;
BEGIN
  -- Récupérer les IDs des marques
  SELECT id INTO marque_id_peugeot FROM vehicule_marque WHERE nom = 'Peugeot';
  SELECT id INTO marque_id_renault FROM vehicule_marque WHERE nom = 'Renault';
  SELECT id INTO marque_id_citroen FROM vehicule_marque WHERE nom = 'Citroën';
  SELECT id INTO marque_id_vw FROM vehicule_marque WHERE nom = 'Volkswagen';
  SELECT id INTO marque_id_mercedes FROM vehicule_marque WHERE nom = 'Mercedes-Benz';
  SELECT id INTO marque_id_ford FROM vehicule_marque WHERE nom = 'Ford';
  SELECT id INTO marque_id_dacia FROM vehicule_marque WHERE nom = 'Dacia';

  -- Modèles Peugeot
  IF marque_id_peugeot IS NOT NULL THEN
    INSERT INTO vehicule_modele (marque_id, nom) VALUES
      (marque_id_peugeot, '208'),
      (marque_id_peugeot, '308'),
      (marque_id_peugeot, '2008'),
      (marque_id_peugeot, '3008'),
      (marque_id_peugeot, '5008'),
      (marque_id_peugeot, '508'),
      (marque_id_peugeot, 'Partner'),
      (marque_id_peugeot, 'Expert'),
      (marque_id_peugeot, 'Boxer')
    ON CONFLICT (marque_id, nom) DO NOTHING;
  END IF;

  -- Modèles Renault
  IF marque_id_renault IS NOT NULL THEN
    INSERT INTO vehicule_modele (marque_id, nom) VALUES
      (marque_id_renault, 'Clio'),
      (marque_id_renault, 'Captur'),
      (marque_id_renault, 'Mégane'),
      (marque_id_renault, 'Kadjar'),
      (marque_id_renault, 'Scenic'),
      (marque_id_renault, 'Espace'),
      (marque_id_renault, 'Kangoo'),
      (marque_id_renault, 'Trafic'),
      (marque_id_renault, 'Master'),
      (marque_id_renault, 'Twingo'),
      (marque_id_renault, 'Zoe')
    ON CONFLICT (marque_id, nom) DO NOTHING;
  END IF;

  -- Modèles Citroën
  IF marque_id_citroen IS NOT NULL THEN
    INSERT INTO vehicule_modele (marque_id, nom) VALUES
      (marque_id_citroen, 'C3'),
      (marque_id_citroen, 'C4'),
      (marque_id_citroen, 'C5'),
      (marque_id_citroen, 'C3 Aircross'),
      (marque_id_citroen, 'C5 Aircross'),
      (marque_id_citroen, 'Berlingo'),
      (marque_id_citroen, 'Jumpy'),
      (marque_id_citroen, 'Jumper'),
      (marque_id_citroen, 'SpaceTourer')
    ON CONFLICT (marque_id, nom) DO NOTHING;
  END IF;

  -- Modèles Volkswagen
  IF marque_id_vw IS NOT NULL THEN
    INSERT INTO vehicule_modele (marque_id, nom) VALUES
      (marque_id_vw, 'Polo'),
      (marque_id_vw, 'Golf'),
      (marque_id_vw, 'Passat'),
      (marque_id_vw, 'T-Roc'),
      (marque_id_vw, 'Tiguan'),
      (marque_id_vw, 'Touareg'),
      (marque_id_vw, 'Caddy'),
      (marque_id_vw, 'Transporter'),
      (marque_id_vw, 'Crafter')
    ON CONFLICT (marque_id, nom) DO NOTHING;
  END IF;

  -- Modèles Mercedes-Benz
  IF marque_id_mercedes IS NOT NULL THEN
    INSERT INTO vehicule_modele (marque_id, nom) VALUES
      (marque_id_mercedes, 'Classe A'),
      (marque_id_mercedes, 'Classe C'),
      (marque_id_mercedes, 'Classe E'),
      (marque_id_mercedes, 'GLA'),
      (marque_id_mercedes, 'GLC'),
      (marque_id_mercedes, 'GLE'),
      (marque_id_mercedes, 'Vito'),
      (marque_id_mercedes, 'Sprinter')
    ON CONFLICT (marque_id, nom) DO NOTHING;
  END IF;

  -- Modèles Ford
  IF marque_id_ford IS NOT NULL THEN
    INSERT INTO vehicule_modele (marque_id, nom) VALUES
      (marque_id_ford, 'Fiesta'),
      (marque_id_ford, 'Focus'),
      (marque_id_ford, 'Kuga'),
      (marque_id_ford, 'Puma'),
      (marque_id_ford, 'Transit'),
      (marque_id_ford, 'Transit Custom'),
      (marque_id_ford, 'Ranger')
    ON CONFLICT (marque_id, nom) DO NOTHING;
  END IF;

  -- Modèles Dacia
  IF marque_id_dacia IS NOT NULL THEN
    INSERT INTO vehicule_modele (marque_id, nom) VALUES
      (marque_id_dacia, 'Sandero'),
      (marque_id_dacia, 'Duster'),
      (marque_id_dacia, 'Jogger'),
      (marque_id_dacia, 'Logan'),
      (marque_id_dacia, 'Spring')
    ON CONFLICT (marque_id, nom) DO NOTHING;
  END IF;
END $$;
