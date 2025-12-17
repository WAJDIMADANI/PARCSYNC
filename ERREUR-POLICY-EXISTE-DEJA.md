# Erreur : La politique existe déjà

## L'erreur

```
ERREUR : 42710 : la politique « Les utilisateurs peuvent mettre à jour leurs tâches »
pour la table « taches » existe déjà
```

## Pourquoi cette erreur ?

Cette erreur apparaît quand vous essayez d'exécuter **à nouveau** le script `FIX-INBOX-COMPLET-MAINTENANT.sql` alors qu'il a **déjà été exécuté** une première fois.

C'est **NORMAL** et **PAS GRAVE** !

## Solution

Vous avez 2 options :

### Option 1 : Exécuter seulement le script des messages non lus (RECOMMANDÉ)

Si vous avez déjà exécuté `FIX-INBOX-COMPLET-MAINTENANT.sql` une fois :

1. **NE LE RÉ-EXÉCUTEZ PAS**
2. Exécutez seulement : **`add-unread-status-inbox.sql`**
3. C'est tout !

### Option 2 : Tout réinstaller (si vous voulez repartir de zéro)

Si vous voulez vraiment tout réinstaller :

1. D'abord, **supprimez** les anciennes politiques :

```sql
-- Supprimer les politiques de taches
DROP POLICY IF EXISTS "Users can view tasks assigned to them or sent by them" ON taches;
DROP POLICY IF EXISTS "Users can create tasks" ON taches;
DROP POLICY IF EXISTS "Users can update their tasks" ON taches;
DROP POLICY IF EXISTS "Users can delete tasks they are involved in" ON taches;

-- Supprimer les politiques de taches_messages
DROP POLICY IF EXISTS "Users can view messages of their tasks" ON taches_messages;
DROP POLICY IF EXISTS "Users can create messages on their tasks" ON taches_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON taches_messages;
```

2. Ensuite, ré-exécutez : **`FIX-INBOX-COMPLET-MAINTENANT.sql`**

3. Puis exécutez : **`add-unread-status-inbox.sql`**

## Que faire MAINTENANT ?

### Vérifiez si tout fonctionne déjà

Avant de ré-exécuter quoi que ce soit, testez :

1. Allez dans l'application
2. Rafraîchissez (Ctrl+Shift+R)
3. Créez une tâche pour un autre utilisateur
4. Connectez-vous avec cet utilisateur
5. La tâche apparaît-elle ?
6. Pouvez-vous cliquer sur "Répondre" ?

**Si OUI** → Tout fonctionne ! Passez à l'étape suivante :

- Exécutez seulement **`add-unread-status-inbox.sql`**
- Ne touchez plus à `FIX-INBOX-COMPLET-MAINTENANT.sql`

**Si NON** → Utilisez l'Option 2 ci-dessus (réinstallation complète)

## Ordre d'installation correct

Pour éviter cette erreur, suivez cet ordre :

1. **PREMIÈRE FOIS :** Exécutez `FIX-INBOX-COMPLET-MAINTENANT.sql`
2. **ENSUITE :** Exécutez `add-unread-status-inbox.sql`
3. **NE JAMAIS ré-exécuter** `FIX-INBOX-COMPLET-MAINTENANT.sql` sauf si vous supprimez d'abord les politiques

## Vérification rapide

Pour savoir si le premier script a déjà été exécuté :

```sql
-- Vérifier si les politiques existent
SELECT policyname
FROM pg_policies
WHERE tablename = 'taches'
ORDER BY policyname;
```

**Si vous voyez des politiques** → Le script a déjà été exécuté
**Si rien n'apparaît** → Vous pouvez l'exécuter

## Script sûr (ne produit jamais d'erreur)

Si vous voulez un script qui ne produit JAMAIS cette erreur, utilisez celui-ci :

```sql
/*
  Système Inbox - Version sûre (peut être exécuté plusieurs fois)
*/

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view tasks assigned to them or sent by them" ON taches;
DROP POLICY IF EXISTS "Users can create tasks" ON taches;
DROP POLICY IF EXISTS "Users can update their tasks" ON taches;
DROP POLICY IF EXISTS "Users can delete tasks they are involved in" ON taches;

-- Recréer les politiques
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

-- Messages
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

SELECT '✅ POLITIQUES CRÉÉES/MISES À JOUR !' as resultat;
```

Ce script peut être exécuté plusieurs fois sans erreur.

## Résumé

**L'erreur est normale** si vous avez déjà exécuté le script une fois.

**Solution la plus simple :**
1. Ne ré-exécutez PAS `FIX-INBOX-COMPLET-MAINTENANT.sql`
2. Exécutez uniquement `add-unread-status-inbox.sql`
3. Rafraîchissez l'application

**C'est tout !**
