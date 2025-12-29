/*
  # Créer et configurer le bucket candidatures

  1. Nouveau bucket de stockage
    - Crée le bucket 'candidatures' s'il n'existe pas
    - Configure comme bucket public
    - Limite de 50MB par fichier
    - Types MIME autorisés : PDF, images, documents Word

  2. Sécurité
    - Politique pour permettre les uploads aux utilisateurs authentifiés
    - Politique pour permettre la lecture publique
    - Politique pour permettre les mises à jour
    - Politique pour permettre les suppressions
*/

-- Créer le bucket candidatures s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidatures',
  'candidatures',
  true,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Allow authenticated uploads candidatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads candidatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates candidatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes candidatures" ON storage.objects;

-- Créer la politique pour les uploads
CREATE POLICY "Allow authenticated uploads candidatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'candidatures');

-- Créer la politique pour la lecture publique
CREATE POLICY "Allow public reads candidatures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'candidatures');

-- Créer la politique pour les mises à jour
CREATE POLICY "Allow authenticated updates candidatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'candidatures')
WITH CHECK (bucket_id = 'candidatures');

-- Créer la politique pour les suppressions
CREATE POLICY "Allow authenticated deletes candidatures"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'candidatures');
