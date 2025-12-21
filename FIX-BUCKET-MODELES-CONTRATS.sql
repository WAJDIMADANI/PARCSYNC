/*
  # Fix Bucket modeles-contrats

  ## Problème
  Les modèles de contrats CDI essaient d'accéder au bucket "modeles-contrats"
  qui n'existe pas ou n'est pas public, causant une erreur 400.

  ## Solution
  1. Créer le bucket "modeles-contrats" s'il n'existe pas
  2. Le rendre public
  3. Configurer les permissions
*/

-- 1. Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'modeles-contrats',
  'modeles-contrats',
  true,
  52428800, -- 50 MB
  ARRAY[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/pdf'
  ];

-- 2. Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- 3. Créer les policies pour le bucket modeles-contrats
CREATE POLICY "Public read access for modeles-contrats"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'modeles-contrats');

CREATE POLICY "Authenticated users can upload to modeles-contrats"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'modeles-contrats');

CREATE POLICY "Authenticated users can update modeles-contrats"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'modeles-contrats')
  WITH CHECK (bucket_id = 'modeles-contrats');

CREATE POLICY "Authenticated users can delete from modeles-contrats"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'modeles-contrats');
