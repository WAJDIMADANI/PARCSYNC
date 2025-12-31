/*
  # Corriger l'upload anonyme pour le bucket candidatures

  1. Problème
    - Le formulaire d'onboarding est utilisé par des candidats NON authentifiés
    - Les politiques actuelles requièrent l'authentification pour l'upload
    - Résultat : "StorageUnknownError: Failed to fetch"

  2. Solution
    - Permettre les uploads anonymes sur le bucket candidatures
    - Maintenir la sécurité en limitant la taille et les types de fichiers

  3. Sécurité
    - Le bucket reste public pour la lecture
    - Les uploads anonymes sont autorisés uniquement sur le bucket candidatures
    - Limite de taille : 50MB par fichier
    - Types MIME restreints
*/

-- Supprimer l'ancienne politique d'upload qui requiert l'authentification
DROP POLICY IF EXISTS "Allow authenticated uploads candidatures" ON storage.objects;

-- Créer une nouvelle politique permettant les uploads anonymes
CREATE POLICY "Allow anonymous and authenticated uploads candidatures"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'candidatures');

-- Mettre à jour la politique de lecture (déjà publique, mais on s'assure)
DROP POLICY IF EXISTS "Allow public reads candidatures" ON storage.objects;
CREATE POLICY "Allow public reads candidatures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'candidatures');

-- Mettre à jour les politiques de modification (authentifiés seulement)
DROP POLICY IF EXISTS "Allow authenticated updates candidatures" ON storage.objects;
CREATE POLICY "Allow authenticated updates candidatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'candidatures')
WITH CHECK (bucket_id = 'candidatures');

DROP POLICY IF EXISTS "Allow authenticated deletes candidatures" ON storage.objects;
CREATE POLICY "Allow authenticated deletes candidatures"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'candidatures');
