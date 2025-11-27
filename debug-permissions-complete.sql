-- SCRIPT DE DIAGNOSTIC COMPLET DES PERMISSIONS

-- ======================================================
-- 1. VÉRIFIER LA VUE utilisateur_avec_permissions
-- ======================================================
SELECT
  '1. VUE utilisateur_avec_permissions' as etape,
  *
FROM utilisateur_avec_permissions
WHERE email = 'admin@mad-impact.com';

-- ======================================================
-- 2. VÉRIFIER LES DONNÉES BRUTES
-- ======================================================
SELECT
  '2. TABLE app_utilisateur' as etape,
  id,
  auth_user_id,
  email,
  nom,
  prenom,
  actif
FROM app_utilisateur
WHERE email = 'admin@mad-impact.com';

-- ======================================================
-- 3. VÉRIFIER LES PERMISSIONS DANS LA TABLE
-- ======================================================
SELECT
  '3. TABLE utilisateur_permissions' as etape,
  up.id,
  up.section_id,
  up.actif,
  au.email
FROM utilisateur_permissions up
JOIN app_utilisateur au ON au.id = up.utilisateur_id
WHERE au.email = 'admin@mad-impact.com'
ORDER BY up.section_id;

-- ======================================================
-- 4. COMPTER LES PERMISSIONS
-- ======================================================
SELECT
  '4. COMPTEUR' as etape,
  au.email,
  COUNT(up.id) as total_permissions,
  COUNT(up.id) FILTER (WHERE up.actif = true) as permissions_actives
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
WHERE au.email = 'admin@mad-impact.com'
GROUP BY au.email;
