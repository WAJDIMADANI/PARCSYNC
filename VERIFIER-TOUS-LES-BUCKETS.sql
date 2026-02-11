/*
  # Vérification et création de tous les buckets nécessaires

  Cette requête vérifie quels buckets existent et lesquels manquent.

  Buckets nécessaires pour l'application :
  1. documents        - Documents salariés, contrats, courriers
  2. candidatures     - CV, lettres de motivation des candidats
  3. profile-photos   - Photos de profil des utilisateurs
  4. modeles-contrats - Templates de contrats Word/PDF
  5. courriers        - Courriers administratifs générés
  6. vehicle-photos   - Photos des véhicules
  7. vehicle-documents - Documents véhicules (assurance, CT, etc.)
  8. demandes-externes - Documents pour demandes externes
  9. avances-frais    - Justificatifs d'avances de frais
*/

-- 1. Vérifier quels buckets existent déjà
SELECT
  id,
  name,
  public,
  file_size_limit / 1048576 as size_limit_mb,
  created_at
FROM storage.buckets
ORDER BY created_at DESC;

-- 2. Vérifier les policies RLS pour chaque bucket
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%documents%' THEN 'documents'
    WHEN policyname LIKE '%candidat%' THEN 'candidatures'
    WHEN policyname LIKE '%photo%' THEN 'profile-photos'
    WHEN policyname LIKE '%modele%' THEN 'modeles-contrats'
    WHEN policyname LIKE '%courrier%' THEN 'courriers'
    WHEN policyname LIKE '%vehicle%' THEN 'vehicle-*'
    WHEN policyname LIKE '%demande%' THEN 'demandes-externes'
    WHEN policyname LIKE '%frais%' THEN 'avances-frais'
    ELSE 'autre'
  END as bucket_concerne
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY bucket_concerne, cmd;

-- 3. Créer les buckets manquants (exécutez uniquement ceux qui manquent)

-- BUCKET: documents (PRIORITAIRE - Erreur 404 actuelle)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  104857600, -- 100MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- BUCKET: candidatures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidatures',
  'candidatures',
  true,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- BUCKET: profile-photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- BUCKET: modeles-contrats
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'modeles-contrats',
  'modeles-contrats',
  true,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- BUCKET: courriers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'courriers',
  'courriers',
  true,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- BUCKET: vehicle-photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- BUCKET: vehicle-documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-documents',
  'vehicle-documents',
  true,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- BUCKET: demandes-externes
INSERT INTO storage.buckets (id, name, public)
VALUES (
  'demandes-externes',
  'demandes-externes',
  true
)
ON CONFLICT (id) DO NOTHING;

-- BUCKET: avances-frais
INSERT INTO storage.buckets (id, name, public)
VALUES (
  'avances-frais',
  'avances-frais',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 4. Vérification finale
SELECT
  'Bucket existant: ' || id as status,
  public,
  file_size_limit / 1048576 as size_mb
FROM storage.buckets
ORDER BY id;

-- 5. Comptage des policies par bucket
SELECT
  CASE
    WHEN policyname LIKE '%documents%' THEN 'documents'
    WHEN policyname LIKE '%candidat%' THEN 'candidatures'
    WHEN policyname LIKE '%photo%' THEN 'profile-photos'
    WHEN policyname LIKE '%modele%' THEN 'modeles-contrats'
    WHEN policyname LIKE '%courrier%' THEN 'courriers'
    WHEN policyname LIKE '%vehicle%' THEN 'vehicle-*'
    WHEN policyname LIKE '%demande%' THEN 'demandes-externes'
    WHEN policyname LIKE '%frais%' THEN 'avances-frais'
    ELSE 'autre'
  END as bucket_concerne,
  COUNT(*) as nombre_policies
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
GROUP BY bucket_concerne
ORDER BY bucket_concerne;
