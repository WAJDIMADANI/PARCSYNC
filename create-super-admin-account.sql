/*
  # Création d'un compte Super-Administrateur avec accès complet

  Ce script crée un nouveau compte administrateur avec:
  - Email: admin@mad-impact.com
  - Mot de passe: Admin123!
  - Accès à toutes les 19 permissions (RH, Parc, Administration)

  IMPORTANT: Changez le mot de passe après la première connexion!
*/

DO $$
DECLARE
  v_user_id uuid;
  v_app_user_id uuid;
BEGIN
  -- Étape 1: Créer l'utilisateur dans auth.users
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Création du compte Super-Administrateur...';
  RAISE NOTICE '==============================================';

  -- Vérifier si l'utilisateur existe déjà dans auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@mad-impact.com';

  IF v_user_id IS NULL THEN
    -- Créer le compte dans auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@mad-impact.com',
      crypt('Admin123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;

    RAISE NOTICE 'Compte auth.users créé avec ID: %', v_user_id;
  ELSE
    RAISE NOTICE 'Compte auth.users existe déjà avec ID: %', v_user_id;
  END IF;

  -- Étape 2: Créer l'utilisateur dans app_utilisateur
  SELECT id INTO v_app_user_id
  FROM app_utilisateur
  WHERE email = 'admin@mad-impact.com';

  IF v_app_user_id IS NULL THEN
    INSERT INTO app_utilisateur (
      id,
      auth_user_id,
      email,
      nom,
      prenom,
      actif,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'admin@mad-impact.com',
      'Système',
      'Admin',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_app_user_id;

    RAISE NOTICE 'Compte app_utilisateur créé avec ID: %', v_app_user_id;
  ELSE
    -- Mettre à jour l'auth_user_id si nécessaire
    UPDATE app_utilisateur
    SET auth_user_id = v_user_id,
        actif = true,
        updated_at = NOW()
    WHERE id = v_app_user_id;

    RAISE NOTICE 'Compte app_utilisateur existe déjà avec ID: %', v_app_user_id;
  END IF;

  -- Étape 3: Supprimer les anciennes permissions si elles existent
  DELETE FROM utilisateur_permissions WHERE utilisateur_id = v_app_user_id;
  RAISE NOTICE 'Anciennes permissions supprimées';

  -- Étape 4: Ajouter TOUTES les permissions (19 sections)
  INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
  VALUES
    -- PERMISSIONS RH (10 sections)
    (v_app_user_id, 'rh/candidats', true),
    (v_app_user_id, 'rh/salaries', true),
    (v_app_user_id, 'rh/contrats', true),
    (v_app_user_id, 'rh/courriers', true),
    (v_app_user_id, 'rh/alertes', true),
    (v_app_user_id, 'rh/notifications', true),
    (v_app_user_id, 'rh/demandes', true),
    (v_app_user_id, 'rh/incidents', true),
    (v_app_user_id, 'rh/historique', true),
    (v_app_user_id, 'rh/vivier', true),

    -- PERMISSIONS PARC (3 sections)
    (v_app_user_id, 'parc/vehicules', true),
    (v_app_user_id, 'parc/maintenance', true),
    (v_app_user_id, 'parc/carburant', true),

    -- PERMISSIONS ADMINISTRATION (6 sections)
    (v_app_user_id, 'admin/utilisateurs', true),
    (v_app_user_id, 'admin/secteurs', true),
    (v_app_user_id, 'admin/postes', true),
    (v_app_user_id, 'admin/sites', true),
    (v_app_user_id, 'admin/modeles-contrats', true),
    (v_app_user_id, 'admin/modeles-courriers', true);

  RAISE NOTICE '19 permissions ajoutées avec succès!';
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'COMPTE CRÉÉ AVEC SUCCÈS!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Email: admin@mad-impact.com';
  RAISE NOTICE 'Mot de passe: Admin123!';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Changez le mot de passe après connexion!';
  RAISE NOTICE '==============================================';

END $$;

-- Vérification finale: Afficher les permissions du nouveau compte
SELECT
  u.email,
  u.nom,
  u.prenom,
  u.actif,
  COUNT(up.section_id) as nombre_permissions,
  array_agg(up.section_id ORDER BY up.section_id) as liste_permissions
FROM app_utilisateur u
LEFT JOIN utilisateur_permissions up ON u.id = up.utilisateur_id
WHERE u.email = 'admin@mad-impact.com'
GROUP BY u.id, u.email, u.nom, u.prenom, u.actif;
