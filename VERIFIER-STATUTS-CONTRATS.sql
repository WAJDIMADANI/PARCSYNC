/*
  VÉRIFICATION DES STATUTS DE CONTRATS

  Ce script permet de :
  1. Lister tous les statuts de contrats présents
  2. Compter le nombre de contrats par statut
  3. Afficher des exemples de contrats pour chaque statut
  4. Identifier les problèmes potentiels (statuts NULL, vides, invalides)
*/

-- ============================================
-- 1. RÉSUMÉ DES STATUTS DE CONTRATS
-- ============================================
SELECT
  COALESCE(statut, 'NULL') as statut,
  COUNT(*) as nombre_contrats,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as pourcentage
FROM contrat
GROUP BY statut
ORDER BY nombre_contrats DESC;

-- ============================================
-- 2. DÉTAILS DES CONTRATS PAR STATUT
-- ============================================
SELECT
  COALESCE(c.statut, 'NULL') as statut,
  c.id,
  c.profil_id,
  p.prenom,
  p.nom,
  p.email,
  c.type_contrat,
  c.date_debut,
  c.date_fin,
  c.created_at,
  c.updated_at
FROM contrat c
LEFT JOIN profil p ON p.id = c.profil_id
ORDER BY c.statut, c.created_at DESC;

-- ============================================
-- 3. CONTRATS AVEC STATUT NULL OU VIDE
-- ============================================
SELECT
  'PROBLÈME: Contrats avec statut NULL ou vide' as alerte,
  COUNT(*) as nombre
FROM contrat
WHERE statut IS NULL OR statut = '';

-- Détails si des contrats ont un statut NULL/vide
SELECT
  c.id,
  c.profil_id,
  p.prenom,
  p.nom,
  p.email,
  c.type_contrat,
  c.date_debut,
  c.date_fin,
  COALESCE(c.statut, 'NULL') as statut_actuel
FROM contrat c
LEFT JOIN profil p ON p.id = c.profil_id
WHERE c.statut IS NULL OR c.statut = ''
ORDER BY c.created_at DESC;

-- ============================================
-- 4. VÉRIFICATION DES STATUTS VALIDES
-- ============================================
-- Liste des statuts qui ne correspondent pas aux valeurs attendues
SELECT
  statut,
  COUNT(*) as nombre,
  'ATTENTION: Statut non standard' as remarque
FROM contrat
WHERE statut NOT IN (
  'brouillon',
  'en_attente_signature',
  'signe',
  'actif',
  'termine',
  'resilie',
  'refuse'
)
AND statut IS NOT NULL
AND statut != ''
GROUP BY statut;

-- ============================================
-- 5. CONTRATS PAR TYPE ET STATUT
-- ============================================
SELECT
  type_contrat,
  COALESCE(statut, 'NULL') as statut,
  COUNT(*) as nombre
FROM contrat
GROUP BY type_contrat, statut
ORDER BY type_contrat, nombre DESC;

-- ============================================
-- 6. CONTRATS AVEC YOUSIGN
-- ============================================
SELECT
  COALESCE(statut, 'NULL') as statut,
  COUNT(*) as nombre_contrats,
  COUNT(CASE WHEN yousign_signature_request_id IS NOT NULL THEN 1 END) as avec_yousign,
  COUNT(CASE WHEN yousign_signature_request_id IS NULL THEN 1 END) as sans_yousign
FROM contrat
GROUP BY statut
ORDER BY nombre_contrats DESC;

-- ============================================
-- 7. TIMELINE DES CONTRATS PAR STATUT
-- ============================================
SELECT
  DATE_TRUNC('month', created_at) as mois,
  COALESCE(statut, 'NULL') as statut,
  COUNT(*) as nombre_contrats
FROM contrat
GROUP BY DATE_TRUNC('month', created_at), statut
ORDER BY mois DESC, nombre_contrats DESC;

-- ============================================
-- 8. CONTRATS ACTIFS VS TERMINÉS
-- ============================================
SELECT
  CASE
    WHEN date_fin IS NULL THEN 'CDI (pas de date fin)'
    WHEN date_fin < CURRENT_DATE THEN 'Expiré (date fin passée)'
    WHEN date_fin >= CURRENT_DATE THEN 'En cours (date fin future)'
  END as etat_theorique,
  COALESCE(statut, 'NULL') as statut_actuel,
  COUNT(*) as nombre
FROM contrat
GROUP BY
  CASE
    WHEN date_fin IS NULL THEN 'CDI (pas de date fin)'
    WHEN date_fin < CURRENT_DATE THEN 'Expiré (date fin passée)'
    WHEN date_fin >= CURRENT_DATE THEN 'En cours (date fin future)'
  END,
  statut
ORDER BY etat_theorique, nombre DESC;

-- ============================================
-- 9. DERNIERS CONTRATS CRÉÉS PAR STATUT
-- ============================================
SELECT
  COALESCE(c.statut, 'NULL') as statut,
  c.id,
  p.prenom,
  p.nom,
  c.type_contrat,
  c.date_debut,
  c.date_fin,
  c.created_at,
  c.updated_at
FROM contrat c
LEFT JOIN profil p ON p.id = c.profil_id
ORDER BY c.created_at DESC
LIMIT 20;

-- ============================================
-- 10. STATISTIQUES GLOBALES
-- ============================================
SELECT
  'Total contrats' as metrique,
  COUNT(*)::text as valeur
FROM contrat
UNION ALL
SELECT
  'Contrats avec statut NULL',
  COUNT(*)::text
FROM contrat
WHERE statut IS NULL
UNION ALL
SELECT
  'Contrats avec statut vide',
  COUNT(*)::text
FROM contrat
WHERE statut = ''
UNION ALL
SELECT
  'Contrats actifs',
  COUNT(*)::text
FROM contrat
WHERE statut = 'actif'
UNION ALL
SELECT
  'Contrats signés',
  COUNT(*)::text
FROM contrat
WHERE statut = 'signe'
UNION ALL
SELECT
  'Contrats en attente signature',
  COUNT(*)::text
FROM contrat
WHERE statut = 'en_attente_signature'
UNION ALL
SELECT
  'Contrats brouillon',
  COUNT(*)::text
FROM contrat
WHERE statut = 'brouillon'
UNION ALL
SELECT
  'Contrats terminés',
  COUNT(*)::text
FROM contrat
WHERE statut = 'termine'
UNION ALL
SELECT
  'Contrats résiliés',
  COUNT(*)::text
FROM contrat
WHERE statut = 'resilie'
UNION ALL
SELECT
  'Contrats refusés',
  COUNT(*)::text
FROM contrat
WHERE statut = 'refuse';
