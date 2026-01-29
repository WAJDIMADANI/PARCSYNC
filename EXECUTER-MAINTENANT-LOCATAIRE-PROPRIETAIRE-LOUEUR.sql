/*
  # CORRECTION ET INSTALLATION : Système Locataire / Propriétaire / Loueur

  Cette migration corrige l'erreur de colonne et installe le système complet.

  ÉTAPE 1 : Ajout des nouveaux champs
  ÉTAPE 2 : Création des contraintes et index
  ÉTAPE 3 : Migration des données existantes
  ÉTAPE 4 : Recréation de la vue v_vehicles_list (CORRECTION de l.nom_entreprise → l.nom)
*/

-- ==============================================================================
-- ÉTAPE 1 : AJOUTER LES NOUVEAUX CHAMPS
-- ==============================================================================

ALTER TABLE vehicule
ADD COLUMN IF NOT EXISTS locataire_type text,
ADD COLUMN IF NOT EXISTS locataire_nom_libre text,
ADD COLUMN IF NOT EXISTS proprietaire_carte_grise text,
ADD COLUMN IF NOT EXISTS loueur_type text,
ADD COLUMN IF NOT EXISTS loueur_chauffeur_id uuid,
ADD COLUMN IF NOT EXISTS loueur_nom_externe text;

-- ==============================================================================
-- ÉTAPE 2 : CONTRAINTES ET INDEX
-- ==============================================================================

-- Foreign key pour loueur_chauffeur_id
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

-- Contraintes CHECK pour locataire_type
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

-- Contraintes CHECK pour loueur_type
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

-- Contrainte de cohérence pour loueur
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

-- Contrainte pour locataire_nom_libre
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

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_vehicule_locataire_type ON vehicule(locataire_type);
CREATE INDEX IF NOT EXISTS idx_vehicule_loueur_type ON vehicule(loueur_type);
CREATE INDEX IF NOT EXISTS idx_vehicule_loueur_chauffeur_id ON vehicule(loueur_chauffeur_id);

-- ==============================================================================
-- ÉTAPE 3 : MIGRATION DES DONNÉES EXISTANTES
-- ==============================================================================

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

-- ==============================================================================
-- ÉTAPE 4 : RECRÉER LA VUE v_vehicles_list (CORRECTION)
-- ==============================================================================

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

  -- Calculer le nom du loueur à afficher (CORRECTION: l.nom au lieu de l.nom_entreprise)
  CASE
    WHEN v.loueur_type = 'chauffeur_tca' AND v.loueur_chauffeur_id IS NOT NULL THEN (
      SELECT CONCAT(p.prenom, ' ', UPPER(p.nom), ' (', p.matricule_tca, ')')
      FROM profil p
      WHERE p.id = v.loueur_chauffeur_id
    )
    WHEN v.loueur_type IN ('entreprise', 'personne_externe') THEN v.loueur_nom_externe
    ELSE '-'
  END as loueur_affiche,

  -- Conserver les informations sur les chauffeurs actifs (CORRECTION: l.nom au lieu de l.nom_entreprise)
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

-- ==============================================================================
-- VÉRIFICATION
-- ==============================================================================

-- Vérifier que la vue fonctionne correctement
SELECT
  immatriculation,
  locataire_affiche,
  proprietaire_carte_grise,
  loueur_affiche
FROM v_vehicles_list
LIMIT 5;

-- Afficher un message de succès
DO $$
BEGIN
  RAISE NOTICE '✓ Migration terminée avec succès !';
  RAISE NOTICE '✓ Nouveaux champs ajoutés à la table vehicule';
  RAISE NOTICE '✓ Vue v_vehicles_list recréée (correction appliquée)';
  RAISE NOTICE '✓ Données existantes migrées automatiquement';
END $$;
