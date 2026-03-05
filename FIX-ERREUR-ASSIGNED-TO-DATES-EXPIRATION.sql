/*
  # FIX : Erreur "assigned_to does not exist" lors de la sauvegarde des dates

  Problème : L'erreur se produit quand on modifie les dates d'expiration dans le modal salarié
  Cause : La fonction RPC ou la structure de la table incident a un problème

  Solution : Recréer la fonction RPC correctement sans référence à assigned_to
*/

-- ============================================
-- 1. SUPPRIMER L'ANCIENNE FONCTION
-- ============================================

DROP FUNCTION IF EXISTS public.update_incident_expiration_date_only(uuid, text, date, text);

-- ============================================
-- 2. RECRÉER LA FONCTION CORRECTEMENT
-- ============================================

CREATE OR REPLACE FUNCTION public.update_incident_expiration_date_only(
  p_profil_id UUID,
  p_type TEXT,
  p_nouvelle_date DATE,
  p_commentaire TEXT DEFAULT 'Date mise à jour depuis le modal salarié'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_id UUID;
  v_updated_count INTEGER := 0;
BEGIN
  -- Trouver l'incident actif correspondant
  -- NE PAS utiliser assigned_to car cette colonne n'existe pas
  SELECT id INTO v_incident_id
  FROM incident
  WHERE profil_id = p_profil_id
    AND type::text = p_type
    AND statut IN ('ouvert', 'actif', 'en_cours')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Si un incident est trouvé, mettre à jour sa date d'expiration
  IF v_incident_id IS NOT NULL THEN
    UPDATE incident
    SET
      date_expiration = p_nouvelle_date::timestamptz,
      description = CASE
        WHEN description IS NULL OR description = '' THEN p_commentaire
        ELSE description || E'\n' || p_commentaire || ' (' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ')'
      END,
      updated_at = NOW()
    WHERE id = v_incident_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  -- Retourner le résultat
  RETURN json_build_object(
    'success', TRUE,
    'incident_id', v_incident_id,
    'updated', v_updated_count > 0,
    'message', CASE
      WHEN v_updated_count > 0 THEN 'Date d''expiration mise à jour avec succès'
      ELSE 'Aucun incident actif trouvé pour ce type'
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- ============================================
-- 3. DONNER LES PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.update_incident_expiration_date_only TO authenticated;

-- ============================================
-- 4. COMMENTAIRE
-- ============================================

COMMENT ON FUNCTION public.update_incident_expiration_date_only IS
'Met à jour la date d''expiration d''un incident existant sans changer son statut. Utilisé quand on modifie les dates depuis le modal salarié.';

-- ============================================
-- MESSAGE DE CONFIRMATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fonction update_incident_expiration_date_only recréée avec succès';
  RAISE NOTICE '✅ Correction appliquée : plus d''erreur "assigned_to does not exist"';
END $$;
