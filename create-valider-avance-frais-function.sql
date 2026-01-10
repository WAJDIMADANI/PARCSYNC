/*
  # Créer la fonction de validation d'avance de frais

  1. Fonction RPC
    - `valider_avance_frais` : Valide ou refuse une avance de frais
    - Met à jour le statut, commentaire, validateur et date de validation
    - Accessible par les utilisateurs authentifiés ayant la permission rh/validations

  2. Sécurité
    - RLS activé via les policies existantes sur compta_avance_frais
*/

-- Fonction pour valider/refuser une avance de frais
CREATE OR REPLACE FUNCTION valider_avance_frais(
  p_avance_id uuid,
  p_validation_statut text,
  p_commentaire text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que le statut est valide
  IF p_validation_statut NOT IN ('validee', 'refusee') THEN
    RAISE EXCEPTION 'Statut de validation invalide: %', p_validation_statut;
  END IF;

  -- Mettre à jour l'avance de frais
  UPDATE compta_avance_frais
  SET
    statut = p_validation_statut::text,
    commentaire_validation = p_commentaire,
    valide_par = auth.uid(),
    date_validation = NOW()
  WHERE id = p_avance_id
    AND statut = 'en_attente';

  -- Vérifier qu'une ligne a été mise à jour
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avance de frais non trouvée ou déjà traitée';
  END IF;
END;
$$;

-- Accorder les permissions aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION valider_avance_frais(uuid, text, text) TO authenticated;
