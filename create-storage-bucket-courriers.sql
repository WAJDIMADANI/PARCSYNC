/*
  # Créer le bucket Storage pour les courriers générés

  1. Bucket Storage
    - Nom: courriers-generes
    - Public: false (accès authentifié uniquement)
    - Organisé par année/mois/profil_id

  2. Policies de Storage
    - Les utilisateurs authentifiés peuvent uploader
    - Les utilisateurs authentifiés peuvent lire leurs propres courriers

  INSTRUCTIONS:
  Exécutez ces commandes dans le SQL Editor de Supabase ou via l'interface Storage
*/

-- Créer le bucket (à faire via l'interface Supabase Storage ou API)
-- Nom: courriers-generes
-- Public: Non
-- File size limit: 5MB
-- Allowed MIME types: application/pdf

-- Policies de storage (à configurer dans Storage Policies)
-- Policy 1: Authenticated users can upload
--   Operation: INSERT
--   Target roles: authenticated
--   WITH CHECK: true

-- Policy 2: Authenticated users can read
--   Operation: SELECT
--   Target roles: authenticated
--   USING: true

-- Policy 3: Users can delete their own uploads
--   Operation: DELETE
--   Target roles: authenticated
--   USING: (storage.foldername(name))[1] = auth.uid()::text
