/*
  # CORRECTION URGENTE : Vue v_vehicles_list

  Problème résolu : "cannot change name of view column 'immat_norm' to 'marque'"

  Cette erreur se produit quand on essaie de recréer une vue avec des colonnes
  dans un ordre différent. La solution est de supprimer la vue avant de la recréer.

  Cette migration:
  1. Supprime la vue existante v_vehicles_list
  2. La recrée avec la structure correcte incluant les nouvelles colonnes
  3. Corrige la référence l.nom_entreprise → l.nom
*/

-- ==============================================================================
-- ÉTAPE 1 : SUPPRIMER LA VUE EXISTANTE
-- ==============================================================================

DROP VIEW IF EXISTS v_vehicles_list CASCADE;

-- ==============================================================================
-- ÉTAPE 2 : RECRÉER LA VUE AVEC LA STRUCTURE COMPLÈTE
-- ==============================================================================

CREATE VIEW v_vehicles_list AS
SELECT
  v.*,

  -- Calculer le nom du locataire à afficher
  CASE
    -- Si une attribution principale existe, afficher le nom du chauffeur
    WHEN EXISTS (
      SELECT 1 FROM attribution_vehicule av
      WHERE av.vehicule_id = v.id
        AND av.type_attribution = 'principal'
        AND av.date_fin IS NULL
    ) THEN (
      SELECT CONCAT(p.prenom, ' ', UPPER(p.nom), ' (', p.matricule_tca, ')')
      FROM attribution_vehicule av
      JOIN profil p ON av.profil_id = p.id
      WHERE av.vehicule_id = v.id
        AND av.type_attribution = 'principal'
        AND av.date_fin IS NULL
      LIMIT 1
    )
    WHEN v.locataire_type = 'epave' THEN 'EPAVE'
    WHEN v.locataire_type = 'sur_parc' THEN 'Sur parc'
    WHEN v.locataire_type = 'vendu' THEN 'Vendu'
    WHEN v.locataire_type = 'libre' THEN v.locataire_nom_libre
    ELSE 'Non défini'
  END as locataire_affiche,

  -- Calculer le nom du loueur à afficher
  CASE
    WHEN v.loueur_type = 'chauffeur_tca' AND v.loueur_chauffeur_id IS NOT NULL THEN (
      SELECT CONCAT(p.prenom, ' ', UPPER(p.nom), ' (', p.matricule_tca, ')')
      FROM profil p
      WHERE p.id = v.loueur_chauffeur_id
    )
    WHEN v.loueur_type IN ('entreprise', 'personne_externe') THEN v.loueur_nom_externe
    ELSE '-'
  END as loueur_affiche,

  -- Conserver les informations sur les chauffeurs actifs
  COALESCE(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'id', av.profil_id,
        'nom', p.nom,
        'prenom', p.prenom,
        'matricule_tca', p.matricule_tca,
        'type_attribution', av.type_attribution,
        'date_debut', av.date_debut,
        'loueur_id', l.id,
        'loueur_nom', l.nom  -- CORRECTION: l.nom au lieu de l.nom_entreprise
      )
    ) FILTER (WHERE av.profil_id IS NOT NULL AND av.date_fin IS NULL),
    '[]'::jsonb
  ) as chauffeurs_actifs,

  COUNT(DISTINCT av.profil_id) FILTER (WHERE av.date_fin IS NULL) as nb_chauffeurs_actifs

FROM vehicule v
LEFT JOIN attribution_vehicule av ON v.id = av.vehicule_id AND av.date_fin IS NULL
LEFT JOIN profil p ON av.profil_id = p.id
LEFT JOIN loueur l ON av.loueur_id = l.id
GROUP BY v.id;

-- ==============================================================================
-- ÉTAPE 3 : VÉRIFICATION
-- ==============================================================================

-- Vérifier que la vue fonctionne correctement
SELECT COUNT(*) as total_vehicules FROM v_vehicles_list;

-- Afficher quelques exemples
SELECT
  id,
  immatriculation,
  marque,
  modele,
  locataire_affiche,
  loueur_affiche,
  nb_chauffeurs_actifs
FROM v_vehicles_list
LIMIT 5;

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✓ Vue v_vehicles_list recréée avec succès !';
  RAISE NOTICE '✓ Colonnes locataire_affiche et loueur_affiche ajoutées';
  RAISE NOTICE '✓ Correction l.nom_entreprise → l.nom appliquée';
END $$;
