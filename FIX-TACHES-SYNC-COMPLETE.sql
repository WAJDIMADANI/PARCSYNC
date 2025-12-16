/*
  # Synchronisation complète auth.users <-> app_utilisateur pour les tâches

  Le problème : Les tâches utilisent user.id de auth, mais app_utilisateur peut avoir
  des IDs différents ou pas de correspondance auth_user_id.

  Solutions :
  1. Si auth_user_id existe : le mettre à jour
  2. Si auth_user_id n'existe pas : vérifier que app_utilisateur.id = auth.users.id
*/

-- ÉTAPE 1: Vérifier si la colonne auth_user_id existe
DO $$
BEGIN
  -- Si auth_user_id existe, la mettre à jour
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_utilisateur' AND column_name = 'auth_user_id'
  ) THEN
    -- Mettre à jour auth_user_id pour tous les utilisateurs existants
    UPDATE app_utilisateur
    SET auth_user_id = au.id
    FROM auth.users au
    WHERE app_utilisateur.email = au.email
    AND (app_utilisateur.auth_user_id IS NULL OR app_utilisateur.auth_user_id != au.id);

    RAISE NOTICE 'Colonne auth_user_id mise à jour';
  ELSE
    RAISE NOTICE 'Colonne auth_user_id n''existe pas - la table utilise directement l''ID auth';
  END IF;
END $$;

-- ÉTAPE 2: Créer les profils manquants
-- On utilise DO pour éviter les erreurs de conflit
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN
    SELECT id, email, raw_user_meta_data FROM auth.users
  LOOP
    -- Vérifier si l'utilisateur existe par email
    IF NOT EXISTS (SELECT 1 FROM app_utilisateur WHERE email = auth_user.email) THEN
      -- Créer le profil avec l'ID de auth
      INSERT INTO app_utilisateur (id, email, nom, prenom, actif)
      VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(auth_user.raw_user_meta_data->>'nom', 'Utilisateur'),
        COALESCE(auth_user.raw_user_meta_data->>'prenom', 'Système'),
        true
      )
      ON CONFLICT (id) DO NOTHING;

      RAISE NOTICE 'Profil créé pour %', auth_user.email;
    END IF;
  END LOOP;
END $$;

-- ÉTAPE 3: Vérification finale
SELECT
  'auth.users' as table_source,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT
  'app_utilisateur' as table_source,
  COUNT(*) as total
FROM app_utilisateur;

-- ÉTAPE 4: Vérifier les correspondances
SELECT
  au.email,
  au.id as auth_id,
  app.id as app_id,
  CASE
    WHEN app.id = au.id THEN '✓ OK'
    WHEN app.id IS NULL THEN '✗ Manquant'
    ELSE '⚠ ID différent'
  END as statut
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.email = au.email;
