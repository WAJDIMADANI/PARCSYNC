/*
  DIAGNOSTIC COMPLET - Notifications et Incidents
  ===============================================

  Ce script vérifie pourquoi certains documents expirés ou arrivant à échéance
  ne sont pas détectés dans les onglets Notifications et Incidents.
*/

-- ========================================
-- 1. VÉRIFIER LES DOCUMENTS ARRIVANT À ÉCHÉANCE (30 JOURS)
-- ========================================

SELECT '=== DOCUMENTS ARRIVANT À ÉCHÉANCE (30 JOURS) ===' as diagnostic;

-- Titres de séjour
SELECT
  'Titre de séjour' as type_document,
  p.id,
  p.nom,
  p.prenom,
  p.statut,
  p.titre_sejour_fin_validite as date_expiration,
  CURRENT_DATE + INTERVAL '30 days' as limite_alerte,
  (p.titre_sejour_fin_validite - CURRENT_DATE) as jours_restants
FROM profil p
WHERE p.titre_sejour_fin_validite IS NOT NULL
  AND p.titre_sejour_fin_validite > CURRENT_DATE
  AND p.titre_sejour_fin_validite <= CURRENT_DATE + INTERVAL '30 days'
  AND p.statut = 'actif'
ORDER BY p.titre_sejour_fin_validite ASC;

-- Visites médicales
SELECT
  'Visite médicale' as type_document,
  p.id,
  p.nom,
  p.prenom,
  p.statut,
  p.date_fin_visite_medicale as date_expiration,
  CURRENT_DATE + INTERVAL '30 days' as limite_alerte,
  (p.date_fin_visite_medicale - CURRENT_DATE) as jours_restants
FROM profil p
WHERE p.date_fin_visite_medicale IS NOT NULL
  AND p.date_fin_visite_medicale > CURRENT_DATE
  AND p.date_fin_visite_medicale <= CURRENT_DATE + INTERVAL '30 days'
  AND p.statut = 'actif'
ORDER BY p.date_fin_visite_medicale ASC;

-- Permis de conduire
SELECT
  'Permis de conduire' as type_document,
  p.id,
  p.nom,
  p.prenom,
  p.statut,
  p.permis_conduire_expiration as date_expiration,
  CURRENT_DATE + INTERVAL '30 days' as limite_alerte,
  (p.permis_conduire_expiration - CURRENT_DATE) as jours_restants
FROM profil p
WHERE p.permis_conduire_expiration IS NOT NULL
  AND p.permis_conduire_expiration > CURRENT_DATE
  AND p.permis_conduire_expiration <= CURRENT_DATE + INTERVAL '30 days'
  AND p.statut = 'actif'
ORDER BY p.permis_conduire_expiration ASC;

-- Contrats CDD (15 jours)
SELECT
  'Contrat CDD' as type_document,
  p.id,
  p.nom,
  p.prenom,
  p.statut,
  c.date_fin as date_expiration,
  CURRENT_DATE + INTERVAL '15 days' as limite_alerte,
  (c.date_fin - CURRENT_DATE) as jours_restants
FROM contrat c
JOIN profil p ON p.id = c.profil_id
WHERE c.type_contrat = 'CDD'
  AND c.date_fin IS NOT NULL
  AND c.date_fin > CURRENT_DATE
  AND c.date_fin <= CURRENT_DATE + INTERVAL '15 days'
  AND c.statut = 'actif'
  AND p.statut = 'actif'
ORDER BY c.date_fin ASC;

-- ========================================
-- 2. VÉRIFIER LES DOCUMENTS DÉJÀ EXPIRÉS
-- ========================================

SELECT '=== DOCUMENTS DÉJÀ EXPIRÉS ===' as diagnostic;

-- Titres de séjour expirés
SELECT
  'Titre de séjour' as type_document,
  p.id,
  p.nom,
  p.prenom,
  p.statut,
  p.titre_sejour_fin_validite as date_expiration,
  (CURRENT_DATE - p.titre_sejour_fin_validite) as jours_depuis_expiration
FROM profil p
WHERE p.titre_sejour_fin_validite IS NOT NULL
  AND p.titre_sejour_fin_validite < CURRENT_DATE
  AND p.statut = 'actif'
ORDER BY p.titre_sejour_fin_validite DESC
LIMIT 10;

-- Visites médicales expirées
SELECT
  'Visite médicale' as type_document,
  p.id,
  p.nom,
  p.prenom,
  p.statut,
  p.date_fin_visite_medicale as date_expiration,
  (CURRENT_DATE - p.date_fin_visite_medicale) as jours_depuis_expiration
FROM profil p
WHERE p.date_fin_visite_medicale IS NOT NULL
  AND p.date_fin_visite_medicale < CURRENT_DATE
  AND p.statut = 'actif'
ORDER BY p.date_fin_visite_medicale DESC
LIMIT 10;

-- Permis de conduire expirés
SELECT
  'Permis de conduire' as type_document,
  p.id,
  p.nom,
  p.prenom,
  p.statut,
  p.permis_conduire_expiration as date_expiration,
  (CURRENT_DATE - p.permis_conduire_expiration) as jours_depuis_expiration
FROM profil p
WHERE p.permis_conduire_expiration IS NOT NULL
  AND p.permis_conduire_expiration < CURRENT_DATE
  AND p.statut = 'actif'
ORDER BY p.permis_conduire_expiration DESC
LIMIT 10;

-- Contrats CDD expirés
SELECT
  'Contrat CDD' as type_document,
  p.id,
  p.nom,
  p.prenom,
  p.statut,
  c.date_fin as date_expiration,
  (CURRENT_DATE - c.date_fin) as jours_depuis_expiration
FROM contrat c
JOIN profil p ON p.id = c.profil_id
WHERE c.type_contrat = 'CDD'
  AND c.date_fin IS NOT NULL
  AND c.date_fin < CURRENT_DATE
  AND c.statut = 'actif'
  AND p.statut = 'actif'
ORDER BY c.date_fin DESC
LIMIT 10;

-- ========================================
-- 3. VÉRIFIER LES NOTIFICATIONS EXISTANTES
-- ========================================

SELECT '=== NOTIFICATIONS EXISTANTES ===' as diagnostic;

SELECT
  n.type,
  n.statut,
  COUNT(*) as nombre,
  MIN(n.date_echeance) as premiere_echeance,
  MAX(n.date_echeance) as derniere_echeance
FROM notification n
GROUP BY n.type, n.statut
ORDER BY n.type, n.statut;

-- Notifications actives en détail
SELECT
  n.type,
  n.statut,
  p.nom,
  p.prenom,
  n.date_echeance,
  (n.date_echeance - CURRENT_DATE) as jours_restants,
  n.created_at
FROM notification n
JOIN profil p ON p.id = n.profil_id
WHERE n.statut IN ('active', 'email_envoye')
ORDER BY n.date_echeance ASC
LIMIT 20;

-- ========================================
-- 4. VÉRIFIER LES INCIDENTS EXISTANTS
-- ========================================

SELECT '=== INCIDENTS EXISTANTS ===' as diagnostic;

SELECT
  i.type,
  i.statut,
  COUNT(*) as nombre,
  MIN(i.date_expiration_originale) as premiere_expiration,
  MAX(i.date_expiration_originale) as derniere_expiration
FROM incident i
GROUP BY i.type, i.statut
ORDER BY i.type, i.statut;

-- Incidents actifs en détail
SELECT
  i.type,
  i.statut,
  p.nom,
  p.prenom,
  i.date_expiration_originale,
  (CURRENT_DATE - i.date_expiration_originale) as jours_depuis_expiration,
  i.date_creation_incident
FROM incident i
JOIN profil p ON p.id = i.profil_id
WHERE i.statut IN ('actif', 'en_cours')
ORDER BY i.date_expiration_originale DESC
LIMIT 20;

-- ========================================
-- 5. RÉSUMÉ ET RECOMMANDATIONS
-- ========================================

SELECT '=== RÉSUMÉ ===' as diagnostic;

SELECT
  'Documents à expirer (30j)' as categorie,
  COUNT(*) as total
FROM profil p
WHERE p.statut = 'actif'
  AND (
    (p.titre_sejour_fin_validite IS NOT NULL AND p.titre_sejour_fin_validite > CURRENT_DATE AND p.titre_sejour_fin_validite <= CURRENT_DATE + INTERVAL '30 days')
    OR (p.date_fin_visite_medicale IS NOT NULL AND p.date_fin_visite_medicale > CURRENT_DATE AND p.date_fin_visite_medicale <= CURRENT_DATE + INTERVAL '30 days')
    OR (p.permis_conduire_expiration IS NOT NULL AND p.permis_conduire_expiration > CURRENT_DATE AND p.permis_conduire_expiration <= CURRENT_DATE + INTERVAL '30 days')
  )

UNION ALL

SELECT
  'Contrats CDD à expirer (15j)' as categorie,
  COUNT(*) as total
FROM contrat c
JOIN profil p ON p.id = c.profil_id
WHERE c.type_contrat = 'CDD'
  AND c.date_fin IS NOT NULL
  AND c.date_fin > CURRENT_DATE
  AND c.date_fin <= CURRENT_DATE + INTERVAL '15 days'
  AND c.statut = 'actif'
  AND p.statut = 'actif'

UNION ALL

SELECT
  'Documents expirés' as categorie,
  COUNT(*) as total
FROM profil p
WHERE p.statut = 'actif'
  AND (
    (p.titre_sejour_fin_validite IS NOT NULL AND p.titre_sejour_fin_validite < CURRENT_DATE)
    OR (p.date_fin_visite_medicale IS NOT NULL AND p.date_fin_visite_medicale < CURRENT_DATE)
    OR (p.permis_conduire_expiration IS NOT NULL AND p.permis_conduire_expiration < CURRENT_DATE)
  )

UNION ALL

SELECT
  'Contrats CDD expirés' as categorie,
  COUNT(*) as total
FROM contrat c
JOIN profil p ON p.id = c.profil_id
WHERE c.type_contrat = 'CDD'
  AND c.date_fin IS NOT NULL
  AND c.date_fin < CURRENT_DATE
  AND c.statut = 'actif'
  AND p.statut = 'actif'

UNION ALL

SELECT
  'Notifications actives' as categorie,
  COUNT(*) as total
FROM notification
WHERE statut IN ('active', 'email_envoye')

UNION ALL

SELECT
  'Incidents actifs' as categorie,
  COUNT(*) as total
FROM incident
WHERE statut IN ('actif', 'en_cours');
