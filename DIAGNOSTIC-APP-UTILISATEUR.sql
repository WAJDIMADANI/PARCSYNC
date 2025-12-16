/*
  Diagnostic: Comprendre la structure et les données de app_utilisateur
*/

-- 1. Voir la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'app_utilisateur'
ORDER BY ordinal_position;

-- 2. Voir les utilisateurs dans app_utilisateur
SELECT id, email, nom, prenom, auth_user_id
FROM app_utilisateur
ORDER BY email;

-- 3. Voir les utilisateurs dans auth.users
SELECT id, email
FROM auth.users
ORDER BY email;

-- 4. Comparer les deux tables et trouver les désynchronisations
SELECT
  au.id as auth_id,
  au.email as auth_email,
  app.id as app_id,
  app.auth_user_id as app_auth_user_id,
  CASE
    WHEN app.id IS NULL THEN 'Manquant dans app_utilisateur'
    WHEN app.id != au.id AND app.auth_user_id IS NULL THEN 'ID différent, auth_user_id NULL'
    WHEN app.id != au.id AND app.auth_user_id != au.id THEN 'ID différent, auth_user_id différent'
    WHEN app.id = au.id THEN 'OK - IDs correspondent'
    WHEN app.auth_user_id = au.id THEN 'OK - auth_user_id correct'
    ELSE 'Autre problème'
  END as statut
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.email = au.email;
