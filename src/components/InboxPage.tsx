-- Supprimer TOUTES les policies existantes
DROP POLICY IF EXISTS "Anyone on their tasks can access messages" ON messages_tache;
DROP POLICY IF EXISTS "Users can view messages on their tasks" ON messages_tache;
DROP POLICY IF EXISTS "Users can create messages on their tasks" ON messages_tache;
DROP POLICY IF EXISTS "Users can update messages on their tasks" ON messages_tache;
DROP POLICY IF EXISTS "Users can delete messages on their tasks" ON messages_tache;

-- ============================================
-- 1. POLICY SELECT - Lire les messages
-- ============================================
CREATE POLICY "select_messages"
ON messages_tache FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM taches
    WHERE taches.id = messages_tache.tache_id
    AND (
      taches.assignee_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
      OR
      taches.expediteur_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
    )
  )
);

-- ============================================
-- 2. POLICY INSERT - Créer des messages
-- ============================================
CREATE POLICY "insert_messages"
ON messages_tache FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_utilisateur
    WHERE id = auteur_id AND auth_user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM taches
    WHERE taches.id = messages_tache.tache_id
    AND (
      taches.assignee_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
      OR
      taches.expediteur_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
    )
  )
);

-- ============================================
-- 3. POLICY UPDATE - Mettre à jour les messages
-- ============================================
CREATE POLICY "update_messages"
ON messages_tache FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM taches
    WHERE taches.id = messages_tache.tache_id
    AND (
      taches.assignee_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
      OR
      taches.expediteur_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM taches
    WHERE taches.id = messages_tache.tache_id
    AND (
      taches.assignee_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
      OR
      taches.expediteur_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
    )
  )
);

-- ============================================
-- 4. POLICY DELETE - Supprimer les messages
-- ============================================
CREATE POLICY "delete_messages"
ON messages_tache FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM taches
    WHERE taches.id = messages_tache.tache_id
    AND (
      taches.assignee_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
      OR
      taches.expediteur_id IN (SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid())
    )
  )
);

-- Test
SELECT COUNT(*) as message_count FROM messages_tache;