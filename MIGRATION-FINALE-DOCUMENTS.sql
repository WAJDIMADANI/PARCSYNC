/*
  # Migration finale pour unifier tous les documents

  1. Ajoute le lien candidat dans profil
  2. Migre les CV et lettres de motivation vers document
  3. Vérifie que tout est accessible depuis le profil salarié
*/

-- Étape 1: Ajouter le lien candidat dans profil (si pas déjà fait)
ALTER TABLE profil ADD COLUMN IF NOT EXISTS candidat_id uuid REFERENCES candidat(id);

-- Étape 2: Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profil_candidat_id ON profil(candidat_id);
CREATE INDEX IF NOT EXISTS idx_document_proprietaire ON document(proprietaire_type, proprietaire_id);

-- Étape 3: Migrer les CV existants vers la table document
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
    WHERE document.proprietaire_id = candidat.id
      AND document.proprietaire_type = 'candidat'
      AND document.type = 'cv'
  );

-- Étape 4: Migrer les lettres de motivation vers la table document
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
    WHERE document.proprietaire_id = candidat.id
      AND document.proprietaire_type = 'candidat'
      AND document.type = 'lettre_motivation'
  );

-- Étape 5: Lier les profils aux candidats si l'email correspond
UPDATE profil p
SET candidat_id = c.id
FROM candidat c
WHERE p.email = c.email
  AND p.candidat_id IS NULL
  AND c.deleted_at IS NULL;

-- Vérification: Afficher le résultat
SELECT
  'Documents candidats migrés' as etape,
  COUNT(*) as nombre
FROM document
WHERE proprietaire_type = 'candidat'
UNION ALL
SELECT
  'Profils liés à candidat' as etape,
  COUNT(*) as nombre
FROM profil
WHERE candidat_id IS NOT NULL;
