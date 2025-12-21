-- ============================================
-- DIAGNOSTIC COMPLET CONTRATS CDI
-- ============================================
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- pour identifier pourquoi les CDI ne s'affichent pas

-- 1. Vérifier tous les modèles de contrats et leurs types
SELECT
  '=== MODÈLES DE CONTRATS ===' as info,
  NULL as id,
  NULL as nom,
  NULL as type_contrat,
  NULL as longueur_type,
  NULL as nombre_contrats
UNION ALL
SELECT
  NULL,
  m.id::text,
  m.nom,
  m.type_contrat,
  LENGTH(m.type_contrat)::text,
  COUNT(c.id)::text
FROM modeles_contrats m
LEFT JOIN contrat c ON c.modele_id = m.id
GROUP BY m.id, m.nom, m.type_contrat
ORDER BY m.created_at DESC;

-- 2. Vérifier les contrats avec leurs modèles
SELECT
  '=== CONTRATS ET LEURS MODÈLES ===' as section,
  NULL as contrat_id,
  NULL as statut,
  NULL as type_contrat,
  NULL as modele_nom,
  NULL as candidat,
  NULL as date_envoi
UNION ALL
SELECT
  NULL,
  c.id::text,
  c.statut,
  m.type_contrat,
  m.nom,
  COALESCE(p.prenom || ' ' || p.nom, 'Aucun profil'),
  c.date_envoi::text
FROM contrat c
LEFT JOIN modeles_contrats m ON c.modele_id = m.id
LEFT JOIN profil p ON c.profil_id = p.id
ORDER BY c.date_envoi DESC
LIMIT 50;

-- 3. Compter les contrats par type
SELECT
  '=== STATISTIQUES PAR TYPE ===' as section,
  NULL as type_contrat,
  NULL as nombre_contrats,
  NULL as nombre_signes
UNION ALL
SELECT
  NULL,
  COALESCE(m.type_contrat, 'TYPE MANQUANT'),
  COUNT(*)::text,
  COUNT(CASE WHEN c.statut = 'signe' THEN 1 END)::text
FROM contrat c
LEFT JOIN modeles_contrats m ON c.modele_id = m.id
GROUP BY m.type_contrat
ORDER BY COUNT(*) DESC;

-- 4. Vérifier les politiques RLS sur la table contrat
SELECT
  '=== POLITIQUES RLS SUR CONTRAT ===' as section,
  NULL as policyname,
  NULL as cmd,
  NULL as roles,
  NULL as using_expression
UNION ALL
SELECT
  NULL,
  policyname,
  cmd,
  ARRAY_TO_STRING(roles, ', '),
  qual
FROM pg_policies
WHERE tablename = 'contrat'
ORDER BY policyname;

-- 5. Vérifier si RLS est activé sur la table contrat
SELECT
  '=== STATUT RLS ===' as section,
  NULL as table_name,
  NULL as rls_enabled,
  NULL as rls_forced
UNION ALL
SELECT
  NULL,
  tablename,
  CASE WHEN rowsecurity THEN 'OUI' ELSE 'NON' END,
  CASE WHEN relforcerowsecurity THEN 'OUI' ELSE 'NON' END
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' AND tablename = 'contrat';

-- 6. Vérifier les contrats CDI spécifiquement
SELECT
  '=== CONTRATS CDI DÉTAILLÉS ===' as section,
  NULL as contrat_id,
  NULL as profil_id,
  NULL as statut,
  NULL as type_contrat_exact,
  NULL as candidat,
  NULL as date_signature
UNION ALL
SELECT
  NULL,
  c.id::text,
  c.profil_id::text,
  c.statut,
  '|' || m.type_contrat || '|',
  COALESCE(p.prenom || ' ' || p.nom, 'PROFIL MANQUANT'),
  COALESCE(c.date_signature::text, 'Non signé')
FROM contrat c
LEFT JOIN modeles_contrats m ON c.modele_id = m.id
LEFT JOIN profil p ON c.profil_id = p.id
WHERE m.type_contrat = 'CDI'
   OR m.type_contrat LIKE '%CDI%'
   OR UPPER(TRIM(m.type_contrat)) = 'CDI'
ORDER BY c.date_envoi DESC
LIMIT 20;
