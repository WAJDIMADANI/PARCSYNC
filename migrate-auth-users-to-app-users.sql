/*
  # Migration des utilisateurs Supabase Auth vers app_utilisateur

  Ce script migre automatiquement tous les utilisateurs de Supabase Auth
  vers la table app_utilisateur avec des permissions de base.

  Le premier utilisateur créé obtient automatiquement TOUTES les permissions.
  Les autres utilisateurs n'obtiennent que les permissions de lecture de base.

  Utilisez ce script si vous avez déjà des utilisateurs dans Supabase Auth
  et que vous voulez les migrer vers le système de permissions.
*/

-- Fonction temporaire pour créer un utilisateur avec permissions
CREATE OR REPLACE FUNCTION migrate_auth_user_to_app_user(
  p_auth_user_id uuid,
  p_email text,
  p_is_first_user boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_permission_record record;
  v_permissions text[] := ARRAY[
    'rh/candidats',
    'rh/salaries',
    'rh/contrats',
    'rh/courriers',
    'rh/alertes',
    'rh/notifications',
    'rh/incidents',
    'rh/incidents-historique',
    'rh/vivier',
    'rh/demandes',
    'parc/vehicules',
    'parc/ct-assurance',
    'parc/maintenance',
    'admin/sites',
    'admin/secteurs',
    'admin/postes',
    'admin/modeles',
    'admin/modeles-contrats',
    'admin/utilisateurs'
  ];
  v_basic_permissions text[] := ARRAY[
    'rh/candidats',
    'rh/salaries',
    'rh/demandes'
  ];
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT id INTO v_user_id
  FROM app_utilisateur
  WHERE auth_user_id = p_auth_user_id;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Utilisateur % existe déjà avec id %', p_email, v_user_id;
    RETURN v_user_id;
  END IF;

  -- Extraire le nom de l'email (partie avant @)
  DECLARE
    v_email_name text := split_part(p_email, '@', 1);
    v_nom text := 'User';
    v_prenom text := v_email_name;
  BEGIN
    -- Si l'email contient un point, séparer prénom et nom
    IF position('.' in v_email_name) > 0 THEN
      v_prenom := initcap(split_part(v_email_name, '.', 1));
      v_nom := initcap(split_part(v_email_name, '.', 2));
    ELSE
      v_prenom := initcap(v_email_name);
    END IF;

    -- Créer l'utilisateur
    INSERT INTO app_utilisateur (auth_user_id, email, nom, prenom, actif)
    VALUES (p_auth_user_id, p_email, v_nom, v_prenom, true)
    RETURNING id INTO v_user_id;

    RAISE NOTICE 'Utilisateur créé: % % (%) avec id %', v_prenom, v_nom, p_email, v_user_id;
  END;

  -- Assigner les permissions
  IF p_is_first_user THEN
    -- Premier utilisateur: toutes les permissions
    RAISE NOTICE 'Premier utilisateur: attribution de toutes les permissions';
    FOREACH v_permission_record.section_id IN ARRAY v_permissions
    LOOP
      INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
      VALUES (v_user_id, v_permission_record.section_id, true);
    END LOOP;
  ELSE
    -- Autres utilisateurs: permissions de base uniquement
    RAISE NOTICE 'Utilisateur standard: attribution des permissions de base';
    FOREACH v_permission_record.section_id IN ARRAY v_basic_permissions
    LOOP
      INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
      VALUES (v_user_id, v_permission_record.section_id, true);
    END LOOP;
  END IF;

  RETURN v_user_id;
END;
$$;

-- Migration des utilisateurs
DO $$
DECLARE
  v_auth_user record;
  v_user_count integer := 0;
  v_is_first boolean := true;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DÉBUT DE LA MIGRATION DES UTILISATEURS';
  RAISE NOTICE '========================================';

  -- Parcourir tous les utilisateurs Auth
  FOR v_auth_user IN
    SELECT DISTINCT
      au.id,
      au.email
    FROM auth.users au
    WHERE au.email IS NOT NULL
    ORDER BY au.created_at ASC
  LOOP
    BEGIN
      RAISE NOTICE '';
      RAISE NOTICE 'Migration de: % (%)', v_auth_user.email, v_auth_user.id;

      PERFORM migrate_auth_user_to_app_user(
        v_auth_user.id,
        v_auth_user.email,
        v_is_first
      );

      v_user_count := v_user_count + 1;
      v_is_first := false;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erreur lors de la migration de %: %', v_auth_user.email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION TERMINÉE';
  RAISE NOTICE 'Utilisateurs migrés: %', v_user_count;
  RAISE NOTICE '========================================';
END;
$$;

-- Nettoyer la fonction temporaire
DROP FUNCTION IF EXISTS migrate_auth_user_to_app_user(uuid, text, boolean);

-- Afficher le résultat final
SELECT
  'RÉSULTATS DE LA MIGRATION' as titre,
  '' as separator;

SELECT
  au.nom,
  au.prenom,
  au.email,
  au.actif,
  COUNT(up.id) as nombre_permissions,
  array_agg(up.section_id ORDER BY up.section_id) as permissions
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON up.utilisateur_id = au.id AND up.actif = true
GROUP BY au.id, au.nom, au.prenom, au.email, au.actif
ORDER BY au.created_at;
