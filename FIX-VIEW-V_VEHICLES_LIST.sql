/*
  # CORRECTION URGENTE : Vue v_vehicles_list

  Problème résolu : "cannot change name of view column 'immat_norm' to 'marque'"

  Cette erreur se produit quand on essaie de recréer une vue avec des colonnes
  dans un ordre différent. La solution est de supprimer la vue avant de la recréer.

  Cette migration:
  1. Ajoute les colonnes locataire_type, loueur_type, etc. si elles n'existent pas
  2. Supprime la vue existante v_vehicles_list
  3. La recrée avec la structure correcte incluant les nouvelles colonnes
  4. Corrige la référence l.nom_entreprise → l.nom
*/

-- ==============================================================================
-- ÉTAPE 1 : AJOUTER LES COLONNES NÉCESSAIRES SI ELLES N'EXISTENT PAS
-- ==============================================================================

-- Ajouter les colonnes pour le système locataire/propriétaire/loueur
ALTER TABLE vehicule
ADD COLUMN IF NOT EXISTS locataire_type text,
ADD COLUMN IF NOT EXISTS locataire_nom_libre text,
ADD COLUMN IF NOT EXISTS proprietaire_carte_grise text,
ADD COLUMN IF NOT EXISTS loueur_type text,
ADD COLUMN IF NOT EXISTS loueur_chauffeur_id uuid,
ADD COLUMN IF NOT EXISTS loueur_nom_externe text;

-- Ajouter la contrainte de foreign key pour loueur_chauffeur_id
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

-- Ajouter les contraintes CHECK pour locataire_type
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

-- Ajouter les contraintes CHECK pour loueur_type
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

-- Ajouter une contrainte pour garantir la cohérence du loueur
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

-- Ajouter une contrainte pour locataire_nom_libre
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

-- Créer des index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_vehicule_locataire_type ON vehicule(locataire_type);
CREATE INDEX IF NOT EXISTS idx_vehicule_loueur_type ON vehicule(loueur_type);
CREATE INDEX IF NOT EXISTS idx_vehicule_loueur_chauffeur_id ON vehicule(loueur_chauffeur_id);

-- ==============================================================================
-- ÉTAPE 2 : SUPPRIMER LA VUE EXISTANTE
-- ==============================================================================

DROP VIEW IF EXISTS v_vehicles_list CASCADE;

-- ==============================================================================
-- ÉTAPE 3 : RECRÉER LA VUE AVEC LA STRUCTURE COMPLÈTE
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
-- ÉTAPE 4 : VÉRIFICATION
-- ==============================================================================

-- Vérifier que les colonnes ont été ajoutées
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'locataire_type') THEN '✓' ELSE '✗' END as locataire_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'loueur_type') THEN '✓' ELSE '✗' END as loueur_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'proprietaire_carte_grise') THEN '✓' ELSE '✗' END as proprietaire_carte_grise
;

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
  RAISE NOTICE '✓ Colonnes locataire_type, loueur_type, etc. ajoutées à la table vehicule';
  RAISE NOTICE '✓ Vue v_vehicles_list recréée avec succès !';
  RAISE NOTICE '✓ Colonnes locataire_affiche et loueur_affiche ajoutées';
  RAISE NOTICE '✓ Correction l.nom_entreprise → l.nom appliquée';
  RAISE NOTICE '✓ Contraintes et index créés';
END $$;
