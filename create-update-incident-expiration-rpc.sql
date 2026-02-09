/*
  # Fonction RPC pour mettre à jour la date d'expiration d'un incident sans changer le statut

  Cette fonction permet de mettre à jour uniquement la date d'expiration d'un incident actif
  lorsque la date est modifiée depuis le modal salarié.

  1. Fonction
    - `update_incident_expiration_date_only(profil_id, type, nouvelle_date, commentaire)`
    - Met à jour `date_expiration` dans la table `incident`
    - Ajoute un commentaire pour tracer la modification
    - Ne change PAS le statut de l'incident

  2. Security
    - Accessible aux utilisateurs authentifiés avec les bonnes permissions
*/

-- Fonction pour mettre à jour uniquement la date d'expiration d'un incident
CREATE OR REPLACE FUNCTION public.update_incident_expiration_date_only(
  p_profil_id uuid,
  p_type text,
  p_nouvelle_date date,
  p_commentaire text DEFAULT 'Date mise à jour depuis le modal salarié'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_id uuid;
  v_updated_count int := 0;
BEGIN
  -- Trouver l'incident actif correspondant
  SELECT id INTO v_incident_id
  FROM incident
  WHERE profil_id = p_profil_id
    AND type = p_type
    AND statut IN ('actif', 'en_cours')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Si un incident est trouvé, mettre à jour sa date d'expiration
  IF v_incident_id IS NOT NULL THEN
    UPDATE incident
    SET
      date_expiration = p_nouvelle_date,
      commentaire = CASE
        WHEN commentaire IS NULL OR commentaire = '' THEN p_commentaire
        ELSE commentaire || E'\n' || p_commentaire
      END,
      updated_at = now()
    WHERE id = v_incident_id;

    v_updated_count := 1;
  END IF;

  -- Retourner le résultat
  RETURN json_build_object(
    'success', true,
    'incident_id', v_incident_id,
    'updated', v_updated_count > 0,
    'message', CASE
      WHEN v_updated_count > 0 THEN 'Date d''expiration mise à jour'
      ELSE 'Aucun incident actif trouvé'
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_incident_expiration_date_only TO authenticated;
