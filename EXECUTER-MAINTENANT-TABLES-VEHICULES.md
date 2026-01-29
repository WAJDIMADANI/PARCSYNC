# EXÉCUTER MAINTENANT - Créer les tables manquantes

## Étape 1 : Créer la table historique_kilometrage

Copier et exécuter ce SQL dans l'éditeur SQL Supabase :

```sql
/*
  # Create historique_kilometrage table

  1. New Tables
    - `historique_kilometrage`
      - `id` (uuid, primary key)
      - `vehicule_id` (uuid, foreign key to vehicule)
      - `date_releve` (date) - Date of the mileage reading
      - `kilometrage` (integer) - Mileage value
      - `source` (text) - Source of the reading (manuel, automatique, etc.)
      - `notes` (text) - Optional notes
      - `saisi_par` (uuid) - User who entered the data
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `historique_kilometrage` table
    - Add policy for authenticated users to read all records
    - Add policy for authenticated users to insert records
    - Add policy for authenticated users to update their own records

  3. Indexes
    - Index on vehicule_id for faster lookups
    - Index on date_releve for date-based queries
*/

CREATE TABLE IF NOT EXISTS public.historique_kilometrage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES public.vehicule(id) ON DELETE CASCADE,
  date_releve date NOT NULL,
  kilometrage integer NOT NULL,
  source text DEFAULT 'manuel',
  notes text,
  saisi_par uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_historique_kilometrage_vehicule_id ON public.historique_kilometrage(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_historique_kilometrage_date_releve ON public.historique_kilometrage(date_releve);

-- Enable RLS
ALTER TABLE public.historique_kilometrage ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can read all mileage history"
  ON public.historique_kilometrage
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert mileage records"
  ON public.historique_kilometrage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own mileage records"
  ON public.historique_kilometrage
  FOR UPDATE
  TO authenticated
  USING (saisi_par = auth.uid())
  WITH CHECK (saisi_par = auth.uid());
```

## Étape 2 : Créer la table document_vehicule

Copier et exécuter ce SQL dans l'éditeur SQL Supabase :

```sql
/*
  # Create document_vehicule table

  1. New Tables
    - `document_vehicule`
      - `id` (uuid, primary key)
      - `vehicule_id` (uuid, foreign key to vehicule)
      - `type_document` (text) - Type of document (carte_grise, assurance, controle_technique, etc.)
      - `nom_fichier` (text) - Original filename
      - `fichier_url` (text) - Storage path/URL
      - `date_emission` (date) - Issue date
      - `date_expiration` (date) - Expiration date
      - `actif` (boolean) - Whether document is active (for soft delete)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `document_vehicule` table
    - Add policy for authenticated users to read active documents
    - Add policy for authenticated users to insert documents
    - Add policy for authenticated users to update documents (soft delete)

  3. Indexes
    - Index on vehicule_id for faster lookups
    - Index on type_document for filtering by document type
    - Index on date_expiration for expiration checks
*/

CREATE TABLE IF NOT EXISTS public.document_vehicule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES public.vehicule(id) ON DELETE CASCADE,
  type_document text NOT NULL,
  nom_fichier text NOT NULL,
  fichier_url text NOT NULL,
  date_emission date,
  date_expiration date,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_vehicule_vehicule_id ON public.document_vehicule(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_type_document ON public.document_vehicule(type_document);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_date_expiration ON public.document_vehicule(date_expiration);
CREATE INDEX IF NOT EXISTS idx_document_vehicule_actif ON public.document_vehicule(actif);

-- Enable RLS
ALTER TABLE public.document_vehicule ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can read all documents"
  ON public.document_vehicule
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON public.document_vehicule
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
  ON public.document_vehicule
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_vehicule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_vehicule_updated_at_trigger
  BEFORE UPDATE ON public.document_vehicule
  FOR EACH ROW
  EXECUTE FUNCTION update_document_vehicule_updated_at();
```

## Étape 3 : Vérifier que tout fonctionne

Exécuter cette requête pour vérifier :

```sql
-- Vérifier les tables
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as nb_colonnes
FROM information_schema.tables t
WHERE table_name IN ('historique_kilometrage', 'document_vehicule')
  AND table_schema = 'public';

-- Vérifier les policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('historique_kilometrage', 'document_vehicule')
ORDER BY tablename, cmd;
```

Résultat attendu :
- 2 tables créées
- historique_kilometrage : 8 colonnes
- document_vehicule : 10 colonnes
- 3 policies par table (SELECT, INSERT, UPDATE)

## Étape 4 : Tester dans l'application

1. Ouvrir le module Parc Véhicules
2. Créer un nouveau véhicule → plus d'erreur 400/404
3. Modifier un véhicule existant → tous les champs modifiables
4. Uploader un document → plus d'erreur 404
5. Mettre à jour le kilométrage → plus d'erreur 404

## En cas d'erreur

Si une table existe déjà avec un autre schéma, la supprimer d'abord :

```sql
DROP TABLE IF EXISTS public.historique_kilometrage CASCADE;
DROP TABLE IF EXISTS public.document_vehicule CASCADE;
```

Puis réexécuter les scripts de création.
