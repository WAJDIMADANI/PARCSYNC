/*
  # FIX: Correction du système RDV Visite Médicale pour utiliser INBOX

  ## Problème identifié
  Le trigger RDV utilise `assigned_to` qui n'existe pas dans la table `incident`.

  ## Solution
  Utiliser la table `inbox` au lieu de `incident` pour les notifications RDV.

  ## Changements
  1. Modifier generate_rdv_visite_medicale_notifications() pour créer des messages inbox
  2. Modifier create_immediate_rdv_notification() pour créer des messages inbox
  3. Le trigger reste inchangé mais appelle les nouvelles fonctions
*/

-- ============================================
-- 1. FONCTION POUR GÉNÉRER LES NOTIFICATIONS J-2 (VERSION INBOX)
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

    -- Créer une notification inbox pour chaque membre "Accueil - Recrutement"
    FOR v_user IN
      SELECT DISTINCT au.id
      FROM app_utilisateur au
      INNER JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
      WHERE up.section_id IN ('rh/salaries', 'rh/demandes', 'admin/utilisateurs')
        AND up.actif = true
        AND au.actif = true
    LOOP
      -- Vérifier si une notification existe déjà pour ce salarié et cet utilisateur
      SELECT EXISTS (
        SELECT 1
        FROM inbox
        WHERE utilisateur_id = v_user.id
          AND reference_type = 'profil'
          AND reference_id = v_salarie.id
          AND type = 'rdv_visite_medicale'
          AND statut = 'ouvert'
      ) INTO v_notification_exists;

      -- Si la notification n'existe pas, la créer
      IF NOT v_notification_exists THEN
        INSERT INTO inbox (
          utilisateur_id,
          type,
          titre,
          description,
          contenu,
          reference_type,
          reference_id,
          statut,
          lu,
          created_at
        ) VALUES (
          v_user.id,
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
          jsonb_build_object(
            'rdv_date', v_salarie.visite_medicale_rdv_date,
            'rdv_heure', v_salarie.visite_medicale_rdv_heure,
            'matricule', v_salarie.matricule_tca,
            'prenom', v_salarie.prenom,
            'nom', v_salarie.nom
          ),
          'profil',
          v_salarie.id,
          'ouvert',
          false,
          NOW()
        );

        RAISE NOTICE 'Notification inbox créée pour user %', v_user.id;
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
-- 2. FONCTION POUR NOTIFICATION IMMÉDIATE (VERSION INBOX)
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
  v_urgence TEXT;
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

  -- Déterminer l'urgence
  v_urgence := CASE
    WHEN v_jours_avant < 0 THEN 'RDV PASSÉ'
    WHEN v_jours_avant = 0 THEN 'AUJOURD''HUI'
    ELSE 'DEMAIN'
  END;

  -- Si le RDV est dans moins de 2 jours ou passé, créer notification immédiate
  IF v_jours_avant <= 1 THEN
    RAISE NOTICE 'Création notification immédiate inbox pour RDV dans % jour(s)', v_jours_avant;

    -- Créer notification inbox pour tous les membres Accueil-Recrutement
    FOR v_user IN
      SELECT DISTINCT au.id
      FROM app_utilisateur au
      INNER JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
      WHERE up.section_id IN ('rh/salaries', 'rh/demandes', 'admin/utilisateurs')
        AND up.actif = true
        AND au.actif = true
    LOOP
      -- Supprimer les anciennes notifications pour ce salarié et cet utilisateur
      DELETE FROM inbox
      WHERE utilisateur_id = v_user.id
        AND reference_type = 'profil'
        AND reference_id = v_salarie.id
        AND type = 'rdv_visite_medicale';

      -- Créer la nouvelle notification
      INSERT INTO inbox (
        utilisateur_id,
        type,
        titre,
        description,
        contenu,
        reference_type,
        reference_id,
        statut,
        lu,
        created_at
      ) VALUES (
        v_user.id,
        'rdv_visite_medicale',
        'Rappel RDV Visite Médicale URGENT',
        format(
          '%s %s (matricule %s) a un RDV le %s à %s (%s)',
          v_salarie.prenom,
          v_salarie.nom,
          v_salarie.matricule_tca,
          to_char(v_salarie.visite_medicale_rdv_date, 'DD/MM/YYYY'),
          to_char(v_salarie.visite_medicale_rdv_heure, 'HH24:MI'),
          v_urgence
        ),
        jsonb_build_object(
          'rdv_date', v_salarie.visite_medicale_rdv_date,
          'rdv_heure', v_salarie.visite_medicale_rdv_heure,
          'matricule', v_salarie.matricule_tca,
          'prenom', v_salarie.prenom,
          'nom', v_salarie.nom,
          'urgence', v_urgence
        ),
        'profil',
        v_salarie.id,
        'ouvert',
        false,
        NOW()
      );
    END LOOP;
  END IF;
END;
$$;

-- ============================================
-- TERMINÉ ✅
-- ============================================

SELECT 'Correction appliquée ! Les notifications RDV utilisent maintenant la table INBOX au lieu de INCIDENT.' as message;
