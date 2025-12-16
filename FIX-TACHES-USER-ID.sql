/*
  # Fix Tâches - Problème User ID

  Le problème : Quand on crée une tâche, le user.id de l'auth ne correspond pas
  à un id dans app_utilisateur, causant une erreur 409 (Foreign Key Constraint).

  Solution : Vérifier et s'assurer que tous les utilisateurs auth ont un profil app_utilisateur
*/

-- 1. Vérifier les utilisateurs auth sans profil app_utilisateur
SELECT
  au.id as auth_id,
  au.email,
  CASE
    WHEN app.id IS NULL THEN 'MANQUANT'
    ELSE 'OK'
  END as statut_profil
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.id = au.id
WHERE app.id IS NULL;

-- 2. Créer les profils manquants pour les utilisateurs auth
INSERT INTO app_utilisateur (id, email, nom, prenom, actif)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nom', 'Utilisateur'),
  COALESCE(au.raw_user_meta_data->>'prenom', 'Système'),
  true
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.id = au.id
WHERE app.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Vérifier que tous les utilisateurs ont maintenant un profil
SELECT
  COUNT(*) as total_auth_users,
  COUNT(app.id) as total_app_users,
  CASE
    WHEN COUNT(*) = COUNT(app.id) THEN '✓ TOUS LES UTILISATEURS ONT UN PROFIL'
    ELSE '✗ IL MANQUE DES PROFILS'
  END as statut
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.id = au.id;
