-- =====================================================
-- DIAGNOSTIC - Permission Comptabilité
-- =====================================================
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Vérifier toutes les permissions qui contiennent "compta"
SELECT '=== 1. Permissions existantes avec "compta" ===' as diagnostic;
SELECT DISTINCT section_id, COUNT(*) as nb_utilisateurs
FROM utilisateur_permissions
WHERE section_id LIKE '%compta%'
GROUP BY section_id
ORDER BY section_id;

-- 2. Vérifier VOS permissions actuelles (remplacez par votre email)
SELECT '=== 2. Vos permissions (REMPLACEZ L''EMAIL) ===' as diagnostic;
SELECT
  au.email,
  up.section_id,
  up.actif,
  up.created_at
FROM utilisateur_permissions up
JOIN app_utilisateur au ON up.utilisateur_id = au.id
WHERE au.email = 'VOTRE_EMAIL@example.com'  -- REMPLACEZ ICI
  AND up.actif = true
ORDER BY up.section_id;

-- 3. Vérifier toutes les permissions liées à la comptabilité
SELECT '=== 3. Toutes les permissions comptabilité ===' as diagnostic;
SELECT
  au.email,
  au.nom,
  au.prenom,
  up.section_id,
  up.actif
FROM utilisateur_permissions up
JOIN app_utilisateur au ON up.utilisateur_id = au.id
WHERE up.section_id IN ('comptabilite', 'compta', 'compta/entrees', 'compta/sorties', 'compta/rib', 'compta/adresse', 'compta/avenants', 'compta/mutuelle', 'compta/ar', 'compta/avance-frais')
ORDER BY au.email, up.section_id;

-- 4. Voir la vue utilisateur_avec_permissions pour un utilisateur
SELECT '=== 4. Vue utilisateur_avec_permissions (REMPLACEZ L''EMAIL) ===' as diagnostic;
SELECT
  email,
  nom,
  prenom,
  permissions
FROM utilisateur_avec_permissions
WHERE email = 'VOTRE_EMAIL@example.com';  -- REMPLACEZ ICI

-- 5. Compter toutes les sections de permissions distinctes
SELECT '=== 5. Toutes les sections de permissions disponibles ===' as diagnostic;
SELECT DISTINCT section_id, COUNT(*) as nb_utilisateurs
FROM utilisateur_permissions
WHERE actif = true
GROUP BY section_id
ORDER BY section_id;
