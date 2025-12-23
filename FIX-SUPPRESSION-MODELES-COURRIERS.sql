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
CREATE POLICY "Admins can delete letter templates files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'letter-templates'
  AND (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  )
);

-- 3. Vérifier que les policies RLS sur modele_courrier existent
-- Si elles n'existent pas, les créer

DO $$
BEGIN
  -- Vérifier la policy DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'modele_courrier'
    AND policyname = 'Admins can delete letter templates'
  ) THEN
    CREATE POLICY "Admins can delete letter templates"
      ON modele_courrier
      FOR DELETE
      TO authenticated
      USING (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM app_utilisateur
          WHERE id = auth.uid()
          AND (role = 'admin' OR role = 'super_admin')
        )
      );
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
