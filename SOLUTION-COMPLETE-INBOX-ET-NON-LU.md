# Solution Complète : Système Non Lu Bidirectionnel

## Le Problème Exact

Vous avez dit :
> "La reponse d accord de suite elle n a pas mis la ligne en gras pour dire que j ai recu un message"

**Ce qui se passe actuellement :**
1. ✅ Vous (Admin Système) envoyez "APPELEZ MOI" à ACCUEIL  
   → ACCUEIL voit la ligne "BONJOUR" **EN GRAS**

2. ✅ ACCUEIL ouvre et répond "D ACCORD DE SUITE"  
   → La ligne redevient normale pour ACCUEIL

3. ❌ **VOUS ne voyez PAS la ligne en gras** quand ACCUEIL répond  
   → Il faut rafraîchir manuellement pour voir la réponse

**Pourquoi ?**

Le système actuel n'a qu'une colonne `lu_par_assignee`. Il ne gère que le statut "lu" pour la personne qui REÇOIT la tâche (l'assignee), pas pour la personne qui l'ENVOIE (l'expéditeur).

## La Solution

Il faut ajouter une deuxième colonne `lu_par_expediteur` et mettre à jour la logique.

### Partie 1 : SQL (À exécuter dans Supabase)

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

### Partie 2 : Code Frontend (Je vais modifier maintenant)

Je vais mettre à jour `InboxPage.tsx` pour :
1. Vérifier si l'utilisateur est l'expéditeur OU l'assignee
2. Utiliser le bon champ (`lu_par_expediteur` ou `lu_par_assignee`)
3. Appeler la bonne fonction pour marquer comme lu

## Résultat Final

**AVANT :**
- Vous envoyez → Accueil voit en gras ✅
- Accueil répond → Vous ne voyez PAS en gras ❌

**APRÈS :**
- Vous envoyez → Accueil voit en gras ✅
- Accueil répond → Vous voyez en gras ✅
- Vous ouvrez → Ligne redevient normale ✅
- Accueil répond encore → Vous voyez en gras ✅

## Installation

1. **Exécutez le SQL ci-dessus** dans Supabase > SQL Editor
2. **Attendez** que je mette à jour le code frontend
3. **Rafraîchissez** l'application
4. **Testez** : Faites répondre ACCUEIL et regardez la ligne devenir en gras !
