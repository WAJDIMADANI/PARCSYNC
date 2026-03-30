/*
  # CORRECTION URGENTE - Fonction de génération des notifications A&R

  PROBLÈME IDENTIFIÉ:
  - Filtre trop strict sur profil.statut = 'actif'
  - Les salariés avec statut 'contrat_signe' sont exclus
  - Résultat: aucune notification créée pour ces salariés

  CORRECTION:
  - Remplacer: p.statut = 'actif'
  - Par: p.statut IN ('actif', 'contrat_signe')

  RÈGLES MÉTIER CONSERVÉES:
  - ar_type = 'absence' uniquement
  - end_date = CURRENT_DATE uniquement
  - Anti-doublons
  - Destinataires: pôle Comptabilité/RH ou permissions compta/ar
*/

-- Remplacer la fonction existante par la version corrigée
CREATE OR REPLACE FUNCTION generate_ar_fin_absence_notifications()
RETURNS jsonb AS $$
DECLARE
  v_ar_event RECORD;
  v_user RECORD;
  v_count INTEGER := 0;
  v_pole_compta_id uuid;
BEGIN
  -- Récupérer l'ID du pôle Comptabilité/RH
  SELECT id INTO v_pole_compta_id
  FROM poles
  WHERE LOWER(nom) LIKE '%comptabilit%'
     OR LOWER(nom) LIKE '%compta%'
  LIMIT 1;

  -- Pour chaque absence se terminant AUJOURD'HUI
  FOR v_ar_event IN
    SELECT
      ar.id,
      ar.profil_id,
      ar.start_date,
      ar.end_date,
      p.matricule_tca,
      p.nom,
      p.prenom
    FROM compta_ar_events ar
    JOIN profil p ON ar.profil_id = p.id
    WHERE ar.ar_type = 'absence'
      AND ar.end_date = CURRENT_DATE
      AND p.statut IN ('actif', 'contrat_signe')  -- ✅ CORRECTION ICI
  LOOP
    -- Pour chaque utilisateur du pôle Comptabilité ou avec permission compta/ar
    FOR v_user IN
      SELECT DISTINCT au.id
      FROM app_utilisateur au
      WHERE au.actif = true
        AND (
          au.pole_id = v_pole_compta_id
          OR au.permissions ? 'compta/ar'
          OR au.permissions ? 'comptabilite'
        )
    LOOP
      -- Vérifier si la notification existe déjà
      IF NOT EXISTS (
        SELECT 1 FROM inbox
        WHERE utilisateur_id = v_user.id
          AND type = 'ar_fin_absence'
          AND reference_id = v_ar_event.id::text
      ) THEN
        -- Créer la notification
        INSERT INTO inbox (
          utilisateur_id,
          type,
          titre,
          description,
          contenu,
          reference_id,
          reference_type,
          statut,
          lu
        ) VALUES (
          v_user.id,
          'ar_fin_absence',
          'Fin d''absence aujourd''hui',
          format(
            'L''absence de %s %s (matricule %s) se termine aujourd''hui (%s).',
            v_ar_event.prenom,
            v_ar_event.nom,
            v_ar_event.matricule_tca,
            to_char(v_ar_event.end_date, 'DD/MM/YYYY')
          ),
          jsonb_build_object(
            'profil_id', v_ar_event.profil_id,
            'matricule', v_ar_event.matricule_tca,
            'nom', v_ar_event.nom,
            'prenom', v_ar_event.prenom,
            'start_date', v_ar_event.start_date,
            'end_date', v_ar_event.end_date,
            'generated_at', now()
          )::text,
          v_ar_event.id::text,
          'compta_ar_event',
          'nouveau',
          false
        );

        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'notifications_created', v_count,
    'execution_date', CURRENT_DATE,
    'execution_time', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION generate_ar_fin_absence_notifications() TO authenticated;

-- ============================================================================
-- VÉRIFICATION AVANT REGÉNÉRATION
-- ============================================================================

SELECT '🔍 Absences se terminant aujourd''hui (AVANT génération)...' as etape;

SELECT
  ar.id as ar_event_id,
  p.matricule_tca,
  p.nom,
  p.prenom,
  p.statut as profil_statut,
  ar.start_date,
  ar.end_date,
  EXISTS (
    SELECT 1 FROM inbox
    WHERE type = 'ar_fin_absence'
      AND reference_id = ar.id::text
  ) as notification_existe
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
WHERE ar.ar_type = 'absence'
  AND ar.end_date = CURRENT_DATE
  AND p.statut IN ('actif', 'contrat_signe')
ORDER BY p.nom, p.prenom;

-- ============================================================================
-- REGÉNÉRATION IMMÉDIATE
-- ============================================================================

SELECT '⚡ Génération des notifications A&R maintenant...' as etape;

SELECT generate_ar_fin_absence_notifications() as resultat;

-- ============================================================================
-- VÉRIFICATION APRÈS GÉNÉRATION
-- ============================================================================

SELECT '✅ Absences se terminant aujourd''hui (APRÈS génération)...' as etape;

SELECT
  ar.id as ar_event_id,
  p.matricule_tca,
  p.nom,
  p.prenom,
  p.statut as profil_statut,
  ar.start_date,
  ar.end_date,
  (
    SELECT COUNT(*)
    FROM inbox
    WHERE type = 'ar_fin_absence'
      AND reference_id = ar.id::text
  ) as nb_notifications
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
WHERE ar.ar_type = 'absence'
  AND ar.end_date = CURRENT_DATE
  AND p.statut IN ('actif', 'contrat_signe')
ORDER BY p.nom, p.prenom;

-- ============================================================================
-- AFFICHER LES NOTIFICATIONS CRÉÉES
-- ============================================================================

SELECT '📨 Notifications créées pour les absences d''aujourd''hui...' as etape;

SELECT
  i.id as notification_id,
  i.utilisateur_id,
  au.email as destinataire,
  i.titre,
  i.description,
  i.created_at,
  ar.id as ar_event_id,
  p.matricule_tca,
  p.nom,
  p.prenom,
  p.statut as profil_statut
FROM inbox i
JOIN compta_ar_events ar ON i.reference_id = ar.id::text
JOIN profil p ON ar.profil_id = p.id
JOIN app_utilisateur au ON i.utilisateur_id = au.id
WHERE i.type = 'ar_fin_absence'
  AND ar.end_date = CURRENT_DATE
ORDER BY i.created_at DESC;

-- ============================================================================
-- RÉSUMÉ FINAL
-- ============================================================================

SELECT '📊 RÉSUMÉ FINAL' as etape;

SELECT
  COUNT(DISTINCT ar.id) as absences_du_jour,
  COUNT(DISTINCT CASE WHEN p.statut = 'actif' THEN ar.id END) as absences_actifs,
  COUNT(DISTINCT CASE WHEN p.statut = 'contrat_signe' THEN ar.id END) as absences_contrat_signe,
  COUNT(i.id) as notifications_creees,
  COUNT(DISTINCT i.utilisateur_id) as destinataires_uniques
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
LEFT JOIN inbox i ON i.reference_id = ar.id::text AND i.type = 'ar_fin_absence'
WHERE ar.ar_type = 'absence'
  AND ar.end_date = CURRENT_DATE
  AND p.statut IN ('actif', 'contrat_signe');

/*
  ✅ CORRECTION APPLIQUÉE

  CHANGEMENTS:
  - Ligne 31: FROM pole → FROM poles
  - Ligne 48: ar.ar_type = 'ABSENCE' → ar.ar_type = 'absence'
  - Ligne 50: p.statut = 'actif' → p.statut IN ('actif', 'contrat_signe')
  - Ligne 100: jsonb_build_object(...) → jsonb_build_object(...)::text
  - Lignes 144, 179, 225: ar_type = 'ABSENCE' → ar_type = 'absence'

  RÉSULTAT ATTENDU:
  - Les notifications sont créées pour TOUS les salariés ayant une absence
    se terminant aujourd'hui, qu'ils soient 'actif' ou 'contrat_signe'

  COMMANDE RAPIDE POUR REGÉNÉRER:
  SELECT generate_ar_fin_absence_notifications();
*/
