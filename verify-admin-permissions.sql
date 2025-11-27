-- Vérifier le compte admin et ses permissions

-- 1. Vérifier le compte dans auth.users
SELECT
  'AUTH.USERS' as table_name,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'admin@mad-impact.com';

-- 2. Vérifier le compte dans app_utilisateur
SELECT
  'APP_UTILISATEUR' as table_name,
  id,
  auth_user_id,
  email,
  nom,
  prenom,
  actif,
  created_at
FROM app_utilisateur
WHERE email = 'admin@mad-impact.com';

-- 3. Vérifier les permissions
SELECT
  'UTILISATEUR_PERMISSIONS' as table_name,
  up.id,
  up.utilisateur_id,
  up.section_id,
  up.actif,
  au.email
FROM utilisateur_permissions up
JOIN app_utilisateur au ON au.id = up.utilisateur_id
WHERE au.email = 'admin@mad-impact.com'
ORDER BY up.section_id;

-- 4. Compter le nombre de permissions
SELECT
  'NOMBRE_PERMISSIONS' as info,
  au.email,
  COUNT(up.id) as total_permissions
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
WHERE au.email = 'admin@mad-impact.com'
GROUP BY au.email;
