/*
  # Correction finale: Synchroniser auth_user_id avec auth.users

  Problème identifié: Les IDs dans app_utilisateur sont différents des IDs dans auth.users
  Solution: Mettre à jour auth_user_id pour pointer vers le bon auth.users.id
*/

-- ÉTAPE 1: Mettre à jour auth_user_id pour tous les utilisateurs
UPDATE app_utilisateur
SET auth_user_id = au.id
FROM auth.users au
WHERE app_utilisateur.email = au.email;

-- ÉTAPE 2: Vérifier la synchronisation
SELECT
  au.email,
  au.id as auth_id,
  app.id as app_id,
  app.auth_user_id,
  CASE
    WHEN app.auth_user_id = au.id THEN '✓ Synchronisé'
    WHEN app.auth_user_id IS NULL THEN '✗ auth_user_id NULL'
    ELSE '✗ auth_user_id incorrect'
  END as statut
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.email = au.email;

-- ÉTAPE 3: Vérifier qu'il n'y a plus de NULL
SELECT
  COUNT(*) as total_utilisateurs,
  COUNT(auth_user_id) as avec_auth_user_id,
  COUNT(*) - COUNT(auth_user_id) as sans_auth_user_id
FROM app_utilisateur;
