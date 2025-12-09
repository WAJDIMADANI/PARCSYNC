/*
  # GÉNÉRATION DES NOTIFICATIONS CDD (30 JOURS)

  Ce script met à jour la fonction de génération de notifications pour détecter
  les contrats CDD arrivant à échéance dans les 30 prochains jours (au lieu de 15 jours),
  puis génère les notifications.

  INSTRUCTIONS:
  1. Copiez et exécutez ce script COMPLET dans l'éditeur SQL de Supabase
  2. Vérifiez le résultat dans l'onglet Notifications de votre application
  3. Les notifications CDD devraient maintenant apparaître

  IMPORTANT: Ce script peut être exécuté plusieurs fois sans problème
  (il ne créera pas de doublons grâce à la vérification NOT EXISTS)
*/

-- ========================================
-- ÉTAPE 1: Mettre à jour la fonction
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
      AND titre_sejour_fin_validite > CURRENT_DATE
      AND titre_sejour_fin_validite <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.titre_sejour_fin_validite - INTERVAL '30 days';

    -- Create notification only if it doesn't already exist
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
      AND date_fin_visite_medicale > CURRENT_DATE
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
      AND permis_conduire_expiration > CURRENT_DATE
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
  -- *** MODIFIÉ: 30 JOURS AU LIEU DE 15 JOURS ***
  FOR v_contrat IN
    SELECT id, profil_id, date_fin
    FROM contrat
    WHERE type = 'CDD'
      AND date_fin IS NOT NULL
      AND date_fin > CURRENT_DATE
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
-- ÉTAPE 2: Exécuter la fonction
-- ========================================

-- Génère toutes les notifications (y compris CDD à 30 jours)
SELECT generate_expiration_notifications();

-- ========================================
-- ÉTAPE 3: Vérification
-- ========================================

-- Afficher les notifications CDD créées
SELECT
  'Notifications CDD créées avec succès' as message,
  COUNT(*) as nombre_notifications
FROM notification
WHERE type = 'contrat_cdd'
  AND statut IN ('active', 'email_envoye');

-- Détail des notifications CDD
SELECT
  n.id,
  n.date_echeance as date_fin_contrat,
  EXTRACT(DAY FROM (n.date_echeance - CURRENT_DATE)) as jours_restants,
  n.statut,
  n.created_at as notification_creee_le,
  p.prenom,
  p.nom,
  p.email
FROM notification n
LEFT JOIN profil p ON n.profil_id = p.id
WHERE n.type = 'contrat_cdd'
ORDER BY n.date_echeance ASC;

-- ========================================
-- RÉSUMÉ FINAL
-- ========================================

SELECT
  '=== RÉSUMÉ FINAL ===' as titre;

SELECT
  'Contrats CDD se terminant dans 30 jours' as categorie,
  COUNT(*) as nombre
FROM contrat
WHERE type = 'CDD'
  AND date_fin IS NOT NULL
  AND date_fin > CURRENT_DATE
  AND date_fin <= CURRENT_DATE + INTERVAL '30 days'
  AND statut = 'actif'
UNION ALL
SELECT
  'Notifications CDD actives créées' as categorie,
  COUNT(*) as nombre
FROM notification
WHERE type = 'contrat_cdd'
  AND statut IN ('active', 'email_envoye');
