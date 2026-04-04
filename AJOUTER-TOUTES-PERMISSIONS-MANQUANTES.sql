/*
  Ajouter toutes les permissions manquantes pour les nouveaux onglets

  Ce script ajoute les permissions pour tous les onglets visibles dans la sidebar
  mais qui n'étaient pas disponibles dans la gestion des permissions :

  - rh/courriers-generes
  - rh/documents-manquants
  - parc/locations
  - parc/etats-des-lieux
  - exports/rh
  - exports/parc
  - admin/generer-courrier
  - admin/generer-courrier-v2
  - admin/modeles-courriers-v2
  - admin/import-salarie
  - admin/import-bulk
  - admin/demandes-externes
  - admin/import-vehicle-references
*/

-- Insérer les permissions manquantes pour TOUS les utilisateurs actifs
DO $$
DECLARE
  user_record RECORD;
  permission_id TEXT;
  new_permissions TEXT[] := ARRAY[
    'rh/courriers-generes',
    'rh/documents-manquants',
    'parc/locations',
    'parc/etats-des-lieux',
    'exports/rh',
    'exports/parc',
    'admin/generer-courrier',
    'admin/generer-courrier-v2',
    'admin/modeles-courriers-v2',
    'admin/import-salarie',
    'admin/import-bulk',
    'admin/demandes-externes',
    'admin/import-vehicle-references'
  ];
BEGIN
  -- Pour chaque utilisateur actif
  FOR user_record IN
    SELECT id, email FROM app_utilisateur WHERE actif = true
  LOOP
    RAISE NOTICE 'Traitement utilisateur: % (%)', user_record.email, user_record.id;

    -- Pour chaque nouvelle permission
    FOREACH permission_id IN ARRAY new_permissions
    LOOP
      -- Insérer la permission si elle n'existe pas déjà
      INSERT INTO utilisateur_permission (utilisateur_id, section_id, actif)
      VALUES (user_record.id, permission_id, true)
      ON CONFLICT (utilisateur_id, section_id)
      DO UPDATE SET actif = true;

      RAISE NOTICE '  - Permission ajoutée: %', permission_id;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Terminé ! Toutes les permissions ont été ajoutées.';
END $$;

-- Vérifier les permissions ajoutées
SELECT
  au.email,
  au.nom,
  au.prenom,
  COUNT(up.id) as nb_permissions
FROM app_utilisateur au
LEFT JOIN utilisateur_permission up ON au.id = up.utilisateur_id AND up.actif = true
WHERE au.actif = true
GROUP BY au.id, au.email, au.nom, au.prenom
ORDER BY au.email;
