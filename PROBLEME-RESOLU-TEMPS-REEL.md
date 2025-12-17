# Problème : Les réponses n'apparaissent pas en gras automatiquement

## Le problème que vous avez rencontré

```
Vous: "ACCEUIL A REPONDU MAIS JE NE VOIS PAS ICI MESSAGE NON LU"
     "Je le vois quand j'ouvre le modal mais la ligne ne se met pas en gras"
```

### Ce qui se passait AVANT

1. ACCUEIL répond à votre tâche "TEST"
2. La réponse est bien enregistrée en base de données
3. Le trigger met à jour `lu_par_assignee` à `false`
4. **MAIS** l'interface ne se recharge PAS automatiquement
5. Vous ne voyez PAS la ligne en gras
6. Il faut **rafraîchir manuellement** (F5) pour voir le changement

### Pourquoi ?

L'application ne surveillait pas les changements en temps réel dans la base de données.

## La solution

J'ai ajouté 2 choses :

### 1. Système de subscription temps réel (déjà dans le code)

Le composant `InboxPage.tsx` écoute maintenant en temps réel :
- Les changements dans la table `taches`
- Les nouveaux messages dans `taches_messages`

Quand il détecte un changement, il recharge automatiquement les données.

### 2. Activation de Realtime dans Supabase (À FAIRE)

Il faut activer les publications Realtime pour que Supabase envoie les notifications.

## Installation

### Étape 1 : Exécuter le SQL

Allez dans **Supabase > SQL Editor** et exécutez :

```sql
-- Activer Realtime pour la table taches
ALTER PUBLICATION supabase_realtime ADD TABLE taches;

-- Activer Realtime pour la table taches_messages
ALTER PUBLICATION supabase_realtime ADD TABLE taches_messages;
```

Ou exécutez le fichier : **`activer-realtime-inbox.sql`**

### Étape 2 : Rafraîchir l'application

Rechargez complètement l'application (Ctrl+Shift+R)

### Étape 3 : Tester

1. Ouvrez deux navigateurs :
   - Navigateur 1 : Connecté avec votre compte
   - Navigateur 2 : Connecté avec ACCUEIL

2. Dans Navigateur 2 (ACCUEIL), répondez à une tâche

3. Dans Navigateur 1 (VOUS), **SANS RAFRAÎCHIR** :
   - ✅ La ligne devient **EN GRAS** instantanément
   - ✅ Point bleu apparaît
   - ✅ Fond bleu clair
   - ✅ Compteur "Non lus" se met à jour

## Ce qui se passe maintenant

### Scénario complet

1. **ACCUEIL répond "SALUT TEST"**
   - Le message est créé dans `taches_messages`
   - Le trigger met à jour `lu_par_assignee = false`
   - Le trigger met à jour `date_derniere_reponse = now()`

2. **Supabase envoie une notification temps réel**
   - Notification : "La table taches a changé"
   - Notification : "Nouveau message dans taches_messages"

3. **Votre interface reçoit la notification**
   - `fetchTaches()` est appelé automatiquement
   - Les données sont rechargées depuis la base

4. **L'affichage se met à jour instantanément**
   - La ligne "TEST" passe de normale à **GRAS**
   - Point bleu apparaît à gauche
   - Fond devient bleu clair
   - Compteur passe de "0" à "1 non lu"

5. **Vous ouvrez la tâche**
   - `markAsRead()` est appelé
   - `lu_par_assignee = true` en base
   - Notification temps réel envoyée
   - Votre liste se met à jour
   - La ligne redevient normale
   - Compteur passe à "0"

## Avant / Après

### AVANT (sans Realtime)

```
ACCUEIL répond
     ↓
Base de données mise à jour
     ↓
❌ Rien ne se passe dans votre interface
     ↓
Vous devez appuyer sur F5 pour voir le changement
```

### APRÈS (avec Realtime)

```
ACCUEIL répond
     ↓
Base de données mise à jour
     ↓
Notification temps réel envoyée
     ↓
✅ Interface mise à jour INSTANTANÉMENT
     ↓
Ligne en GRAS automatiquement
```

## Fichiers modifiés

- **`src/components/InboxPage.tsx`** : Ajout du système de subscription temps réel
- **`activer-realtime-inbox.sql`** : SQL pour activer Realtime dans Supabase

## Avantages

✅ **Instantané** : Plus besoin de rafraîchir manuellement
✅ **Temps réel** : Comme Gmail, Slack, etc.
✅ **Multi-utilisateurs** : Tous les utilisateurs voient les changements en même temps
✅ **Automatique** : Fonctionne en arrière-plan sans intervention

## Notes importantes

- Le système Realtime fonctionne **uniquement si les publications sont activées** dans Supabase
- Si vous voyez des erreurs dans la console du navigateur du type "Realtime connection failed", vérifiez que vous avez bien exécuté le SQL
- Le système se reconnecte automatiquement si la connexion est perdue
- Les subscriptions sont nettoyées automatiquement quand vous quittez la page

## C'est tout !

Exécutez le SQL, rafraîchissez, et testez. Les réponses apparaîtront maintenant en gras **INSTANTANÉMENT** !
