-- ============================================================
-- CRÉER VUE v_vehicles_list_ui avec ref_tca
-- ============================================================
-- Cette vue est utilisée par VehicleListNew.tsx
-- Elle doit inclure tous les champs nécessaires dont ref_tca

CREATE OR REPLACE VIEW v_vehicles_list_ui AS
SELECT
  v.id,
  v.immatriculation,
  v.immat_norm,
  v.ref_tca,  -- ✅ Ajout explicite
  v.marque,
  v.modele,
  v.annee,
  v.type,
  v.statut,
  v.date_mise_en_service,
  v.date_premiere_mise_en_circulation,
  v.date_fin_service,
  v.fournisseur,
  v.mode_acquisition,
  v.prix_ht,
  v.prix_ttc,
  v.mensualite_ht,
  v.mensualite_ttc,
  v.duree_contrat_mois,
  v.date_debut_contrat,
  v.date_fin_prevue_contrat,
  v.photo_path,
  v.site_id,
  v.assurance_type,
  v.assurance_compagnie,
  v.assurance_numero_contrat,
  v.licence_transport_numero,
  v.carte_essence_fournisseur,
  v.carte_essence_numero,
  v.carte_essence_attribuee,
  v.kilometrage_actuel,
  v.derniere_maj_kilometrage,
  v.materiel_embarque,
  v.created_at,
  v.locataire_type,
  v.locataire_nom_libre,
  v.proprietaire_carte_grise,

  -- Calculer le locataire à afficher
  CASE
    WHEN v.locataire_type = 'salarie' THEN
      COALESCE(
        (
          SELECT p.nom || ' ' || p.prenom
          FROM attribution_vehicule av
          JOIN profil p ON p.id = av.profil_id
          WHERE av.vehicule_id = v.id
            AND av.type_attribution = 'principal'
            AND av.date_debut <= CURRENT_DATE
            AND (av.date_fin IS NULL OR av.date_fin >= CURRENT_DATE)
          ORDER BY av.date_debut DESC
          LIMIT 1
        ),
        'Non attribué'
      )
    WHEN v.locataire_type = 'personne_externe' OR v.locataire_type = 'entreprise_externe' THEN
      COALESCE(
        (
          SELECT le.nom
          FROM attribution_vehicule av
          JOIN locataire_externe le ON le.id = av.loueur_id
          WHERE av.vehicule_id = v.id
            AND av.date_debut <= CURRENT_DATE
            AND (av.date_fin IS NULL OR av.date_fin >= CURRENT_DATE)
          ORDER BY av.date_debut DESC
          LIMIT 1
        ),
        v.locataire_nom_libre,
        'Non attribué'
      )
    WHEN v.locataire_type = 'libre' THEN
      COALESCE(v.locataire_nom_libre, 'TCA')
    ELSE
      'TCA'
  END AS locataire_affiche,

  -- Aggrégation des chauffeurs actifs
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', p.id,
          'nom', p.nom,
          'prenom', p.prenom,
          'matricule_tca', p.matricule_tca,
          'type_attribution', av.type_attribution,
          'date_debut', av.date_debut,
          'loueur_id', av.loueur_id,
          'loueur_nom', l.nom
        )
        ORDER BY
          CASE av.type_attribution
            WHEN 'principal' THEN 1
            WHEN 'secondaire' THEN 2
            ELSE 3
          END
      )
      FROM attribution_vehicule av
      LEFT JOIN profil p ON p.id = av.profil_id
      LEFT JOIN locataire_externe l ON l.id = av.loueur_id
      WHERE av.vehicule_id = v.id
        AND av.date_debut <= CURRENT_DATE
        AND (av.date_fin IS NULL OR av.date_fin >= CURRENT_DATE)
    ),
    '[]'::json
  ) AS chauffeurs_actifs,

  -- Nombre de chauffeurs actifs
  COALESCE(
    (
      SELECT COUNT(*)::integer
      FROM attribution_vehicule av
      WHERE av.vehicule_id = v.id
        AND av.date_debut <= CURRENT_DATE
        AND (av.date_fin IS NULL OR av.date_fin >= CURRENT_DATE)
    ),
    0
  ) AS nb_chauffeurs_actifs

FROM vehicule v
WHERE v.deleted_at IS NULL;

-- ============================================================
-- Commentaire sur la vue
-- ============================================================
COMMENT ON VIEW v_vehicles_list_ui IS 'Vue optimisée pour l''interface utilisateur des véhicules, incluant ref_tca et toutes les informations nécessaires';

-- ============================================================
-- RÉSULTAT:
-- - Vue créée avec ref_tca inclus explicitement
-- - Utilisable par VehicleListNew.tsx
-- - Calcule automatiquement locataire_affiche et chauffeurs_actifs
-- ============================================================
