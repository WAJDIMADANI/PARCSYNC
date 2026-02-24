/*
  Diagnostic complet - Incidents contrats expirés obsolètes
  Identifier les profils avec CDI qui ont encore des incidents contrat_expire actifs
*/

-- ========================================
-- 1. Vue d'ensemble
-- ========================================

SELECT '=== 1. Vue d''ensemble ===' as etape;

SELECT
  COUNT(*) FILTER (WHERE type = 'contrat_expire' AND statut IN ('actif','expire')) as incidents_contrat_actifs,
  COUNT(*) FILTER (WHERE type = 'contrat_expire' AND statut = 'resolu') as incidents_contrat_resolus,
  COUNT(DISTINCT profil_id) FILTER (WHERE type = 'contrat_expire' AND statut IN ('actif','expire')) as profils_concernes
FROM incident;


-- ========================================
-- 2. Profils avec CDI ayant encore des incidents actifs (PROBLÈME)
-- ========================================

SELECT '=== 2. Profils avec CDI ayant incidents actifs (OBSOLÈTES) ===' as etape;

SELECT
  p.nom,
  p.prenom,
  p.matricule_tca,
  cdi.date_debut as cdi_date_debut,
  cdi.date_fin as cdi_date_fin,
  cdi.statut as cdi_statut,
  COUNT(i.id) as nb_incidents_actifs,
  STRING_AGG(i.date_expiration_originale::text, ', ' ORDER BY i.date_expiration_originale) as dates_expiration
FROM profil p
INNER JOIN contrat cdi ON cdi.profil_id = p.id
INNER JOIN incident i ON i.profil_id = p.id
WHERE
  LOWER(cdi.type) = 'cdi'
  AND cdi.statut IN ('actif', 'signed', 'signe')
  AND cdi.date_fin IS NULL
  AND i.type = 'contrat_expire'
  AND i.statut IN ('actif', 'expire')
  AND i.date_expiration_originale <= cdi.date_debut  -- L'incident est AVANT ou LE JOUR du début CDI
GROUP BY p.id, p.nom, p.prenom, p.matricule_tca, cdi.date_debut, cdi.date_fin, cdi.statut
ORDER BY nb_incidents_actifs DESC, p.nom;


-- ========================================
-- 3. Détail des incidents obsolètes par profil
-- ========================================

SELECT '=== 3. Détail incidents obsolètes ===' as etape;

SELECT
  p.nom || ' ' || p.prenom as profil,
  p.matricule_tca,
  i.type as incident_type,
  i.statut as incident_statut,
  i.date_expiration_originale as date_expiration,
  i.date_creation as incident_cree_le,
  cdi.type as contrat_type,
  cdi.statut as contrat_statut,
  cdi.date_debut as cdi_date_debut,
  cdi.date_fin as cdi_date_fin,
  CASE
    WHEN cdi.date_debut >= i.date_expiration_originale THEN '✓ CDI couvre'
    WHEN cdi.date_debut < i.date_expiration_originale THEN '✗ Trou de couverture'
    ELSE '? Autre'
  END as analyse
FROM incident i
INNER JOIN profil p ON p.id = i.profil_id
INNER JOIN contrat cdi ON cdi.profil_id = p.id
WHERE
  i.type = 'contrat_expire'
  AND i.statut IN ('actif', 'expire')
  AND LOWER(cdi.type) = 'cdi'
  AND cdi.statut IN ('actif', 'signed', 'signe')
  AND cdi.date_fin IS NULL
ORDER BY p.nom, p.prenom, i.date_expiration_originale;


-- ========================================
-- 4. Cas spécifique : Didier RENARD
-- ========================================

SELECT '=== 4. Cas spécifique: Didier RENARD ===' as etape;

-- Contrats
SELECT
  'Contrats' as section,
  c.type,
  c.statut,
  c.date_debut,
  c.date_fin,
  CASE
    WHEN LOWER(c.type) = 'cdi' AND c.date_fin IS NULL THEN '✓ CDI ouvert'
    ELSE 'CDD/Avenant'
  END as analyse
FROM profil p
INNER JOIN contrat c ON c.profil_id = p.id
WHERE p.nom ILIKE '%RENARD%'
  AND p.prenom ILIKE '%Didier%'
ORDER BY c.date_debut DESC;

-- Incidents
SELECT
  'Incidents' as section,
  i.type,
  i.statut,
  i.date_expiration_originale,
  i.date_creation,
  i.date_resolution,
  i.commentaire_resolution
FROM profil p
INNER JOIN incident i ON i.profil_id = p.id
WHERE p.nom ILIKE '%RENARD%'
  AND p.prenom ILIKE '%Didier%'
  AND i.type = 'contrat_expire'
ORDER BY i.date_expiration_originale DESC;


-- ========================================
-- RÉSUMÉ
-- ========================================

SELECT '=== RÉSUMÉ ===' as etape;

WITH stats AS (
  SELECT
    COUNT(*) FILTER (
      WHERE type = 'contrat_expire' AND statut IN ('actif','expire')
    ) as total_incidents_actifs,
    COUNT(*) FILTER (
      WHERE type = 'contrat_expire'
        AND statut IN ('actif','expire')
        AND EXISTS (
          SELECT 1 FROM contrat cdi
          WHERE cdi.profil_id = incident.profil_id
            AND LOWER(cdi.type) = 'cdi'
            AND cdi.statut IN ('actif','signed','signe')
            AND cdi.date_fin IS NULL
            AND cdi.date_debut >= incident.date_expiration_originale
        )
    ) as incidents_obsoletes
  FROM incident
)
SELECT
  total_incidents_actifs,
  incidents_obsoletes,
  total_incidents_actifs - incidents_obsoletes as incidents_legitimes,
  CASE
    WHEN incidents_obsoletes > 0 THEN '⚠️ À corriger'
    ELSE '✓ OK'
  END as statut
FROM stats;
