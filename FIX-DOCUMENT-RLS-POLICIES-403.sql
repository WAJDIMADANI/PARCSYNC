-- FIX pour l'erreur 403 sur la table document
-- Correction des policies RLS pour permettre l'accès aux documents

-- 1. Vérifier l'état actuel des policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'document'
ORDER BY policyname;

-- 2. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Admins can view all documents" ON document;
DROP POLICY IF EXISTS "Admins can insert documents" ON document;
DROP POLICY IF EXISTS "Admins can update documents" ON document;
DROP POLICY IF EXISTS "Admins can delete documents" ON document;
DROP POLICY IF EXISTS "Users can view own documents" ON document;
DROP POLICY IF EXISTS "Users can insert own documents" ON document;
DROP POLICY IF EXISTS "Users can update own documents" ON document;
DROP POLICY IF EXISTS "Users can delete own documents" ON document;
DROP POLICY IF EXISTS "Anonymous can upload medical certificates" ON document;

-- 3. Activer RLS si ce n'est pas déjà fait
ALTER TABLE document ENABLE ROW LEVEL SECURITY;

-- 4. Créer des policies permissives pour les utilisateurs authentifiés

-- SELECT: Les utilisateurs peuvent voir leurs propres documents ou ceux des profils qu'ils gèrent
CREATE POLICY "Authenticated users can view documents"
  ON document
  FOR SELECT
  TO authenticated
  USING (
    -- L'utilisateur peut voir ses propres documents
    owner_id IN (SELECT id FROM profil WHERE user_id = auth.uid())
    OR
    -- Ou tous les documents si l'utilisateur a les permissions appropriées
    EXISTS (
      SELECT 1 FROM profil p
      WHERE p.user_id = auth.uid()
      AND (p.role = 'admin' OR p.role = 'super_admin' OR p.role = 'manager')
    )
  );

-- INSERT: Les utilisateurs peuvent créer des documents pour leurs profils
CREATE POLICY "Authenticated users can insert documents"
  ON document
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- L'utilisateur peut créer des documents pour son profil
    owner_id IN (SELECT id FROM profil WHERE user_id = auth.uid())
    OR
    -- Ou pour n'importe quel profil si l'utilisateur a les permissions
    EXISTS (
      SELECT 1 FROM profil p
      WHERE p.user_id = auth.uid()
      AND (p.role = 'admin' OR p.role = 'super_admin' OR p.role = 'manager')
    )
  );

-- UPDATE: Les utilisateurs peuvent mettre à jour leurs documents
CREATE POLICY "Authenticated users can update documents"
  ON document
  FOR UPDATE
  TO authenticated
  USING (
    owner_id IN (SELECT id FROM profil WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profil p
      WHERE p.user_id = auth.uid()
      AND (p.role = 'admin' OR p.role = 'super_admin' OR p.role = 'manager')
    )
  )
  WITH CHECK (
    owner_id IN (SELECT id FROM profil WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profil p
      WHERE p.user_id = auth.uid()
      AND (p.role = 'admin' OR p.role = 'super_admin' OR p.role = 'manager')
    )
  );

-- DELETE: Les utilisateurs peuvent supprimer leurs documents
CREATE POLICY "Authenticated users can delete documents"
  ON document
  FOR DELETE
  TO authenticated
  USING (
    owner_id IN (SELECT id FROM profil WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profil p
      WHERE p.user_id = auth.uid()
      AND (p.role = 'admin' OR p.role = 'super_admin' OR p.role = 'manager')
    )
  );

-- 5. Policy spéciale pour les certificats médicaux anonymes
CREATE POLICY "Anonymous can upload medical certificates"
  ON document
  FOR INSERT
  TO anon
  WITH CHECK (
    type_document = 'certificat_medical'
  );

-- 6. Vérifier les nouvelles policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'document'
ORDER BY policyname;

-- 7. Accorder les permissions de base sur la table
GRANT SELECT, INSERT, UPDATE, DELETE ON document TO authenticated;
GRANT INSERT ON document TO anon;

-- Test rapide: Vérifier que la table est accessible
SELECT COUNT(*) as total_documents FROM document;
