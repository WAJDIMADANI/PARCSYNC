/*
  # Migrer les CV et lettres de motivation vers la table document

  1. Migration
    - Copie les cv_url et lettre_motivation_url de la table candidat vers la table document
    - Crée des entrées de type 'cv' et 'lettre_motivation' pour chaque candidat
    - Ignore les candidats qui n'ont pas de CV ou lettre

  2. Notes
    - proprietaire_type = 'candidat'
    - proprietaire_id = l'ID du candidat
    - Cette migration peut être exécutée plusieurs fois sans doublon grâce au check NOT EXISTS
*/

-- Créer les documents CV pour les candidats qui en ont
INSERT INTO document (proprietaire_type, proprietaire_id, type, fichier_url, created_at)
SELECT
  'candidat' as proprietaire_type,
  id as proprietaire_id,
  'cv' as type,
  cv_url as fichier_url,
  created_at
FROM candidat
WHERE cv_url IS NOT NULL
  AND cv_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM document
    WHERE proprietaire_id = candidat.id
      AND proprietaire_type = 'candidat'
      AND type = 'cv'
  );

-- Créer les documents lettre de motivation pour les candidats qui en ont
INSERT INTO document (proprietaire_type, proprietaire_id, type, fichier_url, created_at)
SELECT
  'candidat' as proprietaire_type,
  id as proprietaire_id,
  'lettre_motivation' as type,
  lettre_motivation_url as fichier_url,
  created_at
FROM candidat
WHERE lettre_motivation_url IS NOT NULL
  AND lettre_motivation_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM document
    WHERE proprietaire_id = candidat.id
      AND proprietaire_type = 'candidat'
      AND type = 'lettre_motivation'
  );
