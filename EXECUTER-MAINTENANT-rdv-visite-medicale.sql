/*
  # Système de rappel automatique des RDV visites médicales

  1. Modifications de tables
    - Ajoute les colonnes `visite_medicale_rdv_date` et `visite_medicale_rdv_heure` dans la table `profil`

  2. Nouvelles fonctions
    - `generate_rdv_visite_medicale_notifications()` : Génère les notifications J-2 pour tous les RDV

  3. Job planifié
    - CRON quotidien à 8h00 pour vérifier les RDV dans 2 jours

  4. Nouveau type de notification
    - Ajoute 'rdv_visite_medicale' dans l'enum des types d'incident
*/

-- ============================================
-- 1. AJOUTER LES COLONNES DANS LA TABLE PROFIL
-- ============================================

DO $$
BEGIN
  -- Ajouter la colonne pour la date du RDV
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil'
    AND column_name = 'visite_medicale_rdv_date'
  ) THEN
    ALTER TABLE profil ADD COLUMN visite_medicale_rdv_date DATE;
    RAISE NOTICE 'Colonne visite_medicale_rdv_date ajoutée';
  ELSE
    RAISE NOTICE 'Colonne visite_medicale_rdv_date existe déjà';
  END IF;

  -- Ajouter la colonne pour l'heure du RDV
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil'
    AND column_name = 'visite_medicale_rdv_heure'
  ) THEN
    ALTER TABLE profil ADD COLUMN visite_medicale_rdv_heure TIME;
    RAISE NOTICE 'Colonne visite_medicale_rdv_heure ajoutée';
  ELSE
    RAISE NOTICE 'Colonne visite_medicale_rdv_heure existe déjà';
  END IF;
END $$;

-- ============================================
-- 2. AJOUTER LE NOUVEAU TYPE DE NOTIFICATION
-- ============================================

-- Vérifier si le type existe déjà dans l'enum incident_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'rdv_visite_medicale'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'incident_type')
  ) THEN
    ALTER TYPE incident_type ADD VALUE 'rdv_visite_medicale';
    RAISE NOTICE 'Type rdv_visite_medicale ajouté à incident_type';
  ELSE
    RAISE NOTICE 'Type rdv_visite_medicale existe déjà';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Type incident_type n''existe pas encore';
END $$;

-- ============================================
-- 3. FONCTION POUR GÉNÉRER LES NOTIFICATIONS J-2
-- ============================================

CREATE OR REPLACE FUNCTION generate_rdv_visite_medicale_notifications()
RETURNS TABLE (
  salarie_id UUID,
  salarie_nom TEXT,
  rdv_date DATE,
  rdv_heure TIME,
  notification_creee BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_salarie RECORD;
  v_user RECORD;
  v_notification_exists BOOLEAN;
  v_date_rdv DATE;
  v_heure_rdv TIME;
  v_count INTEGER := 0;
BEGIN
  -- Date cible : J+2 (dans 2 jours)
  v_date_rdv := CURRENT_DATE + INTERVAL '2 days';

  RAISE NOTICE 'Recherche des RDV pour le %', v_date_rdv;

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
    v_count := v_count + 1;
    RAISE NOTICE 'RDV trouvé pour % % (%) le % à %',
      v_salarie.prenom,
      v_salarie.nom,
      v_salarie.matricule_tca,
      v_salarie.visite_medicale_rdv_date,
      v_salarie.visite_medicale_rdv_heure;

    -- Créer une notification pour chaque membre "Accueil - Recrutement"
    FOR v_user IN
      SELECT DISTINCT au.id
      FROM app_utilisateur au
      INNER JOIN utilisateur_permission up ON au.id = up.utilisateur_id
      INNER JOIN permission p ON up.permission_id = p.id
      WHERE p.code IN ('accueil_recrutement', 'admin_full', 'rh_full')
        AND au.actif = true
    LOOP
      -- Vérifier si une notification existe déjà pour ce salarié et cet utilisateur
      SELECT EXISTS (
        SELECT 1
        FROM incident
        WHERE profil_id = v_salarie.id
          AND type = 'rdv_visite_medicale'
          AND assigned_to = v_user.id
          AND statut = 'ouvert'
          AND date_expiration::date = v_salarie.visite_medicale_rdv_date
      ) INTO v_notification_exists;

      -- Si la notification n'existe pas, la créer
      IF NOT v_notification_exists THEN
        INSERT INTO incident (
          profil_id,
          type,
          titre,
          description,
          statut,
          date_expiration,
          assigned_to,
          created_at
        ) VALUES (
          v_salarie.id,
          'rdv_visite_medicale',
          'Rappel RDV Visite Médicale',
          format(
            '%s %s (matricule %s) a un RDV le %s à %s',
            v_salarie.prenom,
            v_salarie.nom,
            v_salarie.matricule_tca,
            to_char(v_salarie.visite_medicale_rdv_date, 'DD/MM/YYYY'),
            to_char(v_salarie.visite_medicale_rdv_heure, 'HH24:MI')
          ),
          'ouvert',
          v_salarie.visite_medicale_rdv_date,
          v_user.id,
          NOW()
        );

        RAISE NOTICE 'Notification créée pour user %', v_user.id;
      ELSE
        RAISE NOTICE 'Notification existe déjà pour user %', v_user.id;
      END IF;
    END LOOP;

    -- Retourner les informations du salarié traité
    salarie_id := v_salarie.id;
    salarie_nom := v_salarie.prenom || ' ' || v_salarie.nom;
    rdv_date := v_salarie.visite_medicale_rdv_date;
    rdv_heure := v_salarie.visite_medicale_rdv_heure;
    notification_creee := true;
    RETURN NEXT;
  END LOOP;

  RAISE NOTICE 'Total RDV traités: %', v_count;

  IF v_count = 0 THEN
    RAISE NOTICE 'Aucun RDV trouvé pour le %', v_date_rdv;
  END IF;

  RETURN;
END;
$$;

-- ============================================
-- 4. FONCTION POUR NOTIFICATION IMMÉDIATE (RDV < 2 JOURS)
-- ============================================

CREATE OR REPLACE FUNCTION create_immediate_rdv_notification(p_profil_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_salarie RECORD;
  v_user RECORD;
  v_jours_avant INTEGER;
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
    RAISE NOTICE 'Création notification immédiate pour RDV dans % jour(s)', v_jours_avant;

    -- Créer notification pour tous les membres Accueil-Recrutement
    FOR v_user IN
      SELECT DISTINCT au.id
      FROM app_utilisateur au
      INNER JOIN utilisateur_permission up ON au.id = up.utilisateur_id
      INNER JOIN permission p ON up.permission_id = p.id
      WHERE p.code IN ('accueil_recrutement', 'admin_full', 'rh_full')
        AND au.actif = true
    LOOP
      -- Supprimer les anciennes notifications pour ce salarié et cet utilisateur
      DELETE FROM incident
      WHERE profil_id = v_salarie.id
        AND type = 'rdv_visite_medicale'
        AND assigned_to = v_user.id;

      -- Créer la nouvelle notification
      INSERT INTO incident (
        profil_id,
        type,
        titre,
        description,
        statut,
        date_expiration,
        assigned_to,
        created_at
      ) VALUES (
        v_salarie.id,
        'rdv_visite_medicale',
        'Rappel RDV Visite Médicale URGENT',
        format(
          '%s %s (matricule %s) a un RDV le %s à %s (%s)',
          v_salarie.prenom,
          v_salarie.nom,
          v_salarie.matricule_tca,
          to_char(v_salarie.visite_medicale_rdv_date, 'DD/MM/YYYY'),
          to_char(v_salarie.visite_medicale_rdv_heure, 'HH24:MI'),
          CASE
            WHEN v_jours_avant < 0 THEN 'RDV PASSÉ'
            WHEN v_jours_avant = 0 THEN 'AUJOURD''HUI'
            ELSE 'DEMAIN'
          END
        ),
        'ouvert',
        v_salarie.visite_medicale_rdv_date,
        v_user.id,
        NOW()
      );
    END LOOP;
  END IF;
END;
$$;

-- ============================================
-- 5. TRIGGER POUR NOTIFICATION IMMÉDIATE
-- ============================================

CREATE OR REPLACE FUNCTION trigger_rdv_notification()
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
      PERFORM create_immediate_rdv_notification(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_rdv_visite_medicale_notification ON profil;

-- Créer le trigger
CREATE TRIGGER trigger_rdv_visite_medicale_notification
  AFTER INSERT OR UPDATE OF visite_medicale_rdv_date, visite_medicale_rdv_heure
  ON profil
  FOR EACH ROW
  EXECUTE FUNCTION trigger_rdv_notification();

-- ============================================
-- 6. CRÉER LE JOB CRON (EXÉCUTION QUOTIDIENNE À 8H00)
-- ============================================

-- Supprimer l'ancien job s'il existe (de manière sécurisée)
DO $$
BEGIN
  -- Essayer de supprimer le job
  PERFORM cron.unschedule('generate-rdv-visite-medicale-notifications');
  RAISE NOTICE 'Job CRON existant supprimé';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Aucun job CRON à supprimer (normal si première installation)';
END $$;

-- Créer le job CRON quotidien
SELECT cron.schedule(
  'generate-rdv-visite-medicale-notifications',
  '0 8 * * *',  -- Tous les jours à 8h00 du matin
  $$SELECT generate_rdv_visite_medicale_notifications();$$
);

-- ============================================
-- 7. COMMENTAIRES ET DOCUMENTATION
-- ============================================

COMMENT ON COLUMN profil.visite_medicale_rdv_date IS 'Date du prochain rendez-vous de visite médicale';
COMMENT ON COLUMN profil.visite_medicale_rdv_heure IS 'Heure du prochain rendez-vous de visite médicale';

COMMENT ON FUNCTION generate_rdv_visite_medicale_notifications() IS
'Génère automatiquement les notifications de rappel pour les RDV visites médicales 2 jours avant la date prévue. Exécuté quotidiennement via CRON à 8h00.';

COMMENT ON FUNCTION create_immediate_rdv_notification(UUID) IS
'Crée une notification immédiate si le RDV est dans moins de 2 jours ou déjà passé lors de la saisie.';

-- ============================================
-- TERMINÉ ✅
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Installation terminée avec succès !';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Colonnes ajoutées:';
  RAISE NOTICE '  - profil.visite_medicale_rdv_date (DATE)';
  RAISE NOTICE '  - profil.visite_medicale_rdv_heure (TIME)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  - generate_rdv_visite_medicale_notifications()';
  RAISE NOTICE '  - create_immediate_rdv_notification()';
  RAISE NOTICE '';
  RAISE NOTICE 'Job CRON:';
  RAISE NOTICE '  - Exécution quotidienne à 8h00';
  RAISE NOTICE '  - Vérifie les RDV dans 2 jours (J+2)';
  RAISE NOTICE '';
  RAISE NOTICE 'Type de notification:';
  RAISE NOTICE '  - rdv_visite_medicale';
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
END $$;
