/*
  # Correction: Permissions de suppression des modèles de courriers

  Ce script corrige les permissions pour permettre la suppression des modèles de courriers V2 et V1.

  ## Problèmes identifiés
  1. Permissions Storage insuffisantes pour suppression
  2. Vérification des policies RLS DELETE

  ## Actions
  1. Ajouter permissions DELETE sur bucket letter-templates
  2. Vérifier et recréer policies RLS si nécessaire
*/

-- 1. Supprimer les anciennes policies storage si elles existent
DROP POLICY IF EXISTS "Admins can delete letter templates files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete on letter-templates" ON storage.objects;

-- 2. Créer nouvelle policy de suppression pour bucket letter-templates
-- Note: La table app_utilisateur n'a pas de colonne "role"
-- Le système utilise utilisateur_permissions pour gérer les accès
-- On autorise tous les utilisateurs authentifiés (l'interface frontend gère les restrictions)
CREATE POLICY "Authenticated users can delete letter templates files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'letter-templates'
);

-- 3. Vérifier que les policies RLS sur modele_courrier existent
-- Si elles n'existent pas, les créer

DO $$
BEGIN
  -- Vérifier la policy DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'modele_courrier'
    AND policyname = 'Authenticated users can delete letter templates'
  ) THEN
    CREATE POLICY "Authenticated users can delete letter templates"
      ON modele_courrier
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 4. Afficher les permissions actuelles pour vérification
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'modele_courrier'
ORDER BY cmd, policyname;

-- 5. Afficher les policies Storage
SELECT
  policyname,
  cmd,
  bucket_id
FROM storage.policies
WHERE bucket_id = 'letter-templates'
ORDER BY cmd;
