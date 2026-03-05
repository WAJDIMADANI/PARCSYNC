/*
  # Système de notifications Inbox pour RDV visites médicales

  Ce système crée des notifications dans la table INBOX (pas incident)
  pour rappeler les rendez-vous de visite médicale 2 jours avant.

  1. Colonnes dans profil
    - visite_medicale_rdv_date (DATE)
    - visite_medicale_rdv_heure (TIME)

  2. Fonction de génération
    - Crée des messages dans la table inbox
    - Envoie aux utilisateurs RH
    - Exécution automatique quotidienne

  3. Job CRON
    - Tous les jours à 8h00
    - Vérifie les RDV dans 2 jours
*/

-- ============================================
-- 1. AJOUTER LES COLONNES DANS PROFIL
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil'
    AND column_name = 'visite_medicale_rdv_date'
  ) THEN
    ALTER TABLE profil ADD COLUMN visite_medicale_rdv_date DATE;
    RAISE NOTICE '✅ Colonne visite_medicale_rdv_date ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne visite_medicale_rdv_date existe déjà';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil'
    AND column_name = 'visite_medicale_rdv_heure'
  ) THEN
    ALTER TABLE profil ADD COLUMN visite_medicale_rdv_heure TIME;
    RAISE NOTICE '✅ Colonne visite_medicale_rdv_heure ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne visite_medicale_rdv_heure existe déjà';
  END IF;
END $$;

-- ============================================
-- 2. FONCTION POUR GÉNÉRER NOTIFICATIONS INBOX J-2
-- ============================================

CREATE OR REPLACE FUNCTION generate_rdv_visite_medicale_inbox_notifications()
RETURNS TABLE (
  salarie_id UUID,
  salarie_nom TEXT,
  rdv_date DATE,
  rdv_heure TIME,
  notifications_creees INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_salarie RECORD;
  v_user RECORD;
  v_date_rdv DATE;
  v_count_salaries INTEGER := 0;
  v_count_notifs INTEGER := 0;
  v_message_exists BOOLEAN;
BEGIN
  -- Date cible : J+2 (dans 2 jours)
  v_date_rdv := CURRENT_DATE + INTERVAL '2 days';

  RAISE NOTICE '🔍 Recherche RDV visites médicales pour le %', v_date_rdv;

  -- Parcourir tous les salariés qui ont un RDV dans 2 jours
  FOR v_salarie IN
    SELECT
      p.id,
      p.prenom,
      p.nom,
      p.matricule_tca,
      p.visite_medicale_rdv_date,
      p.visite_medicale_rdv_heure
    FROM profil p
    WHERE p.visite_medicale_rdv_date = v_date_rdv
      AND p.visite_medicale_rdv_heure IS NOT NULL
      AND p.deleted_at IS NULL
      AND p.statut NOT IN ('sorti', 'inactif')
  LOOP
    v_count_salaries := v_count_salaries + 1;
    RAISE NOTICE '📅 RDV trouvé: % % le % à %',
      v_salarie.prenom || ' ' || v_salarie.nom,
      v_salarie.matricule_tca,
      to_char(v_salarie.visite_medicale_rdv_date, 'DD/MM/YYYY'),
      to_char(v_salarie.visite_medicale_rdv_heure, 'HH24:MI');

    -- Créer des messages inbox pour chaque utilisateur RH
    FOR v_user IN
      SELECT DISTINCT au.id
      FROM app_utilisateur au
      INNER JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
      WHERE up.section_id IN ('rh/salaries', 'rh/demandes', 'admin/utilisateurs')
        AND up.actif = true
        AND au.actif = true
    LOOP
      -- Vérifier si un message existe déjà
      SELECT EXISTS (
        SELECT 1
        FROM inbox
        WHERE utilisateur_id = v_user.id
          AND reference_id = v_salarie.id
          AND reference_type = 'profil'
          AND type = 'rdv_visite_medicale'
          AND titre = 'Rappel RDV Visite Médicale'
          AND created_at::date = CURRENT_DATE
      ) INTO v_message_exists;

      -- Si le message n'existe pas, le créer
      IF NOT v_message_exists THEN
        INSERT INTO inbox (
          utilisateur_id,
          type,
          titre,
          description,
          contenu,
          reference_id,
          reference_type,
          statut,
          lu,
          created_at,
          updated_at
        ) VALUES (
          v_user.id,
          'rdv_visite_medicale',
          'Rappel RDV Visite Médicale',
          format(
            '%s %s (matricule %s) a un RDV le %s à %s',
            v_salarie.prenom,
            v_salarie.nom,
            COALESCE(v_salarie.matricule_tca, 'N/A'),
            to_char(v_salarie.visite_medicale_rdv_date, 'DD/MM/YYYY'),
            to_char(v_salarie.visite_medicale_rdv_heure, 'HH24:MI')
          ),
          format(
            'Rendez-vous de visite médicale prévu dans 2 jours pour %s %s',
            v_salarie.prenom,
            v_salarie.nom
          ),
          v_salarie.id,
          'profil',
          'nouveau',
          false,
          NOW(),
          NOW()
        );

        v_count_notifs := v_count_notifs + 1;
        RAISE NOTICE '✅ Message inbox créé pour utilisateur %', v_user.id;
      ELSE
        RAISE NOTICE '✓ Message existe déjà pour utilisateur %', v_user.id;
      END IF;
    END LOOP;

    -- Retourner les informations du salarié traité
    salarie_id := v_salarie.id;
    salarie_nom := v_salarie.prenom || ' ' || v_salarie.nom;
    rdv_date := v_salarie.visite_medicale_rdv_date;
    rdv_heure := v_salarie.visite_medicale_rdv_heure;
    notifications_creees := v_count_notifs;
    RETURN NEXT;
  END LOOP;

  RAISE NOTICE '📊 Total: % salarié(s) avec RDV, % notification(s) créée(s)',
    v_count_salaries, v_count_notifs;

  IF v_count_salaries = 0 THEN
    RAISE NOTICE 'ℹ️  Aucun RDV trouvé pour le %', v_date_rdv;
  END IF;

  RETURN;
END;
$$;

-- ============================================
-- 3. FONCTION NOTIFICATION IMMÉDIATE (RDV < 2 JOURS)
-- ============================================

CREATE OR REPLACE FUNCTION create_immediate_rdv_inbox_notification(p_profil_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_salarie RECORD;
  v_user RECORD;
  v_jours_avant INTEGER;
  v_titre TEXT;
  v_description TEXT;
BEGIN
  -- Récupérer les infos du salarié
  SELECT
    p.id,
    p.prenom,
    p.nom,
    p.matricule_tca,
    p.visite_medicale_rdv_date,
    p.visite_medicale_rdv_heure
  INTO v_salarie
  FROM profil p
  WHERE p.id = p_profil_id;

  IF NOT FOUND OR v_salarie.visite_medicale_rdv_date IS NULL THEN
    RETURN;
  END IF;

  -- Calculer le nombre de jours avant le RDV
  v_jours_avant := v_salarie.visite_medicale_rdv_date - CURRENT_DATE;

  -- Si le RDV est dans moins de 2 jours ou passé, créer notification immédiate
  IF v_jours_avant <= 1 THEN
    RAISE NOTICE '⚡ Création notification immédiate (RDV dans % jour(s))', v_jours_avant;

    -- Définir le titre selon l'urgence
    v_titre := CASE
      WHEN v_jours_avant < 0 THEN 'RDV Visite Médicale PASSÉ'
      WHEN v_jours_avant = 0 THEN 'RDV Visite Médicale AUJOURD''HUI'
      ELSE 'RDV Visite Médicale DEMAIN'
    END;

    v_description := format(
      '%s %s (matricule %s) - RDV le %s à %s',
      v_salarie.prenom,
      v_salarie.nom,
      COALESCE(v_salarie.matricule_tca, 'N/A'),
      to_char(v_salarie.visite_medicale_rdv_date, 'DD/MM/YYYY'),
      to_char(v_salarie.visite_medicale_rdv_heure, 'HH24:MI')
    );

    -- Créer message inbox pour tous les membres RH
    FOR v_user IN
      SELECT DISTINCT au.id
      FROM app_utilisateur au
      INNER JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
      WHERE up.section_id IN ('rh/salaries', 'rh/demandes', 'admin/utilisateurs')
        AND up.actif = true
        AND au.actif = true
    LOOP
      -- Supprimer les anciens messages pour éviter les doublons
      DELETE FROM inbox
      WHERE utilisateur_id = v_user.id
        AND reference_id = v_salarie.id
        AND reference_type = 'profil'
        AND type = 'rdv_visite_medicale';

      -- Créer le nouveau message
      INSERT INTO inbox (
        utilisateur_id,
        type,
        titre,
        description,
        contenu,
        reference_id,
        reference_type,
        statut,
        lu,
        created_at,
        updated_at
      ) VALUES (
        v_user.id,
        'rdv_visite_medicale',
        v_titre,
        v_description,
        format('Rendez-vous de visite médicale urgent pour %s %s',
          v_salarie.prenom, v_salarie.nom),
        v_salarie.id,
        'profil',
        'nouveau',
        false,
        NOW(),
        NOW()
      );

      RAISE NOTICE '✅ Message immédiat créé pour utilisateur %', v_user.id;
    END LOOP;
  END IF;
END;
$$;

-- ============================================
-- 4. TRIGGER POUR NOTIFICATION IMMÉDIATE
-- ============================================

CREATE OR REPLACE FUNCTION trigger_rdv_inbox_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si on ajoute ou modifie une date de RDV
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND
     NEW.visite_medicale_rdv_date IS NOT NULL AND
     NEW.visite_medicale_rdv_heure IS NOT NULL THEN

    -- Si le RDV est dans moins de 2 jours, créer notification immédiate
    IF NEW.visite_medicale_rdv_date - CURRENT_DATE <= 1 THEN
      PERFORM create_immediate_rdv_inbox_notification(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_rdv_visite_medicale_inbox ON profil;

-- Créer le trigger
CREATE TRIGGER trigger_rdv_visite_medicale_inbox
  AFTER INSERT OR UPDATE OF visite_medicale_rdv_date, visite_medicale_rdv_heure
  ON profil
  FOR EACH ROW
  EXECUTE FUNCTION trigger_rdv_inbox_notification();

-- ============================================
-- 5. JOB CRON QUOTIDIEN (8H00)
-- ============================================

-- Supprimer l'ancien job s'il existe
DO $$
BEGIN
  PERFORM cron.unschedule('generate-rdv-visite-medicale-inbox');
  RAISE NOTICE '✓ Ancien job CRON supprimé';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️  Aucun job CRON à supprimer';
END $$;

-- Créer le job CRON quotidien
SELECT cron.schedule(
  'generate-rdv-visite-medicale-inbox',
  '0 8 * * *',  -- Tous les jours à 8h00
  $$SELECT generate_rdv_visite_medicale_inbox_notifications();$$
);

-- ============================================
-- 6. DOCUMENTATION
-- ============================================

COMMENT ON COLUMN profil.visite_medicale_rdv_date IS
'Date du prochain rendez-vous de visite médicale';

COMMENT ON COLUMN profil.visite_medicale_rdv_heure IS
'Heure du prochain rendez-vous de visite médicale';

COMMENT ON FUNCTION generate_rdv_visite_medicale_inbox_notifications() IS
'Génère des messages dans la table inbox pour rappeler les RDV visites médicales 2 jours avant. Exécuté quotidiennement à 8h00 via CRON.';

COMMENT ON FUNCTION create_immediate_rdv_inbox_notification(UUID) IS
'Crée un message inbox immédiat si le RDV est dans moins de 2 jours lors de la saisie manuelle.';

-- ============================================
-- MESSAGE FINAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ INSTALLATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Colonnes ajoutées:';
  RAISE NOTICE '   • profil.visite_medicale_rdv_date (DATE)';
  RAISE NOTICE '   • profil.visite_medicale_rdv_heure (TIME)';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Fonctions créées:';
  RAISE NOTICE '   • generate_rdv_visite_medicale_inbox_notifications()';
  RAISE NOTICE '   • create_immediate_rdv_inbox_notification()';
  RAISE NOTICE '';
  RAISE NOTICE '⏰ Job CRON:';
  RAISE NOTICE '   • Exécution: Tous les jours à 8h00';
  RAISE NOTICE '   • Action: Vérifie les RDV dans 2 jours (J+2)';
  RAISE NOTICE '';
  RAISE NOTICE '📬 Destination:';
  RAISE NOTICE '   • Messages créés dans: table INBOX';
  RAISE NOTICE '   • Destinataires: Utilisateurs RH';
  RAISE NOTICE '   • Type: rdv_visite_medicale';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test manuel:';
  RAISE NOTICE '   SELECT * FROM generate_rdv_visite_medicale_inbox_notifications();';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
