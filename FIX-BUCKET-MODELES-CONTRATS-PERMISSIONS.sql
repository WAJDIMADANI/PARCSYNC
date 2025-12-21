/*
  # Fix permissions bucket modeles-contrats

  ## Problème
  Les fichiers DOCX existent dans le bucket "modeles-contrats" mais retournent
  une erreur 400 Bad Request car le bucket n'est pas public ou les policies
  sont incorrectes.

  ## Solution
  1. Rendre le bucket public
  2. Ajouter les policies de lecture publique
*/

-- 1. Vérifier que le bucket existe et le rendre public
UPDATE storage.buckets
SET public = true
WHERE id = 'modeles-contrats';

-- Si le bucket n'existe pas, le créer
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

-- 2. Supprimer les anciennes policies pour modeles-contrats s'ils existent
DROP POLICY IF EXISTS "Public read access for modeles-contrats" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to modeles-contrats" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update modeles-contrats" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from modeles-contrats" ON storage.objects;

-- 3. Créer les nouvelles policies pour accès public en lecture
CREATE POLICY "Public read access for modeles-contrats"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'modeles-contrats');

-- 4. Permettre aux utilisateurs authentifiés de gérer les fichiers
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
