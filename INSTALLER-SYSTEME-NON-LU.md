# Installation du système "Non lu" (comme Gmail)

## Ce qui a été ajouté

Le système d'inbox fonctionne maintenant exactement comme Gmail :

### Fonctionnalités

1. **Messages en gras** : Les tâches non lues s'affichent en gras
2. **Point bleu** : Un point bleu à gauche des messages non lus
3. **Fond coloré** : Fond bleu clair pour les messages non lus
4. **Badge rouge** : Compteur rouge sur l'icône de la boîte de réception
5. **Compteur** : Nombre de messages non lus affiché dans le titre
6. **Marquage automatique** : La tâche est marquée comme lue quand on l'ouvre
7. **Remise à non lu** : Quand quelqu'un répond, la tâche repasse en non lu

## Installation en 2 étapes

### Étape 1 : Exécuter le script SQL

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Exécutez le fichier : **`add-unread-status-to-inbox.sql`**
3. Attendez le message : `✅ SYSTÈME NON LU INSTALLÉ !`

### Étape 2 : Rafraîchir l'application

1. Rafraîchissez l'application (Ctrl+Shift+R)
2. Déconnectez-vous et reconnectez-vous
3. C'est prêt !

## Comment ça marche

### À quoi ça ressemble

```
╔═══════════════════════════════════════════════════════════════╗
║  📥 Boîte de Réception (2 non lus)              [+ Nouvelle]  ║
║      ^badge rouge avec "2"                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Total: 7  |  En attente: 3  |  En cours: 2  |  Complétées: 2║
╠═══════════════════════════════════════════════════════════════╣
║  [Toutes (7)]  [En attente (3)]  [En cours (2)]              ║
╠═══════════════════════════════════════════════════════════════╣
║  🔵 URGENT : Validation contrat                  [haute] ⏱️   ║
║     Admin Système                                             ║
║  ^fond bleu clair, texte en gras, point bleu                 ║
╟───────────────────────────────────────────────────────────────╢
║  🔵 Demande de congés                           [normal] ⏱️   ║
║     Marie Dupont                                              ║
║  ^fond bleu clair, texte en gras, point bleu                 ║
╟───────────────────────────────────────────────────────────────╢
║     Question formation                          [basse] ⏱️    ║
║     Jean Martin                                               ║
║  ^fond blanc, texte normal (lu)                              ║
╚═══════════════════════════════════════════════════════════════╝
```

### Comportement

#### Quand vous recevez une nouvelle tâche
- ✅ Elle apparaît en **gras**
- ✅ Elle a un **point bleu** à gauche
- ✅ Elle a un **fond bleu clair**
- ✅ Le **compteur rouge** augmente dans l'icône
- ✅ Le titre affiche "(X non lus)"

#### Quand vous ouvrez une tâche
- ✅ Le texte passe de gras à normal
- ✅ Le point bleu disparaît
- ✅ Le fond redevient blanc
- ✅ Le compteur diminue automatiquement

#### Quand quelqu'un vous répond
- ✅ La tâche repasse automatiquement en **non lu**
- ✅ Elle remonte en haut de la liste
- ✅ Tous les indicateurs visuels réapparaissent

## Ce qui a changé techniquement

### Base de données

**Table `taches`** - Nouvelles colonnes :
- `lu_par_assignee` (boolean) : Si l'assignee a lu la tâche
- `date_derniere_reponse` (timestamp) : Date du dernier message

**Fonction SQL** :
- `mark_task_as_read(task_uuid)` : Marque une tâche comme lue

**Trigger automatique** :
- Quand un nouveau message est posté
- Met à jour `date_derniere_reponse`
- Remet `lu_par_assignee = false` si le message vient de l'expéditeur

### Interface (InboxPage.tsx)

**Nouvelles fonctionnalités** :
- Tri par `date_derniere_reponse` (les plus récentes en haut)
- Compteur de messages non lus dans les stats
- Badge rouge sur l'icône inbox
- Affichage en gras des tâches non lues
- Point bleu pour les non lus
- Fond bleu clair pour les non lus
- Marquage automatique comme lu à l'ouverture

## Tests à faire

### Test 1 : Réception d'une nouvelle tâche

1. Connectez-vous avec **Utilisateur A**
2. Créez une tâche et assignez-la à **Utilisateur B**
3. Déconnectez-vous
4. Connectez-vous avec **Utilisateur B**
5. Allez dans **Boîte de Réception**
6. ✅ La tâche doit être **en gras**
7. ✅ Il doit y avoir un **point bleu** à gauche
8. ✅ Le fond doit être **bleu clair**
9. ✅ Le badge rouge doit afficher **"1"**
10. ✅ Le titre doit dire **(1 non lu)**

### Test 2 : Ouverture d'une tâche

1. Cliquez sur la tâche non lue
2. ✅ Elle s'ouvre dans une modale
3. Fermez la modale
4. ✅ La tâche n'est plus en gras
5. ✅ Le point bleu a disparu
6. ✅ Le fond est blanc
7. ✅ Le badge rouge a disparu
8. ✅ Le compteur dans le titre a disparu

### Test 3 : Réception d'une réponse

1. Toujours connecté avec **Utilisateur B**
2. La tâche que vous avez ouverte est maintenant marquée comme lue
3. Déconnectez-vous
4. Connectez-vous avec **Utilisateur A**
5. Ouvrez la tâche que vous avez envoyée
6. Cliquez sur **"Répondre"**
7. Écrivez une réponse et envoyez
8. Déconnectez-vous
9. Reconnectez-vous avec **Utilisateur B**
10. ✅ La tâche doit être **redevenue non lue** (en gras)
11. ✅ Elle doit être **remontée en haut** de la liste
12. ✅ Tous les indicateurs visuels doivent réapparaître

### Test 4 : Tâche que j'ai envoyée

1. Connectez-vous avec **Utilisateur A**
2. Créez une tâche pour **Utilisateur B**
3. ✅ Cette tâche apparaît dans votre inbox
4. ✅ Mais elle n'est **PAS en gras** (car vous êtes l'expéditeur, pas l'assignee)
5. ✅ Elle n'a **PAS de point bleu**
6. ✅ Elle ne compte **PAS dans les non lus**

## Résolution de problèmes

### Problème : "Les tâches ne sont pas en gras"

**Causes possibles** :
1. Le script SQL n'a pas été exécuté
2. La colonne `lu_par_assignee` n'existe pas
3. Le navigateur a mis en cache l'ancienne version

**Solution** :
```sql
-- Vérifier que les colonnes existent
SELECT column_name FROM information_schema.columns
WHERE table_name = 'taches'
AND column_name IN ('lu_par_assignee', 'date_derniere_reponse');

-- Si elles n'existent pas, exécutez add-unread-status-to-inbox.sql
```

### Problème : "Le compteur de non lus est incorrect"

**Solution** :
```sql
-- Recalculer manuellement
UPDATE taches SET lu_par_assignee = false
WHERE assignee_id IN (SELECT id FROM app_utilisateur);
```

Puis rafraîchissez l'application.

### Problème : "La tâche ne repasse pas en non lu après une réponse"

**Vérifier que le trigger existe** :
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_task_last_message';

-- Si le trigger n'existe pas, ré-exécutez add-unread-status-to-inbox.sql
```

### Problème : "Erreur lors du marquage comme lu"

**Vérifier que la fonction existe** :
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'mark_task_as_read';

-- Si la fonction n'existe pas, ré-exécutez add-unread-status-to-inbox.sql
```

## Architecture

### Flux de données

```
1. Nouvelle tâche créée
   → lu_par_assignee = false (par défaut)
   → date_derniere_reponse = now()

2. Assignee ouvre la tâche
   → Frontend appelle mark_task_as_read()
   → lu_par_assignee = true
   → Compteur diminue

3. Expéditeur répond
   → Trigger détecte nouveau message
   → lu_par_assignee = false (remettre à non lu)
   → date_derniere_reponse = now()
   → Tâche remonte en haut de la liste

4. Assignee ouvre à nouveau
   → Même processus qu'à l'étape 2
```

### Sécurité (RLS)

La fonction `mark_task_as_read` vérifie que :
- ✅ L'utilisateur authentifié est bien l'assignee
- ✅ Seul l'assignee peut marquer comme lu
- ✅ L'expéditeur ne peut PAS marquer comme lu la tâche de l'assignee

## Fichiers modifiés

1. **`add-unread-status-to-inbox.sql`** (NOUVEAU)
   - Ajoute les colonnes `lu_par_assignee` et `date_derniere_reponse`
   - Crée la fonction `mark_task_as_read()`
   - Crée le trigger pour remettre à non lu automatiquement

2. **`src/components/InboxPage.tsx`** (MODIFIÉ)
   - Affichage en gras des tâches non lues
   - Compteur de non lus dans le header
   - Badge rouge sur l'icône
   - Point bleu pour les non lus
   - Marquage automatique comme lu

## Prochaines améliorations possibles

- ⭐ Marquer toutes les tâches comme lues d'un coup
- ⭐ Filtrer uniquement les tâches non lues
- ⭐ Notifications push pour les nouveaux messages
- ⭐ Son de notification
- ⭐ Compter le nombre de nouveaux messages dans chaque tâche
