/*
  # Création de la table historique_assurance_vehicule

  1. Nouvelle table
    - `historique_assurance_vehicule`
      - `id` (uuid, primary key)
      - `vehicule_id` (uuid, foreign key vers vehicule)
      - `ancienne_assurance_type` (text)
      - `ancienne_assurance_compagnie` (text)
      - `ancien_assurance_numero_contrat` (text)
      - `nouvelle_assurance_type` (text)
      - `nouvelle_assurance_compagnie` (text)
      - `nouveau_assurance_numero_contrat` (text)
      - `changed_at` (timestamptz)
      - `changed_by` (uuid, référence à auth.users)
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS on `historique_assurance_vehicule`
    - Policy pour permettre la lecture aux utilisateurs authentifiés
    - Policy pour permettre l'insertion aux utilisateurs authentifiés
*/

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS historique_assurance_vehicule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES vehicule(id) ON DELETE CASCADE,
  ancienne_assurance_type text,
  ancienne_assurance_compagnie text,
  ancien_assurance_numero_contrat text,
  nouvelle_assurance_type text,
  nouvelle_assurance_compagnie text,
  nouveau_assurance_numero_contrat text,
  changed_at timestamptz DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE historique_assurance_vehicule ENABLE ROW LEVEL SECURITY;

-- Policy pour la lecture (tous les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent lire historique assurance" ON historique_assurance_vehicule;
CREATE POLICY "Utilisateurs authentifiés peuvent lire historique assurance"
  ON historique_assurance_vehicule
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy pour l'insertion (tous les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent créer historique assurance" ON historique_assurance_vehicule;
CREATE POLICY "Utilisateurs authentifiés peuvent créer historique assurance"
  ON historique_assurance_vehicule
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_historique_assurance_vehicule_vehicule_id
  ON historique_assurance_vehicule(vehicule_id);

CREATE INDEX IF NOT EXISTS idx_historique_assurance_vehicule_changed_at
  ON historique_assurance_vehicule(changed_at DESC);
