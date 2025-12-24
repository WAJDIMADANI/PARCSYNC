/*
  Migration des Courriers - Déplacer .docx vers fichier_word_genere_url

  Contexte :
  - fichier_pdf_url contient souvent des fichiers .docx au lieu de .pdf
  - fichier_word_genere_url n'est pas utilisé
  - Le nouveau code gère maintenant les deux colonnes correctement

  Cette migration :
  1. Identifie les entrées où fichier_pdf_url contient un .docx
  2. Déplace cette URL vers fichier_word_genere_url
  3. Met fichier_pdf_url à NULL pour éviter la confusion

  ⚠️ IMPORTANT : Cette migration est OPTIONNELLE
  Le nouveau code fonctionne avec l'ancien schéma de données.
  Exécutez cette migration uniquement si vous voulez nettoyer vos données.
*/

-- Étape 1 : Voir combien de courriers sont concernés
SELECT
  COUNT(*) as nb_courriers_docx,
  COUNT(DISTINCT profil_id) as nb_profils_concernes
FROM courrier_genere
WHERE fichier_pdf_url LIKE '%.docx%'
  OR fichier_pdf_url LIKE '%.docx?%';

-- Étape 2 : Afficher les courriers concernés (facultatif)
SELECT
  id,
  modele_nom,
  fichier_pdf_url,
  fichier_word_genere_url,
  created_at
FROM courrier_genere
WHERE (fichier_pdf_url LIKE '%.docx%' OR fichier_pdf_url LIKE '%.docx?%')
  AND fichier_word_genere_url IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Étape 3 : Migration des données
-- Déplacer les .docx de fichier_pdf_url vers fichier_word_genere_url
UPDATE courrier_genere
SET
  fichier_word_genere_url = fichier_pdf_url,
  fichier_pdf_url = NULL
WHERE
  (fichier_pdf_url LIKE '%.docx%' OR fichier_pdf_url LIKE '%.docx?%')
  AND fichier_word_genere_url IS NULL;

-- Étape 4 : Vérification post-migration
SELECT
  'Courriers avec PDF' as type,
  COUNT(*) as nombre
FROM courrier_genere
WHERE fichier_pdf_url LIKE '%.pdf%' OR fichier_pdf_url LIKE '%.pdf?%'

UNION ALL

SELECT
  'Courriers avec Word',
  COUNT(*)
FROM courrier_genere
WHERE fichier_word_genere_url IS NOT NULL

UNION ALL

SELECT
  'Courriers avec les deux',
  COUNT(*)
FROM courrier_genere
WHERE (fichier_pdf_url LIKE '%.pdf%' OR fichier_pdf_url LIKE '%.pdf?%')
  AND fichier_word_genere_url IS NOT NULL

UNION ALL

SELECT
  'Courriers sans fichier',
  COUNT(*)
FROM courrier_genere
WHERE fichier_pdf_url IS NULL
  AND fichier_word_genere_url IS NULL;

/*
  Notes :
  - Cette migration ne supprime aucun fichier du storage
  - Elle déplace uniquement les références d'URL entre colonnes
  - Exécutez d'abord l'étape 1 pour voir combien de courriers sont concernés
  - Si le nombre est important, testez d'abord avec une transaction :

    BEGIN;
    UPDATE courrier_genere ... (votre requête)
    SELECT * FROM courrier_genere WHERE id = 'un-id-test' ; -- Vérifier
    ROLLBACK; -- Annuler pour tester
    -- Puis relancer avec COMMIT si OK
*/
