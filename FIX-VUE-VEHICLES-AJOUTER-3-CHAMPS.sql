-- ============================================================
-- FIX: Ajouter finition, energie, couleur à v_vehicles_list_ui
-- ============================================================
-- PROBLÈME: La vue v_vehicles_list_ui ne contient pas les colonnes
--           finition, energie, couleur
-- CONSÉQUENCE: Ces champs sont NULL dans VehicleListNew même si
--              ils existent en BDD
-- SOLUTION: DROP et recréer la vue avec les 3 colonnes manquantes
-- ============================================================

-- ÉTAPE 1: Supprimer la vue existante
DROP VIEW IF EXISTS v_vehicles_list_ui CASCADE;

-- ÉTAPE 2: Recréer la vue avec finition, energie, couleur
CREATE VIEW v_vehicles_list_ui AS
SELECT
  v.id,
  v.immatriculation,
  v.immat_norm,
  v.ref_tca,
  v.marque,
  v.modele,
  v.finition,        -- ✅ AJOUTÉ
  v.energie,         -- ✅ AJOUTÉ
  v.couleur,         -- ✅ AJOUTÉ
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

  -- Locataire affiché
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
          SELECT l.nom
          FROM attribution_vehicule av
          JOIN loueur l ON l.id = av.loueur_id
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

  -- Chauffeurs actifs
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
      LEFT JOIN loueur l ON l.id = av.loueur_id
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

FROM vehicule v;

-- ============================================================
-- VÉRIFICATION
-- ============================================================

-- Test 1: Vérifier que les 3 colonnes sont présentes
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_vehicles_list_ui'
  AND column_name IN ('finition', 'energie', 'couleur')
ORDER BY column_name;

-- Résultat attendu:
-- couleur  | text
-- energie  | text
-- finition | text

-- Test 2: Vérifier les données pour AZ123EY
SELECT
  immatriculation,
  ref_tca,
  marque,
  modele,
  finition,
  energie,
  couleur,
  mode_acquisition
FROM v_vehicles_list_ui
WHERE immatriculation = 'AZ123EY';

-- Test 3: Vérifier tous les véhicules avec finition/energie/couleur non NULL
SELECT
  immatriculation,
  finition,
  energie,
  couleur
FROM v_vehicles_list_ui
WHERE finition IS NOT NULL
   OR energie IS NOT NULL
   OR couleur IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- RÉSULTAT ATTENDU
-- ============================================================

-- Après exécution:
-- ✅ La vue v_vehicles_list_ui contient finition, energie, couleur
-- ✅ VehicleListNew affichera ces champs dans le modal détail
-- ✅ Les véhicules existants avec ces données les verront affichées
-- ============================================================
