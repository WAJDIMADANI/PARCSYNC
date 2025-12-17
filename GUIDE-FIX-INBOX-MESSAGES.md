# Correction : Messages non reçus dans l'Inbox

## Problème
Quand un utilisateur envoie une tâche à un autre utilisateur, le destinataire ne la voit pas dans son inbox.

## Cause
Les politiques RLS (Row Level Security) sur la table `taches` comparaient directement `auth.uid()` avec les IDs de `app_utilisateur`, alors qu'elles devraient utiliser la colonne `auth_user_id` de la table `app_utilisateur`.

## Solution

### Étape 1 : Appliquer la correction SQL

Dans votre éditeur SQL Supabase :

1. Allez dans **SQL Editor**
2. Copiez tout le contenu du fichier `FIX-TACHES-RLS-POLICIES.sql`
3. Exécutez la requête

### Étape 2 : Vérifier que ça fonctionne

1. Connectez-vous avec un utilisateur A
2. Allez dans l'onglet "Boîte de Réception"
3. Cliquez sur "Nouvelle tâche"
4. Assignez la tâche à un utilisateur B
5. Déconnectez-vous et connectez-vous avec l'utilisateur B
6. L'utilisateur B devrait maintenant voir la tâche dans son inbox

### Ce qui a été corrigé

Les nouvelles politiques utilisent maintenant :
```sql
EXISTS (
  SELECT 1 FROM app_utilisateur
  WHERE app_utilisateur.auth_user_id = auth.uid()
  AND app_utilisateur.id = taches.assignee_id
)
```

Au lieu de :
```sql
auth.uid() = assignee_id
```

Cela fait la jointure correcte entre `auth.users` et `app_utilisateur`.
