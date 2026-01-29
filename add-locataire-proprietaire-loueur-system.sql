/*
  # Ajout du système Locataire / Propriétaire / Loueur

  1. Nouveaux champs dans la table vehicule
    - `locataire_type` (text, nullable) - Type de locataire actuel
      - Valeurs: NULL (attribué à un chauffeur), "epave", "sur_parc", "vendu", "libre"
    - `locataire_nom_libre` (text, nullable) - Nom saisi manuellement quand locataire_type = "libre"
    - `proprietaire_carte_grise` (text, nullable) - Nom du propriétaire légal sur la carte grise
    - `loueur_type` (text, nullable) - Type de loueur
      - Valeurs: "chauffeur_tca", "entreprise", "personne_externe", NULL
    - `loueur_chauffeur_id` (uuid, nullable) - Référence au chauffeur si loueur_type = "chauffeur_tca"
    - `loueur_nom_externe` (text, nullable) - Nom saisi manuellement si loueur_type = "entreprise" ou "personne_externe"

  2. Contraintes et validations
    - Contraintes CHECK pour assurer la cohérence des données
    - Index de performance sur les nouveaux champs
    - Foreign key sur loueur_chauffeur_id vers profil

  3. Mise à jour de la vue v_vehicles_list
    - Ajout de colonnes calculées: locataire_affiche, proprietaire_carte_grise, loueur_affiche
    - Jointure avec profil pour afficher le loueur si c'est un chauffeur TCA

  4. Migration des données existantes
    - Véhicules avec attribution principale active: locataire_type = NULL
    - Véhicules sans attribution: locataire_type = "sur_parc"
*/

-- Étape 1: Ajouter les nouveaux champs à la table vehicule
ALTER TABLE vehicule
ADD COLUMN IF NOT EXISTS locataire_type text,
ADD COLUMN IF NOT EXISTS locataire_nom_libre text,
ADD COLUMN IF NOT EXISTS proprietaire_carte_grise text,
ADD COLUMN IF NOT EXISTS loueur_type text,
ADD COLUMN IF NOT EXISTS loueur_chauffeur_id uuid,
ADD COLUMN IF NOT EXISTS loueur_nom_externe text;

-- Étape 2: Ajouter la contrainte de foreign key pour loueur_chauffeur_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicule_loueur_chauffeur_id_fkey'
  ) THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_loueur_chauffeur_id_fkey
    FOREIGN KEY (loueur_chauffeur_id) REFERENCES profil(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Étape 3: Ajouter les contraintes CHECK pour locataire_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicule_locataire_type_check'
  ) THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_locataire_type_check
    CHECK (locataire_type IS NULL OR locataire_type IN ('epave', 'sur_parc', 'vendu', 'libre'));
  END IF;
END $$;

-- Étape 4: Ajouter les contraintes CHECK pour loueur_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicule_loueur_type_check'
  ) THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_loueur_type_check
    CHECK (loueur_type IS NULL OR loueur_type IN ('chauffeur_tca', 'entreprise', 'personne_externe'));
  END IF;
END $$;

-- Étape 5: Ajouter une contrainte pour garantir la cohérence du loueur
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicule_loueur_coherence_check'
  ) THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_loueur_coherence_check
    CHECK (
      (loueur_type = 'chauffeur_tca' AND loueur_chauffeur_id IS NOT NULL) OR
      (loueur_type IN ('entreprise', 'personne_externe') AND loueur_nom_externe IS NOT NULL) OR
      (loueur_type IS NULL)
    );
  END IF;
END $$;

-- Étape 6: Ajouter une contrainte pour locataire_nom_libre
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicule_locataire_libre_check'
  ) THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_locataire_libre_check
    CHECK (
      (locataire_type = 'libre' AND locataire_nom_libre IS NOT NULL) OR
      (locataire_type != 'libre' OR locataire_type IS NULL)
    );
  END IF;
END $$;

-- Étape 7: Créer des index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_vehicule_locataire_type ON vehicule(locataire_type);
CREATE INDEX IF NOT EXISTS idx_vehicule_loueur_type ON vehicule(loueur_type);
CREATE INDEX IF NOT EXISTS idx_vehicule_loueur_chauffeur_id ON vehicule(loueur_chauffeur_id);

-- Étape 8: Migrer les données existantes
-- Véhicules avec attribution principale active: locataire_type = NULL
-- Véhicules sans attribution: locataire_type = "sur_parc"
UPDATE vehicule v
SET locataire_type = CASE
  WHEN EXISTS (
    SELECT 1 FROM attribution_vehicule av
    WHERE av.vehicule_id = v.id
      AND av.type_attribution = 'principal'
      AND av.date_fin IS NULL
  ) THEN NULL
  ELSE 'sur_parc'
END
WHERE locataire_type IS NULL;

-- Étape 9: Recréer la vue v_vehicles_list avec les nouvelles colonnes calculées
-- Supprimer l'ancienne vue si elle existe (nécessaire pour changer l'ordre des colonnes)
DROP VIEW IF EXISTS v_vehicles_list CASCADE;

-- Recréer la vue avec la structure correcte
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

  -- Conserver les informations sur les chauffeurs actifs (tous types d'attribution)
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
        'loueur_nom', l.nom
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

-- Étape 10: Mettre à jour la vue v_vehicules_dashboard
CREATE OR REPLACE VIEW v_vehicules_dashboard AS
SELECT
  v.id,
  v.immatriculation,
  v.reference_tca,
  v.marque,
  v.modele,
  v.annee,
  v.statut,
  v.kilometrage_actuel,
  v.derniere_maj_kilometrage,
  v.locataire_type,
  v.proprietaire_carte_grise,
  v.loueur_type,
  (SELECT COUNT(*) FROM document_vehicule WHERE vehicule_id = v.id AND actif = true) as nb_documents,
  (SELECT COUNT(*) FROM document_vehicule WHERE vehicule_id = v.id AND actif = true AND date_expiration < CURRENT_DATE) as nb_documents_expires,
  (SELECT COUNT(*) FROM document_vehicule WHERE vehicule_id = v.id AND actif = true AND date_expiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as nb_documents_expirant_bientot,
  (SELECT MAX(date_releve) FROM historique_kilometrage WHERE vehicule_id = v.id) as derniere_saisie_km,
  -- Calculer le nombre de véhicules par type de locataire
  (SELECT COUNT(*) FROM vehicule WHERE locataire_type IS NULL) as nb_attribues_chauffeur,
  (SELECT COUNT(*) FROM vehicule WHERE locataire_type = 'sur_parc') as nb_sur_parc,
  (SELECT COUNT(*) FROM vehicule WHERE locataire_type = 'epave') as nb_epaves
FROM vehicule v;
