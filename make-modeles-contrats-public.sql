/*
  # Rendre le bucket modeles-contrats public

  1. Modifications
    - Rendre le bucket 'modeles-contrats' public pour permettre l'accès aux PDFs
    - Ajouter des policies pour la lecture publique

  2. Sécurité
    - Les fichiers restent en lecture seule pour le public
    - Seuls les utilisateurs authentifiés peuvent uploader/modifier
*/

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'modeles-contrats',
  'modeles-contrats',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id)
DO UPDATE SET public = true;

-- Permettre la lecture publique des fichiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow public read modeles-contrats'
  ) THEN
    CREATE POLICY "Allow public read modeles-contrats"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'modeles-contrats');
  END IF;
END $$;

-- Policy pour l'upload (seulement authentifiés)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated upload modeles-contrats'
  ) THEN
    CREATE POLICY "Allow authenticated upload modeles-contrats"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'modeles-contrats');
  END IF;
END $$;

-- Policy pour la modification (seulement authentifiés)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated update modeles-contrats'
  ) THEN
    CREATE POLICY "Allow authenticated update modeles-contrats"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'modeles-contrats');
  END IF;
END $$;

-- Policy pour la suppression (seulement authentifiés)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated delete modeles-contrats'
  ) THEN
    CREATE POLICY "Allow authenticated delete modeles-contrats"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'modeles-contrats');
  END IF;
END $$;
