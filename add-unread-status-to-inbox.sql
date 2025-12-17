/*
  # Ajouter statut "non lu" aux tâches (comme Gmail)

  1. Modifications de la table taches
    - Ajouter colonne `lu_par_assignee` (boolean, default false)
    - Ajouter colonne `date_derniere_reponse` (pour trier par nouveauté)
    - Ajouter index sur `lu_par_assignee`

  2. Fonction pour marquer comme lu
    - Créer fonction `mark_task_as_read(task_id)`

  3. Trigger pour mettre à jour date_derniere_reponse
    - Quand un nouveau message est ajouté
*/

-- ===============================================
-- 1. AJOUTER COLONNES À LA TABLE TACHES
-- ===============================================

-- Ajouter colonne lu_par_assignee (false = non lu/en gras)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'taches' AND column_name = 'lu_par_assignee'
  ) THEN
    ALTER TABLE taches ADD COLUMN lu_par_assignee boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Ajouter colonne date_derniere_reponse
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'taches' AND column_name = 'date_derniere_reponse'
  ) THEN
    ALTER TABLE taches ADD COLUMN date_derniere_reponse timestamptz DEFAULT now();
  END IF;
END $$;

-- Index pour optimiser les requêtes de tâches non lues
CREATE INDEX IF NOT EXISTS idx_taches_lu_par_assignee ON taches(lu_par_assignee, date_derniere_reponse DESC);

-- ===============================================
-- 2. FONCTION POUR MARQUER COMME LU
-- ===============================================

-- Fonction pour marquer une tâche comme lue
CREATE OR REPLACE FUNCTION mark_task_as_read(task_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur est bien l'assignee
  UPDATE taches
  SET lu_par_assignee = true
  WHERE id = task_uuid
  AND assignee_id IN (
    SELECT id FROM app_utilisateur WHERE auth_user_id = auth.uid()
  );
END;
$$;

-- ===============================================
-- 3. TRIGGER POUR METTRE À JOUR DATE_DERNIERE_REPONSE
-- ===============================================

-- Fonction trigger : Mettre à jour date_derniere_reponse ET remettre à non lu
CREATE OR REPLACE FUNCTION update_task_last_message_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  task_assignee_id uuid;
  message_author_id uuid;
BEGIN
  -- Récupérer l'assignee de la tâche
  SELECT assignee_id INTO task_assignee_id
  FROM taches
  WHERE id = NEW.tache_id;

  -- Récupérer l'auteur du message
  message_author_id := NEW.auteur_id;

  -- Mettre à jour la date de dernière réponse
  UPDATE taches
  SET date_derniere_reponse = NEW.created_at,
      -- Si le message vient de l'expéditeur (pas de l'assignee), marquer comme non lu
      lu_par_assignee = CASE
        WHEN message_author_id = task_assignee_id THEN lu_par_assignee
        ELSE false
      END
  WHERE id = NEW.tache_id;

  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_task_last_message ON taches_messages;
CREATE TRIGGER trigger_update_task_last_message
  AFTER INSERT ON taches_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_task_last_message_date();

-- ===============================================
-- 4. METTRE À JOUR LES TÂCHES EXISTANTES
-- ===============================================

-- Marquer toutes les tâches existantes comme non lues pour l'assignee
UPDATE taches
SET lu_par_assignee = false
WHERE lu_par_assignee IS NULL OR lu_par_assignee = true;

-- Mettre à jour date_derniere_reponse pour les tâches avec messages
UPDATE taches t
SET date_derniere_reponse = (
  SELECT MAX(created_at)
  FROM taches_messages tm
  WHERE tm.tache_id = t.id
)
WHERE EXISTS (
  SELECT 1 FROM taches_messages tm WHERE tm.tache_id = t.id
);

-- ===============================================
-- 5. DONNER PERMISSION D'EXÉCUTER LA FONCTION
-- ===============================================

GRANT EXECUTE ON FUNCTION mark_task_as_read(uuid) TO authenticated;

-- ===============================================
-- VÉRIFICATION
-- ===============================================

SELECT 'COLONNES AJOUTÉES' as info;

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'taches'
AND column_name IN ('lu_par_assignee', 'date_derniere_reponse')
ORDER BY column_name;

SELECT 'FONCTION CRÉÉE' as info;

SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('mark_task_as_read', 'update_task_last_message_date')
ORDER BY routine_name;

SELECT '✅ SYSTÈME NON LU INSTALLÉ !' as resultat;
SELECT '✅ Les tâches seront maintenant affichées en gras si non lues' as info1;
SELECT '✅ Les nouvelles réponses remettront la tâche en non lu' as info2;
