# Guide: Correction de la synchronisation auth.users <-> app_utilisateur

## Problème identifié

Vous aviez l'erreur 409 lors de la création de tâches parce que:

1. `auth.users` a des IDs différents de `app_utilisateur`
2. Les politiques RLS comparaient `auth.uid()` avec `app_utilisateur.id` → toujours false
3. Le code frontend utilisait `user.id` (auth) au lieu de l'ID de `app_utilisateur`

## Solution appliquée

### 1. Script SQL à exécuter

**Exécutez le fichier `SOLUTION-COMPLETE-AUTH-SYNC.sql` dans Supabase SQL Editor**

Ce script:
- Synchronise `auth_user_id` dans `app_utilisateur` avec les IDs de `auth.users`
- Corrige toutes les politiques RLS de la table `taches` pour utiliser `auth_user_id`
- Crée une fonction helper `get_app_user_id()` pour simplifier les requêtes

### 2. Code frontend mis à jour

Le contexte d'authentification a été modifié pour:
- Charger automatiquement l'ID de `app_utilisateur` via `auth_user_id`
- Exposer `appUserId` dans le contexte
- Utiliser `appUserId` au lieu de `user.id` pour les requêtes sur `taches`

## Fichiers modifiés

1. **src/contexts/AuthContext.tsx** - Ajout de `appUserId`
2. **src/components/InboxPage.tsx** - Utilisation de `appUserId`
3. **SOLUTION-COMPLETE-AUTH-SYNC.sql** - Script de correction SQL

## Comment tester

1. Exécutez `SOLUTION-COMPLETE-AUTH-SYNC.sql` dans Supabase
2. Vérifiez que la synchronisation a fonctionné (le script affiche les résultats)
3. Connectez-vous à l'application
4. Allez dans Inbox
5. Les tâches devraient maintenant s'afficher correctement
6. Essayez de créer une nouvelle tâche → plus d'erreur 409

## Vérification rapide

Exécutez cette requête dans Supabase pour vérifier la synchronisation:

```sql
SELECT
  au.email,
  au.id as auth_id,
  app.auth_user_id,
  CASE
    WHEN app.auth_user_id = au.id THEN '✓ OK'
    ELSE '✗ Problème'
  END as statut
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.email = au.email;
```

Tous les statuts doivent être "✓ OK".
