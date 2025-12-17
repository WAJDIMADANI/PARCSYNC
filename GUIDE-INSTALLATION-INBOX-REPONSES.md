# Guide d'installation : Système de réponses dans l'Inbox (Style Gmail)

## Ce qui a été ajouté

1. **Table de messages** : Pour stocker les réponses/messages dans les conversations
2. **Interface Gmail** : Design moderne avec avatars, threads de conversation et zone de réponse
3. **Temps réel** : Les nouvelles réponses apparaissent automatiquement
4. **Sécurité RLS** : Politiques de sécurité pour protéger les données

## Installation en 3 étapes

### Étape 1 : Corriger les politiques RLS de la table taches

Allez dans **Supabase Dashboard** → **SQL Editor**

Exécutez le fichier : **`FIX-TACHES-RLS-POLICIES.sql`**

Ce fichier corrige le problème où les utilisateurs ne voyaient pas les tâches qui leur étaient assignées.

### Étape 2 : Créer la table des messages

Dans le même **SQL Editor**, exécutez le fichier : **`create-taches-messages-system.sql`**

Ce fichier crée :
- La table `taches_messages` pour stocker les réponses
- Les politiques de sécurité RLS
- Les index pour les performances
- L'activation du real-time

### Étape 3 : Tester le système

1. Connectez-vous avec l'utilisateur A
2. Allez dans **Boîte de Réception**
3. Créez une nouvelle tâche et assignez-la à l'utilisateur B
4. Connectez-vous avec l'utilisateur B
5. Ouvrez la tâche dans l'inbox
6. Cliquez sur **"Répondre"**
7. Écrivez un message et cliquez sur **"Envoyer"**
8. Reconnectez-vous avec l'utilisateur A
9. Ouvrez la tâche, vous devriez voir la réponse de B

## Fonctionnalités

### Design type Gmail
- Avatars avec initiales colorées
- Thread de conversation avec messages empilés
- Formatage des dates intelligent (ex: "14:30" aujourd'hui, "15 déc" hier)
- Bouton "Répondre" en bas
- Zone de texte expansible

### Actions disponibles
- **Répondre** : Ouvre une zone de texte pour écrire une réponse
- **Marquer en cours** : Change le statut de la tâche
- **Marquer complétée** : Marque la tâche comme terminée
- **Supprimer** : Supprime la tâche et tous ses messages

### Real-time
Les nouvelles réponses apparaissent automatiquement sans recharger la page grâce à Supabase Real-time.

## Structure de la base de données

### Table `taches_messages`
```sql
- id (uuid)
- tache_id (référence à taches)
- auteur_id (référence à app_utilisateur)
- contenu (text)
- created_at (timestamptz)
```

### Politiques RLS
- **SELECT** : Voir les messages des tâches où je suis impliqué (assignee ou expéditeur)
- **INSERT** : Créer des messages sur mes tâches
- **DELETE** : Supprimer mes propres messages

## Résolution de problèmes

### Les messages ne s'affichent pas
- Vérifiez que les deux fichiers SQL ont bien été exécutés
- Vérifiez que l'utilisateur fait bien partie de la tâche (assignee ou expéditeur)

### Erreur lors de l'envoi
- Vérifiez que l'utilisateur est bien connecté
- Vérifiez les logs dans la console du navigateur

### Les réponses n'apparaissent pas en temps réel
- Vérifiez que Real-time est activé dans Supabase
- Vérifiez la connexion internet
