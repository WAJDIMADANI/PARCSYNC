/*
  # Correction de la fonction get_cdd_expires - Inclure les contrats signés

  Cette correction permet d'afficher dans l'onglet "Gestion des incidents" :
  - Les CDD avec statut 'signed' (contrats signés via Yousign)
  - TOUS les CDD expirés, pas seulement ceux de -30 jours

  IMPORTANT : Cela N'AFFECTE PAS la logique des notifications automatiques.
*/

-- 1. Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_cdd_expires();

-- 2. Recréer la fonction avec les nouveaux critères
CREATE OR REPLACE FUNCTION get_cdd_expires()
RETURNS TABLE (
  id uuid,
  nom text,
  prenom text,
  matricule text,
  date_fin date,
  jours_restants integer,
  statut_contrat text,
  type_contrat text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nom,
    p.prenom,
    p.matricule,
    c.date_fin,
    (c.date_fin - CURRENT_DATE)::integer as jours_restants,
    c.statut as statut_contrat,
    c.type as type_contrat
  FROM profil p
  INNER JOIN contrat c ON c.profil_id = p.id
  WHERE c.type = 'CDD'
    AND c.date_fin IS NOT NULL
    -- Inclure les contrats actifs ET signés (statut Yousign)
    AND c.statut IN ('actif', 'signed')
    -- Afficher TOUS les contrats expirés ou qui vont expirer (sans limite de 30 jours)
    AND c.date_fin <= CURRENT_DATE + INTERVAL '90 days'
  ORDER BY c.date_fin ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Fonction get_cdd_expires() mise à jour';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changements appliqués :';
  RAISE NOTICE '✓ Inclut maintenant les CDD avec statut "signed"';
  RAISE NOTICE '✓ Affiche TOUS les CDD expirés (pas de limite -30j)';
  RAISE NOTICE '✓ Affiche les CDD qui expirent dans les 90 prochains jours';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT : Cette modification n''affecte PAS :';
  RAISE NOTICE '- La création automatique des notifications';
  RAISE NOTICE '- L''envoi des emails automatiques';
  RAISE NOTICE '- Les règles d''alerte';
  RAISE NOTICE '';
  RAISE NOTICE 'C''est uniquement pour l''affichage dans l''interface.';
END $$;
