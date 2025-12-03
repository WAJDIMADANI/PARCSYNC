/*
  # Ajout de la permission Import en Masse pour tous les administrateurs

  Ce script ajoute automatiquement la permission 'admin/import-bulk'
  à tous les utilisateurs ayant le rôle 'admin'.

  INSTRUCTIONS:
  1. Ouvrir Supabase Dashboard > SQL Editor
  2. Copier/coller ce script
  3. Cliquer sur "Run"
  4. Rafraîchir l'application (Ctrl+Shift+R)

  Le menu "Import en Masse" devrait maintenant apparaître dans la section Administration.
*/

-- =====================================================
-- ÉTAPE 1: Affichage des administrateurs
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LISTE DES ADMINISTRATEURS';
  RAISE NOTICE '========================================';
END $$;

SELECT
  id,
  email,
  nom,
  prenom,
  role
FROM app_utilisateur
WHERE role = 'admin'
ORDER BY email;

-- =====================================================
-- ÉTAPE 2: Ajout de la permission admin/import-bulk
-- =====================================================

DO $$
DECLARE
  v_admin_record RECORD;
  v_permission_exists BOOLEAN;
  v_admins_count INTEGER := 0;
  v_permissions_added INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AJOUT DE LA PERMISSION admin/import-bulk';
  RAISE NOTICE '========================================';

  -- Boucle sur tous les administrateurs
  FOR v_admin_record IN
    SELECT id, email, nom, prenom
    FROM app_utilisateur
    WHERE role = 'admin'
  LOOP
    v_admins_count := v_admins_count + 1;

    -- Vérifier si la permission existe déjà
    SELECT EXISTS(
      SELECT 1
      FROM utilisateur_permissions
      WHERE utilisateur_id = v_admin_record.id
      AND section_id = 'admin/import-bulk'
    ) INTO v_permission_exists;

    IF v_permission_exists THEN
      RAISE NOTICE '⚠ % (%) : Permission déjà existante',
        v_admin_record.email,
        COALESCE(v_admin_record.prenom || ' ' || v_admin_record.nom, 'Nom non renseigné');
    ELSE
      -- Ajouter la permission
      INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
      VALUES (v_admin_record.id, 'admin/import-bulk', true);

      v_permissions_added := v_permissions_added + 1;

      RAISE NOTICE '✓ % (%) : Permission ajoutée',
        v_admin_record.email,
        COALESCE(v_admin_record.prenom || ' ' || v_admin_record.nom, 'Nom non renseigné');
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Administrateurs trouvés: %', v_admins_count;
  RAISE NOTICE 'Permissions ajoutées: %', v_permissions_added;
  RAISE NOTICE 'Déjà existantes: %', v_admins_count - v_permissions_added;

  IF v_admins_count = 0 THEN
    RAISE WARNING 'Aucun administrateur trouvé dans la base de données !';
  END IF;

END $$;

-- =====================================================
-- ÉTAPE 3: Vérification finale
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION DES PERMISSIONS';
  RAISE NOTICE '========================================';
END $$;

-- Afficher tous les administrateurs avec leur statut de permission
SELECT
  u.email,
  u.nom,
  u.prenom,
  CASE
    WHEN up.id IS NOT NULL THEN '✓ Oui'
    ELSE '✗ Non'
  END as a_permission_import_bulk,
  up.actif as permission_active,
  up.created_at as permission_ajoutee_le
FROM app_utilisateur u
LEFT JOIN utilisateur_permissions up ON u.id = up.utilisateur_id
  AND up.section_id = 'admin/import-bulk'
WHERE u.role = 'admin'
ORDER BY u.email;

-- Afficher le nombre total de permissions par administrateur
SELECT
  '=== NOMBRE DE PERMISSIONS PAR ADMINISTRATEUR ===' as titre;

SELECT
  u.email,
  u.nom,
  u.prenom,
  COUNT(up.id) as nombre_total_permissions
FROM app_utilisateur u
LEFT JOIN utilisateur_permissions up ON u.id = up.utilisateur_id AND up.actif = true
WHERE u.role = 'admin'
GROUP BY u.id, u.email, u.nom, u.prenom
ORDER BY u.email;

-- =====================================================
-- INSTRUCTIONS FINALES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 CONFIGURATION TERMINÉE !';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'PROCHAINES ÉTAPES:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Videz le cache du navigateur:';
  RAISE NOTICE '   - Appuyez sur Ctrl + Shift + R (Windows/Linux)';
  RAISE NOTICE '   - Appuyez sur Cmd + Shift + R (Mac)';
  RAISE NOTICE '';
  RAISE NOTICE '2. Rafraîchissez la page de l''application';
  RAISE NOTICE '';
  RAISE NOTICE '3. Le menu "Import en Masse" devrait maintenant';
  RAISE NOTICE '   apparaître dans la section Administration';
  RAISE NOTICE '';
  RAISE NOTICE '4. Accédez à: Administration > Import en Masse';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
