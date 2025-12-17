-- ═══════════════════════════════════════════════════════════════
-- FIX INBOX BIDIRECTIONNEL - EXÉCUTER MAINTENANT
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- TERMINÉ ! Maintenant rafraîchissez l'application et testez
-- ═══════════════════════════════════════════════════════════════

SELECT '✅ SYSTÈME BIDIRECTIONNEL INSTALLÉ !' as resultat;
SELECT 'Rafraîchissez l''application et testez !' as action;
