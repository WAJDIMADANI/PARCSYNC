/*
  # Migration complète pour afficher CV et lettres de motivation dans profil salarié

  Cette migration fait 3 choses :
  1. Ajoute la colonne candidat_id dans profil (si pas déjà fait)
  2. Lie automatiquement les profils existants aux candidats par email
  3. Migre tous les CV et lettres de motivation vers la table document

  Après cette migration :
  - Les salariés verront les CV et lettres de leurs candidatures
  - Tous les documents seront centralisés dans la table document
*/

-- ==================================================
-- ÉTAPE 1 : Ajouter le lien candidat dans profil
-- ==================================================

ALTER TABLE profil ADD COLUMN IF NOT EXISTS candidat_id uuid REFERENCES candidat(id);

CREATE INDEX IF NOT EXISTS idx_profil_candidat_id ON profil(candidat_id);
CREATE INDEX IF NOT EXISTS idx_document_proprietaire ON document(proprietaire_type, proprietaire_id);

-- ==================================================
-- ÉTAPE 2 : Lier les profils existants aux candidats
-- ==================================================

-- Lier par email (les profils créés depuis des candidats)
UPDATE profil p
SET candidat_id = c.id
FROM candidat c
WHERE p.email = c.email
  AND p.candidat_id IS NULL
  AND c.deleted_at IS NULL;

-- ==================================================
-- ÉTAPE 3 : Migrer les CV vers la table document
-- ==================================================

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

-- ==================================================
-- ÉTAPE 4 : Migrer les lettres de motivation
-- ==================================================

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

-- ==================================================
-- VÉRIFICATION DES RÉSULTATS
-- ==================================================

-- Compter les résultats de la migration
SELECT
  'Profils liés à un candidat' as description,
  COUNT(*) as nombre
FROM profil
WHERE candidat_id IS NOT NULL

UNION ALL

SELECT
  'Documents de type CV' as description,
  COUNT(*) as nombre
FROM document
WHERE type = 'cv'

UNION ALL

SELECT
  'Documents de type lettre_motivation' as description,
  COUNT(*) as nombre
FROM document
WHERE type = 'lettre_motivation'

UNION ALL

SELECT
  'Total documents candidats' as description,
  COUNT(*) as nombre
FROM document
WHERE proprietaire_type = 'candidat';

-- ==================================================
-- TEST : Afficher un exemple de salarié avec documents
-- ==================================================

SELECT
  p.prenom || ' ' || p.nom as salarie,
  p.email,
  c.id as candidat_id,
  COUNT(d.id) as nombre_documents,
  STRING_AGG(d.type, ', ') as types_documents
FROM profil p
LEFT JOIN candidat c ON p.candidat_id = c.id
LEFT JOIN document d ON d.proprietaire_id = c.id AND d.proprietaire_type = 'candidat'
WHERE p.candidat_id IS NOT NULL
GROUP BY p.id, p.prenom, p.nom, p.email, c.id
LIMIT 5;
