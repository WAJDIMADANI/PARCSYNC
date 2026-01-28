/*
  # Configuration du stockage pour les documents véhicules

  1. Création du bucket documents-vehicules
  2. Configuration des politiques RLS pour permettre upload et téléchargement
*/

-- Créer le bucket documents-vehicules s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents-vehicules', 'documents-vehicules', false)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux utilisateurs authentifiés de lire les documents
CREATE POLICY IF NOT EXISTS "Authenticated users can view vehicle documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents-vehicules');

-- Politique pour permettre aux utilisateurs authentifiés d'uploader des documents
CREATE POLICY IF NOT EXISTS "Authenticated users can upload vehicle documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents-vehicules');

-- Politique pour permettre aux utilisateurs authentifiés de mettre à jour des documents
CREATE POLICY IF NOT EXISTS "Authenticated users can update vehicle documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents-vehicules')
WITH CHECK (bucket_id = 'documents-vehicules');

-- Politique pour permettre aux utilisateurs authentifiés de supprimer des documents
CREATE POLICY IF NOT EXISTS "Authenticated users can delete vehicle documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents-vehicules');
