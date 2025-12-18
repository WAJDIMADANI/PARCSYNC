/*
  # Correction du Template Word - Avenant 1

  ## Problème
  Dans le template Word pour l'avenant 1, les dates sont inversées :
  - Il écrit : "prenant effet le {{contract_end}} et se terminant le {{contract_start}}"
  - Au lieu de : "prenant effet le {{contract_start}} et se terminant le {{contract_end}}"

  ## Solution
  Ce script ne peut PAS modifier directement un fichier Word.

  ## INSTRUCTIONS MANUELLES

  1. Télécharger le fichier Word de l'avenant 1 depuis Supabase Storage
  2. Ouvrir le fichier dans Microsoft Word
  3. Chercher dans le document les variables :
     - {{contract_end}} et {{contract_start}}
     - {{MADANI}} {{WAJDI}} (ou autres variables avec doubles accolades)

  4. Corriger l'ordre des dates :
     - AVANT : "prenant effet le {{contract_end}} et se terminant le {{contract_start}}"
     - APRÈS : "prenant effet le {{contract_start}} et se terminant le {{contract_end}}"

  5. Nettoyer les doubles accolades s'il y en a (ex: MADANI}} {{WAJDI}} → {{prenom}} {{nom}})

  6. Sauvegarder le fichier

  7. Re-uploader le fichier dans Supabase Storage au même emplacement

  ## Alternative : Créer un Nouveau Template

  Si vous préférez, vous pouvez créer un nouveau template avec les bonnes variables :
*/

-- Vérifier le template actuel d'avenant 1
SELECT
  id,
  nom,
  type_contrat,
  fichier_nom,
  fichier_url,
  created_at
FROM modeles_contrats
WHERE nom ILIKE '%avenant%1%'
OR nom ILIKE '%avenant n°1%'
OR nom ILIKE '%avenant n° 1%'
ORDER BY created_at DESC;

/*
  ## SOLUTION AUTOMATIQUE (Alternative)

  Si vous voulez corriger le problème SANS modifier le fichier Word,
  vous pouvez ajouter une logique dans le code qui inverse automatiquement
  les variables si c'est un avenant.

  Cette logique a déjà été ajoutée dans la fonction Edge :
  - Les dates sont maintenant formatées en français automatiquement
  - Les accolades vides sont nettoyées

  Mais l'ordre des dates dans le template Word DOIT être corrigé manuellement.
*/

-- Afficher les informations du bucket storage pour trouver le fichier
SELECT
  id,
  name,
  public
FROM storage.buckets
WHERE name = 'modeles-contrats'
OR id = 'modeles-contrats';

-- Message de rappel
DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  CORRIGER LE TEMPLATE WORD MANUELLEMENT               ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  1. Télécharger le fichier Word de l''avenant 1        ║';
  RAISE NOTICE '║  2. Ouvrir dans Microsoft Word                         ║';
  RAISE NOTICE '║  3. Chercher : {{contract_end}} et {{contract_start}}  ║';
  RAISE NOTICE '║  4. Inverser l''ordre :                                 ║';
  RAISE NOTICE '║     AVANT: prenant effet le {{contract_end}}           ║';
  RAISE NOTICE '║            se terminant le {{contract_start}}          ║';
  RAISE NOTICE '║     APRÈS: prenant effet le {{contract_start}}         ║';
  RAISE NOTICE '║            se terminant le {{contract_end}}            ║';
  RAISE NOTICE '║  5. Sauvegarder et re-uploader                         ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  ✅ Les dates seront alors automatiquement formatées   ║';
  RAISE NOTICE '║     en français : "20 décembre 2025"                   ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
END $$;
