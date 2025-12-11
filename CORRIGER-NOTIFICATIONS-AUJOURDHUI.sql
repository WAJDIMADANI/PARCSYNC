/*
  ╔════════════════════════════════════════════════════════════════════╗
  ║  CORRECTION: Inclure les contrats qui expirent AUJOURD'HUI        ║
  ║                                                                    ║
  ║  PROBLÈME IDENTIFIÉ:                                              ║
  ║  La fonction utilise: date_fin > CURRENT_DATE                     ║
  ║  Donc elle EXCLUT les contrats qui expirent AUJOURD'HUI!          ║
  ║                                                                    ║
  ║  SOLUTION:                                                         ║
  ║  Changer en: date_fin >= CURRENT_DATE                             ║
  ╚════════════════════════════════════════════════════════════════════╝
*/

-- ========================================
-- CORRIGER LA FONCTION
-- ========================================
CREATE OR REPLACE FUNCTION generate_expiration_notifications()
RETURNS void AS $$
DECLARE
  v_profil RECORD;
  v_contrat RECORD;
  v_date_notif date;
BEGIN
  -- 1. Notifications for titre de sejour (30 days before expiration)
  FOR v_profil IN
    SELECT id, titre_sejour_fin_validite
    FROM profil
    WHERE titre_sejour_fin_validite IS NOT NULL
      AND titre_sejour_fin_validite >= CURRENT_DATE  -- MODIFIÉ: >= au lieu de >
      AND titre_sejour_fin_validite <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.titre_sejour_fin_validite - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'titre_sejour', v_profil.id, v_profil.titre_sejour_fin_validite, v_date_notif,
           jsonb_build_object('document', 'Titre de séjour')
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'titre_sejour'
        AND date_echeance = v_profil.titre_sejour_fin_validite
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

  -- 2. Notifications for medical visit (30 days before expiration)
  FOR v_profil IN
    SELECT id, date_fin_visite_medicale
    FROM profil
    WHERE date_fin_visite_medicale IS NOT NULL
      AND date_fin_visite_medicale >= CURRENT_DATE  -- MODIFIÉ: >= au lieu de >
      AND date_fin_visite_medicale <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.date_fin_visite_medicale - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'visite_medicale', v_profil.id, v_profil.date_fin_visite_medicale, v_date_notif,
           jsonb_build_object('document', 'Visite médicale')
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'visite_medicale'
        AND date_echeance = v_profil.date_fin_visite_medicale
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

  -- 3. Notifications for driving license (30 days before expiration)
  FOR v_profil IN
    SELECT id, permis_conduire_expiration
    FROM profil
    WHERE permis_conduire_expiration IS NOT NULL
      AND permis_conduire_expiration >= CURRENT_DATE  -- MODIFIÉ: >= au lieu de >
      AND permis_conduire_expiration <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.permis_conduire_expiration - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'permis_conduire', v_profil.id, v_profil.permis_conduire_expiration, v_date_notif,
           jsonb_build_object('document', 'Permis de conduire')
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'permis_conduire'
        AND date_echeance = v_profil.permis_conduire_expiration
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

  -- 4. Notifications for CDD contracts ending (30 days before end)
  -- *** MODIFIÉ: >= CURRENT_DATE AU LIEU DE > CURRENT_DATE ***
  FOR v_contrat IN
    SELECT id, profil_id, date_fin
    FROM contrat
    WHERE type = 'CDD'
      AND date_fin IS NOT NULL
      AND date_fin >= CURRENT_DATE  -- MODIFIÉ: >= au lieu de >
      AND date_fin <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_contrat.date_fin - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'contrat_cdd', v_contrat.profil_id, v_contrat.date_fin, v_date_notif,
           jsonb_build_object('document', 'Contrat CDD', 'contrat_id', v_contrat.id)
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_contrat.profil_id
        AND type = 'contrat_cdd'
        AND date_echeance = v_contrat.date_fin
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- EXÉCUTER LA FONCTION CORRIGÉE
-- ========================================
SELECT generate_expiration_notifications();

-- ========================================
-- CRÉER LA NOTIFICATION POUR WAJDI
-- ========================================
DO $$
DECLARE
  v_contrat RECORD;
  v_notification_exists BOOLEAN;
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  CRÉATION NOTIFICATION WAJDI                              ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- Récupérer le contrat de Wajdi
  SELECT
    c.id as contrat_id,
    c.profil_id,
    c.date_fin,
    p.prenom,
    p.nom,
    p.matricule_tca
  INTO v_contrat
  FROM contrat c
  JOIN profil p ON c.profil_id = p.id
  WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

  -- Vérifier si notification existe
  SELECT EXISTS (
    SELECT 1 FROM notification n
    WHERE n.profil_id = v_contrat.profil_id
      AND n.type = 'contrat_cdd'
      AND n.date_echeance = v_contrat.date_fin
      AND n.statut IN ('active', 'email_envoye')
  ) INTO v_notification_exists;

  IF v_notification_exists THEN
    RAISE NOTICE '✅ Notification existe déjà pour Wajdi';
    RAISE NOTICE '   Date expiration: %', v_contrat.date_fin;
    RAISE NOTICE '';
    RAISE NOTICE 'Si vous ne la voyez pas:';
    RAISE NOTICE '  1. Rafraîchissez la page (F5)';
    RAISE NOTICE '  2. Vérifiez les filtres';
    RAISE NOTICE '  3. Cherchez "wajdi" ou "15901"';
  ELSE
    -- Créer la notification manuellement
    INSERT INTO notification (
      type,
      titre,
      message,
      profil_id,
      date_echeance,
      date_notification,
      statut,
      metadata
    ) VALUES (
      'contrat_cdd',
      'Contrat CDD expire',
      format('Le contrat CDD de %s %s (matricule: %s) expire le %s',
        v_contrat.prenom,
        v_contrat.nom,
        v_contrat.matricule_tca,
        to_char(v_contrat.date_fin, 'DD/MM/YYYY')
      ),
      v_contrat.profil_id,
      v_contrat.date_fin,
      CURRENT_DATE,
      'active',
      jsonb_build_object(
        'contrat_id', v_contrat.contrat_id,
        'matricule', v_contrat.matricule_tca,
        'source', 'yousign',
        'created_manually', true
      )
    );

    RAISE NOTICE '✅ Notification créée pour Wajdi!';
    RAISE NOTICE '';
    RAISE NOTICE 'Contrat:';
    RAISE NOTICE '  Nom: % %', v_contrat.prenom, v_contrat.nom;
    RAISE NOTICE '  Matricule: %', v_contrat.matricule_tca;
    RAISE NOTICE '  Date expiration: %', v_contrat.date_fin;
    RAISE NOTICE '';
    RAISE NOTICE '→ Rafraîchissez la page de l''application';
    RAISE NOTICE '→ Allez dans Notifications > Contrats CDD';
    RAISE NOTICE '→ Cherchez "wajdi" ou "15901"';
  END IF;
  RAISE NOTICE '';
END $$;

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    NOTIFICATION CRÉÉE' as titre;

SELECT
  n.id,
  n.type as "Type",
  n.titre as "Titre",
  n.date_echeance as "Date Expiration",
  n.date_echeance - CURRENT_DATE as "Jours restants",
  n.statut as "Statut",
  n.created_at as "Créée le"
FROM notification n
JOIN contrat c ON c.profil_id = n.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
  AND n.type = 'contrat_cdd'
ORDER BY n.created_at DESC
LIMIT 1;
