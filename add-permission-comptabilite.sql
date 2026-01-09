/*
  # Ajouter la permission "comptabilite" au système de permissions

  1. Création de la permission
    - Ajoute la permission "comptabilite" pour contrôler l'accès au module comptabilité

  2. Attribution de la permission
    - Attribue automatiquement la permission aux utilisateurs qui ont déjà la permission "admin"
    - Les autres utilisateurs devront se voir attribuer manuellement cette permission

  3. Utilisation
    - Pour donner accès au module comptabilité à un utilisateur spécifique, exécutez :
      INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
      VALUES ('ID_UTILISATEUR', 'comptabilite', true)
      ON CONFLICT (utilisateur_id, section_id) DO UPDATE SET actif = true;
*/

-- Vérifier que la table utilisateur_permissions existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'utilisateur_permissions') THEN
    RAISE EXCEPTION 'La table utilisateur_permissions n''existe pas. Veuillez d''abord créer le système de permissions.';
  END IF;
END $$;

-- Ajouter la permission "comptabilite" à tous les administrateurs existants
INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT DISTINCT
  up.utilisateur_id,
  'comptabilite' as section_id,
  true as actif
FROM utilisateur_permissions up
WHERE up.section_id = 'admin'
  AND up.actif = true
  AND NOT EXISTS (
    SELECT 1 FROM utilisateur_permissions up2
    WHERE up2.utilisateur_id = up.utilisateur_id
      AND up2.section_id = 'comptabilite'
  );

-- Afficher les utilisateurs qui ont maintenant accès à la comptabilité
SELECT
  au.email,
  au.nom,
  au.prenom,
  'comptabilite' as permission,
  up.actif,
  up.created_at
FROM utilisateur_permissions up
JOIN app_utilisateur au ON up.utilisateur_id = au.id
WHERE up.section_id = 'comptabilite'
ORDER BY au.email;
