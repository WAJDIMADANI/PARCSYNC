/*
  # FORCER L'AJOUT DES 19 PERMISSIONS COMPLÈTES

  Ce script:
  1. Trouve le compte admin@mad-impact.com dans app_utilisateur
  2. SUPPRIME toutes ses permissions existantes
  3. AJOUTE les 19 permissions complètes (RH + Parc + Admin)

  Utilisation: Copie et exécute ce script dans Supabase SQL Editor
*/

DO $$
DECLARE
  v_app_user_id uuid;
  v_permissions_count integer;
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'AJOUT FORCÉ DES PERMISSIONS COMPLÈTES';
  RAISE NOTICE '==============================================';

  -- Étape 1: Trouver l'utilisateur dans app_utilisateur
  SELECT id INTO v_app_user_id
  FROM app_utilisateur
  WHERE email = 'admin@mad-impact.com';

  IF v_app_user_id IS NULL THEN
    RAISE EXCEPTION 'ERREUR: Le compte admin@mad-impact.com n''existe pas dans app_utilisateur!';
  END IF;

  RAISE NOTICE 'Utilisateur trouvé avec ID: %', v_app_user_id;

  -- Étape 2: Supprimer TOUTES les permissions existantes
  DELETE FROM utilisateur_permissions WHERE utilisateur_id = v_app_user_id;
  RAISE NOTICE 'Anciennes permissions supprimées';

  -- Étape 3: Ajouter les 19 permissions complètes
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

  -- Étape 4: Vérifier le nombre de permissions ajoutées
  SELECT COUNT(*) INTO v_permissions_count
  FROM utilisateur_permissions
  WHERE utilisateur_id = v_app_user_id AND actif = true;

  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SUCCÈS! % permissions ajoutées', v_permissions_count;
  RAISE NOTICE '==============================================';

END $$;

-- Vérification: Afficher toutes les permissions du compte
SELECT
  '✓ VÉRIFICATION' as status,
  u.email,
  u.nom,
  u.prenom,
  COUNT(up.section_id) as nombre_permissions,
  array_agg(up.section_id ORDER BY up.section_id) as permissions
FROM app_utilisateur u
LEFT JOIN utilisateur_permissions up ON u.id = up.utilisateur_id AND up.actif = true
WHERE u.email = 'admin@mad-impact.com'
GROUP BY u.id, u.email, u.nom, u.prenom;
