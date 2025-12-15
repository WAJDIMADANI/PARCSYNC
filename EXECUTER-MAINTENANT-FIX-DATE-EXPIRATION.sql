/*
  🚀 EXÉCUTER MAINTENANT: Correction complète du problème date_expiration

  Ce script va:
  1. Renommer date_expiration_originale → date_expiration_effective dans incident
  2. Mettre à jour la vue v_incidents_contrats_affichables
  3. Vérifier que tout fonctionne

  ⚠️ EXÉCUTEZ CE SCRIPT DANS BOLT DATABASE
*/

-- ===========================================
-- ÉTAPE 1: Renommer la colonne dans incident
-- ===========================================

DO $$
BEGIN
  -- Vérifier si date_expiration_originale existe et date_expiration_effective n'existe pas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident' AND column_name = 'date_expiration_originale'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident' AND column_name = 'date_expiration_effective'
  ) THEN
    ALTER TABLE incident RENAME COLUMN date_expiration_originale TO date_expiration_effective;
    RAISE NOTICE '✅ Colonne renommée: date_expiration_originale → date_expiration_effective';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident' AND column_name = 'date_expiration_effective'
  ) THEN
    RAISE NOTICE '✅ Colonne date_expiration_effective existe déjà';
  ELSE
    RAISE EXCEPTION 'Aucune colonne date_expiration trouvée dans la table incident';
  END IF;
END $$;

-- ===========================================
-- ÉTAPE 2: Recréer la vue avec colonnes explicites
-- ===========================================

CREATE OR REPLACE VIEW v_incidents_contrats_affichables AS
SELECT
  i.id,
  i.type,
  i.profil_id,
  i.contrat_id,
  i.date_expiration_effective,
  i.date_creation_incident,
  i.statut,
  i.created_at,
  i.updated_at,
  p.nom,
  p.prenom,
  p.email,
  c.type as contrat_type,
  c.date_debut as contrat_date_debut,
  c.date_fin as contrat_date_fin,
  c.statut as contrat_statut
FROM incident i
INNER JOIN profil p ON i.profil_id = p.id
LEFT JOIN contrat c ON i.contrat_id = c.id
WHERE i.type = 'contrat_expire'
  -- Exclure les profils ayant un CDI actif
  AND NOT EXISTS (
    SELECT 1
    FROM v_profils_cdi_actif cdi
    WHERE cdi.profil_id = i.profil_id
  );

-- ===========================================
-- ÉTAPE 3: VÉRIFICATIONS
-- ===========================================

-- Vérifier que la colonne existe maintenant
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'incident'
  AND column_name LIKE '%expiration%'
ORDER BY column_name;

-- Compter les incidents par type
SELECT
  type,
  COUNT(*) as nombre
FROM incident
GROUP BY type
ORDER BY nombre DESC;

-- Afficher quelques incidents titre_sejour
SELECT
  i.id,
  i.type,
  i.date_expiration_effective,
  i.statut,
  p.nom,
  p.prenom,
  p.email
FROM incident i
LEFT JOIN profil p ON p.id = i.profil_id
WHERE i.type = 'titre_sejour'
ORDER BY i.date_expiration_effective
LIMIT 5;

-- Vérifier la vue
SELECT COUNT(*) as total_contrats_expires
FROM v_incidents_contrats_affichables;
