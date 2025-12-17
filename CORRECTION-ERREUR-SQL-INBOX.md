# Correction de l'erreur SQL (ligne 152)

## Problème corrigé

L'erreur était à la ligne 152 :
```
erreur de syntaxe à ou près de « NON »
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS taches;
```

La syntaxe `IF NOT EXISTS` n'est pas supportée avec `ALTER PUBLICATION` en PostgreSQL.

## Solution appliquée

J'ai modifié le fichier **`FIX-INBOX-COMPLET-MAINTENANT.sql`** pour utiliser une syntaxe correcte avec des blocs `DO $$`.

## Que faire maintenant

1. **Rafraîchissez la page Supabase** dans votre navigateur (F5)

2. **Rechargez le fichier SQL** en copiant à nouveau le contenu de `FIX-INBOX-COMPLET-MAINTENANT.sql`

3. **Exécutez le script** en cliquant sur "Run" (ou Ctrl+Enter)

4. Cette fois ça devrait fonctionner sans erreur !

## Alternative rapide

Si vous ne voulez pas recharger, vous pouvez aussi exécuter directement ce script corrigé :

```sql
/*
  CORRECTION COMPLÈTE DU SYSTÈME INBOX
*/

-- ===============================================
-- PARTIE 1 : CORRIGER LES POLITIQUES RLS TACHES
-- ===============================================

DROP POLICY IF EXISTS "Users can view tasks assigned to them or sent by them" ON taches;
DROP POLICY IF EXISTS "Users can create tasks" ON taches;
DROP POLICY IF EXISTS "Assignee can update their tasks" ON taches;
DROP POLICY IF EXISTS "Users can update their tasks" ON taches;
DROP POLICY IF EXISTS "Users can delete tasks they are involved in" ON taches;

CREATE POLICY "Users can view tasks assigned to them or sent by them"
  ON taches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND (app_utilisateur.id = taches.assignee_id OR app_utilisateur.id = taches.expediteur_id)
    )
  );

CREATE POLICY "Users can create tasks"
  ON taches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND app_utilisateur.id = expediteur_id
    )
  );

CREATE POLICY "Users can update their tasks"
  ON taches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND (app_utilisateur.id = assignee_id OR app_utilisateur.id = expediteur_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND (app_utilisateur.id = assignee_id OR app_utilisateur.id = expediteur_id)
    )
  );

CREATE POLICY "Users can delete tasks they are involved in"
  ON taches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND (app_utilisateur.id = assignee_id OR app_utilisateur.id = expediteur_id)
    )
  );

-- ===============================================
-- PARTIE 2 : CRÉER LA TABLE TACHES_MESSAGES
-- ===============================================

CREATE TABLE IF NOT EXISTS taches_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tache_id uuid REFERENCES taches(id) ON DELETE CASCADE NOT NULL,
  auteur_id uuid REFERENCES app_utilisateur(id) ON DELETE CASCADE NOT NULL,
  contenu text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_taches_messages_tache_id ON taches_messages(tache_id);
CREATE INDEX IF NOT EXISTS idx_taches_messages_auteur_id ON taches_messages(auteur_id);
CREATE INDEX IF NOT EXISTS idx_taches_messages_created_at ON taches_messages(created_at DESC);

-- ===============================================
-- PARTIE 3 : POLITIQUES RLS TACHES_MESSAGES
-- ===============================================

ALTER TABLE taches_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages of their tasks" ON taches_messages;
DROP POLICY IF EXISTS "Users can create messages on their tasks" ON taches_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON taches_messages;

CREATE POLICY "Users can view messages of their tasks"
  ON taches_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM taches t
      INNER JOIN app_utilisateur au ON au.auth_user_id = auth.uid()
      WHERE t.id = taches_messages.tache_id
      AND (t.assignee_id = au.id OR t.expediteur_id = au.id)
    )
  );

CREATE POLICY "Users can create messages on their tasks"
  ON taches_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM taches t
      INNER JOIN app_utilisateur au ON au.auth_user_id = auth.uid()
      WHERE t.id = tache_id
      AND (t.assignee_id = au.id OR t.expediteur_id = au.id)
      AND au.id = auteur_id
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON taches_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.auth_user_id = auth.uid()
      AND app_utilisateur.id = auteur_id
    )
  );

-- ===============================================
-- PARTIE 4 : ACTIVER REAL-TIME (CORRIGÉ)
-- ===============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'taches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE taches;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'taches_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE taches_messages;
  END IF;
END $$;

-- ===============================================
-- VÉRIFICATION FINALE
-- ===============================================

SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('taches', 'taches_messages')
ORDER BY tablename, policyname;

SELECT '✅ INSTALLATION COMPLÈTE !' as resultat;
```

Copiez ce script ci-dessus et exécutez-le directement dans l'éditeur SQL !
