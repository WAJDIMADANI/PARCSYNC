# FIX COMPLET : Système Non Lu Bidirectionnel

## Le Problème

Vous avez dit :
> "La reponse d accord de suite elle n a pas mis la ligne en gras"

**Explication :**
- ✅ Vous envoyez "APPELEZ MOI" → ACCUEIL voit en gras
- ❌ ACCUEIL répond "D ACCORD DE SUITE" → Vous ne voyez PAS en gras

## La Solution

J'ai tout corrigé ! Voici ce qu'il faut faire :

### ÉTAPE 1 : Exécuter ce SQL dans Supabase

Allez dans **Supabase > SQL Editor** et exécutez :

```sql
-- 1. Ajouter la colonne lu_par_expediteur
ALTER TABLE taches
ADD COLUMN IF NOT EXISTS lu_par_expediteur BOOLEAN DEFAULT true;

UPDATE taches SET lu_par_expediteur = true;

-- 2. Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS mark_task_as_unread_on_reply_trigger ON taches_messages;
DROP FUNCTION IF EXISTS mark_task_as_unread_on_reply();

-- 3. Créer le nouveau trigger BIDIRECTIONNEL
CREATE OR REPLACE FUNCTION mark_task_as_unread_on_reply()
RETURNS TRIGGER AS $$
DECLARE
  task_assignee_id UUID;
  task_expediteur_id UUID;
BEGIN
  SELECT assignee_id, expediteur_id
  INTO task_assignee_id, task_expediteur_id
  FROM taches WHERE id = NEW.tache_id;

  -- Si l'expéditeur répond → marquer non lu pour assignee
  IF NEW.auteur_id = task_expediteur_id THEN
    UPDATE taches
    SET lu_par_assignee = false, date_derniere_reponse = NEW.created_at
    WHERE id = NEW.tache_id;
  END IF;

  -- Si l'assignee répond → marquer non lu pour expéditeur
  IF NEW.auteur_id = task_assignee_id THEN
    UPDATE taches
    SET lu_par_expediteur = false, date_derniere_reponse = NEW.created_at
    WHERE id = NEW.tache_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_task_as_unread_on_reply_trigger
AFTER INSERT ON taches_messages
FOR EACH ROW
EXECUTE FUNCTION mark_task_as_unread_on_reply();

-- 4. Fonction pour marquer comme lu (expéditeur)
CREATE OR REPLACE FUNCTION mark_task_as_read_by_sender(task_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE taches SET lu_par_expediteur = true WHERE id = task_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### ÉTAPE 2 : Rafraîchir l'application

1. Fermez complètement l'application
2. Videz le cache (Ctrl+Shift+Delete)
3. Rouvrez l'application
4. Reconnectez-vous

### ÉTAPE 3 : Tester

1. **Vous (Admin Système)** : Envoyez "TEST BIDIRECTIONNEL" à ACCUEIL
   → ACCUEIL voit la ligne **EN GRAS**

2. **ACCUEIL** : Répond "OK JE TE REPONDS"
   → **VOUS voyez la ligne EN GRAS** (sans rafraîchir !)

3. **Vous** : Ouvrez la tâche
   → La ligne redevient normale

4. **Vous** : Répondez "MERCI"
   → ACCUEIL voit en gras

5. **ACCUEIL** : Répond "DE RIEN"
   → **Vous voyez en gras**

## Ce que j'ai modifié

### Base de données :
1. Ajout de la colonne `lu_par_expediteur`
2. Trigger mis à jour pour gérer les deux sens
3. Nouvelle fonction RPC `mark_task_as_read_by_sender`

### Code frontend (InboxPage.tsx) :
1. Interface `Tache` : Ajout de `lu_par_expediteur`
2. `fetchTaches()` : Récupération de la nouvelle colonne
3. Compteur `non_lus` : Compte les deux types
4. `isUnread` : Vérifie expéditeur ET assignee
5. `markAsRead()` : Appelle la bonne fonction selon le rôle

## Résultat Final

**AVANT :**
```
Vous → ACCUEIL : ACCUEIL voit en gras ✅
ACCUEIL → Vous : Vous ne voyez PAS en gras ❌
```

**APRÈS :**
```
Vous → ACCUEIL : ACCUEIL voit en gras ✅
ACCUEIL → Vous : Vous voyez EN GRAS ✅
Vous ouvrez : Redevient normale ✅
ACCUEIL répond : Vous voyez EN GRAS ✅
```

## Système Temps Réel

Le système temps réel est déjà activé (d'après l'erreur que vous avez eue). 

Les changements apparaîtront **INSTANTANÉMENT** sans rafraîchir :
- Quand quelqu'un répond, la ligne devient en gras automatiquement
- Quand vous ouvrez, elle redevient normale automatiquement
- Le compteur se met à jour en temps réel

## C'EST TOUT !

1. Exécutez le SQL
2. Rafraîchissez l'app
3. Testez
4. Profitez du système bidirectionnel !
