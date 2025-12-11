/*
  # Correction des contrats Yousign existants

  Ce script corrige tous les contrats signés via Yousign qui n'ont pas
  les colonnes `type`, `date_debut` et `date_fin` correctement renseignées.

  1. Mise à jour des contrats avec type NULL
  2. Mise à jour des contrats avec date_fin NULL (pour les CDD)
  3. Changement du statut "signe" en "actif" pour la détection d'expiration
*/

-- ========================================
-- ÉTAPE 1: Mise à jour du type de contrat depuis le modèle
-- ========================================
UPDATE contrat
SET type = COALESCE(
  contrat.type,
  modeles_contrats.type_contrat,
  (contrat.variables->>'type_contrat'),
  'CDI'
)
FROM modeles_contrats
WHERE contrat.modele_id = modeles_contrats.id
  AND (contrat.type IS NULL OR contrat.type = '');

-- ========================================
-- ÉTAPE 2: Mise à jour de date_debut depuis variables
-- ========================================
UPDATE contrat
SET date_debut = COALESCE(
  contrat.date_debut,
  (contrat.variables->>'date_debut')::date,
  CURRENT_DATE
)
WHERE contrat.date_debut IS NULL;

-- ========================================
-- ÉTAPE 3: Mise à jour de date_fin pour les CDD depuis variables
-- ========================================
UPDATE contrat
SET date_fin = (contrat.variables->>'date_fin')::date
WHERE contrat.type = 'CDD'
  AND contrat.date_fin IS NULL
  AND contrat.variables->>'date_fin' IS NOT NULL;

-- ========================================
-- ÉTAPE 4: Mise à jour de date_fin pour les Avenants depuis le profil
-- ========================================

-- Avenant 1
UPDATE contrat
SET date_fin = COALESCE(
  (contrat.variables->>'date_fin')::date,
  profil.avenant_1_date_fin
)
FROM modeles_contrats, profil
WHERE contrat.modele_id = modeles_contrats.id
  AND contrat.profil_id = profil.id
  AND modeles_contrats.type_contrat = 'Avenant'
  AND (contrat.variables->>'type_contrat' = 'Avenant 1')
  AND contrat.date_fin IS NULL;

-- Avenant 2
UPDATE contrat
SET date_fin = COALESCE(
  (contrat.variables->>'date_fin')::date,
  profil.avenant_2_date_fin
)
FROM modeles_contrats, profil
WHERE contrat.modele_id = modeles_contrats.id
  AND contrat.profil_id = profil.id
  AND modeles_contrats.type_contrat = 'Avenant'
  AND (contrat.variables->>'type_contrat' = 'Avenant 2')
  AND contrat.date_fin IS NULL;

-- ========================================
-- ÉTAPE 5: Changer le statut "signe" en "actif"
-- ========================================
-- Important: La fonction de détection cherche les contrats avec statut "actif"
-- et non "signe", donc on doit corriger cela

UPDATE contrat
SET statut = 'actif'
WHERE statut = 'signe'
  OR statut = 'valide';

-- ========================================
-- ÉTAPE 6: Afficher les résultats
-- ========================================
SELECT
  'Contrats corrigés' as message,
  COUNT(*) as total,
  SUM(CASE WHEN type = 'CDD' THEN 1 ELSE 0 END) as cdd_count,
  SUM(CASE WHEN type = 'CDI' THEN 1 ELSE 0 END) as cdi_count,
  SUM(CASE WHEN date_fin IS NOT NULL THEN 1 ELSE 0 END) as with_date_fin,
  SUM(CASE WHEN statut = 'actif' THEN 1 ELSE 0 END) as actif_count
FROM contrat
WHERE yousign_signature_request_id IS NOT NULL;
