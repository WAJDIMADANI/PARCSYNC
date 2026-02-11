/*
  # Tester si le fichier existe dans le bucket "documents"

  Vérifier si le fichier qui génère l'erreur 404 existe vraiment.

  Fichier problématique :
  documents-importants/9065390c-8a57-4719-8af8-3e729aa8ed97_permis_verso_1768979343669.pdf
*/

-- 1. Chercher ce fichier spécifique
SELECT
  id,
  name as chemin_complet,
  bucket_id,
  created_at,
  metadata->>'size' as taille_bytes,
  metadata->>'mimetype' as type_mime
FROM storage.objects
WHERE bucket_id = 'documents'
  AND name LIKE '%9065390c-8a57-4719-8af8-3e729aa8ed97_permis_verso%';

-- 2. Chercher tous les fichiers de ce profil
SELECT
  id,
  name as chemin_complet,
  created_at,
  metadata->>'size' as taille_bytes
FROM storage.objects
WHERE bucket_id = 'documents'
  AND name LIKE '%9065390c-8a57-4719-8af8-3e729aa8ed97%'
ORDER BY created_at DESC;

-- 3. Lister les 20 derniers fichiers dans documents-importants/
SELECT
  name as chemin_complet,
  created_at,
  metadata->>'size' as taille_bytes,
  metadata->>'mimetype' as type
FROM storage.objects
WHERE bucket_id = 'documents'
  AND name LIKE 'documents-importants/%'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Vérifier dans la table document si ce fichier est référencé
SELECT
  id,
  owner_id,
  owner_type,
  type_document,
  storage_path,
  bucket,
  created_at
FROM document
WHERE storage_path LIKE '%9065390c-8a57-4719-8af8-3e729aa8ed97_permis_verso%'
   OR storage_path LIKE '%permis_verso_1768979343669%';

-- 5. Structure générale du bucket documents
SELECT
  split_part(name, '/', 1) as dossier_racine,
  COUNT(*) as nombre_fichiers,
  SUM((metadata->>'size')::bigint) as taille_totale_bytes,
  MIN(created_at) as plus_ancien,
  MAX(created_at) as plus_recent
FROM storage.objects
WHERE bucket_id = 'documents'
GROUP BY split_part(name, '/', 1)
ORDER BY nombre_fichiers DESC;

-- 6. Chercher des patterns similaires
SELECT
  name,
  created_at,
  CASE
    WHEN name LIKE 'documents-importants/%' THEN '📄 Document important'
    WHEN name LIKE 'contrats/%' THEN '📋 Contrat'
    WHEN name LIKE 'courriers/%' THEN '✉️ Courrier'
    WHEN name LIKE 'vehicules/%' THEN '🚗 Véhicule'
    ELSE '❓ Autre'
  END as categorie
FROM storage.objects
WHERE bucket_id = 'documents'
  AND (
    name LIKE '%permis_verso%'
    OR name LIKE '%permis_recto%'
  )
ORDER BY created_at DESC
LIMIT 10;
