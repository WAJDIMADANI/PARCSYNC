/*
  # MIGRATION URGENTE: Vue v_vehicles_list avec locataire_affiche

  ## Problème résolu
  L'UI affiche "Non défini" car la colonne `locataire_affiche` n'existe pas dans la vue.
  Cette migration ajoute le calcul automatique du nom du locataire depuis l'attribution principale.

  ## Ce que fait cette migration
  1. Ajoute les colonnes système locataire/propriétaire/loueur à la table vehicule
  2. Recrée la vue v_vehicles_list avec la colonne locataire_affiche calculée
  3. Corrige la référence l.nom_entreprise → l.nom
  4. Ajoute les contraintes et index nécessaires

  ## Comment exécuter
  1. Ouvrir l'éditeur SQL de Supabase (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)
  2. Copier/coller tout ce fichier
  3. Cliquer sur "Run"
  4. Rafraîchir la page de l'application
*/

-- ==============================================================================
-- ÉTAPE 1 : AJOUTER LES COLONNES SI ELLES N'EXISTENT PAS
-- ==============================================================================

DO $$
BEGIN
  -- Colonnes pour le système locataire/propriétaire/loueur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'locataire_type') THEN
    ALTER TABLE vehicule ADD COLUMN locataire_type text;
    RAISE NOTICE '✓ Colonne locataire_type ajoutée';
  ELSE
    RAISE NOTICE '- Colonne locataire_type existe déjà';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'locataire_nom_libre') THEN
    ALTER TABLE vehicule ADD COLUMN locataire_nom_libre text;
    RAISE NOTICE '✓ Colonne locataire_nom_libre ajoutée';
  ELSE
    RAISE NOTICE '- Colonne locataire_nom_libre existe déjà';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'proprietaire_carte_grise') THEN
    ALTER TABLE vehicule ADD COLUMN proprietaire_carte_grise text;
    RAISE NOTICE '✓ Colonne proprietaire_carte_grise ajoutée';
  ELSE
    RAISE NOTICE '- Colonne proprietaire_carte_grise existe déjà';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'loueur_type') THEN
    ALTER TABLE vehicule ADD COLUMN loueur_type text;
    RAISE NOTICE '✓ Colonne loueur_type ajoutée';
  ELSE
    RAISE NOTICE '- Colonne loueur_type existe déjà';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'loueur_chauffeur_id') THEN
    ALTER TABLE vehicule ADD COLUMN loueur_chauffeur_id uuid;
    RAISE NOTICE '✓ Colonne loueur_chauffeur_id ajoutée';
  ELSE
    RAISE NOTICE '- Colonne loueur_chauffeur_id existe déjà';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicule' AND column_name = 'loueur_nom_externe') THEN
    ALTER TABLE vehicule ADD COLUMN loueur_nom_externe text;
    RAISE NOTICE '✓ Colonne loueur_nom_externe ajoutée';
  ELSE
    RAISE NOTICE '- Colonne loueur_nom_externe existe déjà';
  END IF;
END $$;

-- ==============================================================================
-- ÉTAPE 2 : AJOUTER LES CONTRAINTES
-- ==============================================================================

DO $$
BEGIN
  -- Foreign key pour loueur_chauffeur_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicule_loueur_chauffeur_id_fkey') THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_loueur_chauffeur_id_fkey
    FOREIGN KEY (loueur_chauffeur_id) REFERENCES profil(id) ON DELETE SET NULL;
    RAISE NOTICE '✓ Contrainte FK loueur_chauffeur_id ajoutée';
  ELSE
    RAISE NOTICE '- Contrainte FK loueur_chauffeur_id existe déjà';
  END IF;

  -- Contrainte CHECK pour locataire_type
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicule_locataire_type_check') THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_locataire_type_check
    CHECK (locataire_type IS NULL OR locataire_type IN ('epave', 'sur_parc', 'vendu', 'libre'));
    RAISE NOTICE '✓ Contrainte CHECK locataire_type ajoutée';
  ELSE
    RAISE NOTICE '- Contrainte CHECK locataire_type existe déjà';
  END IF;

  -- Contrainte CHECK pour loueur_type
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicule_loueur_type_check') THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_loueur_type_check
    CHECK (loueur_type IS NULL OR loueur_type IN ('chauffeur_tca', 'entreprise', 'personne_externe'));
    RAISE NOTICE '✓ Contrainte CHECK loueur_type ajoutée';
  ELSE
    RAISE NOTICE '- Contrainte CHECK loueur_type existe déjà';
  END IF;

  -- Contrainte de cohérence pour loueur
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicule_loueur_coherence_check') THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_loueur_coherence_check
    CHECK (
      (loueur_type = 'chauffeur_tca' AND loueur_chauffeur_id IS NOT NULL) OR
      (loueur_type IN ('entreprise', 'personne_externe') AND loueur_nom_externe IS NOT NULL) OR
      (loueur_type IS NULL)
    );
    RAISE NOTICE '✓ Contrainte cohérence loueur ajoutée';
  ELSE
    RAISE NOTICE '- Contrainte cohérence loueur existe déjà';
  END IF;

  -- Contrainte pour locataire_nom_libre
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicule_locataire_libre_check') THEN
    ALTER TABLE vehicule
    ADD CONSTRAINT vehicule_locataire_libre_check
    CHECK (
      (locataire_type = 'libre' AND locataire_nom_libre IS NOT NULL) OR
      (locataire_type != 'libre' OR locataire_type IS NULL)
    );
    RAISE NOTICE '✓ Contrainte locataire_nom_libre ajoutée';
  ELSE
    RAISE NOTICE '- Contrainte locataire_nom_libre existe déjà';
  END IF;
END $$;

-- ==============================================================================
-- ÉTAPE 3 : CRÉER LES INDEX
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_vehicule_locataire_type ON vehicule(locataire_type);
CREATE INDEX IF NOT EXISTS idx_vehicule_loueur_type ON vehicule(loueur_type);
CREATE INDEX IF NOT EXISTS idx_vehicule_loueur_chauffeur_id ON vehicule(loueur_chauffeur_id);

RAISE NOTICE '✓ Index créés';

-- ==============================================================================
-- ÉTAPE 4 : RECRÉER LA VUE v_vehicles_list AVEC locataire_affiche
-- ==============================================================================

DROP VIEW IF EXISTS v_vehicles_list CASCADE;

CREATE VIEW v_vehicles_list AS
SELECT
  v.*,

  -- *** NOUVEAU : Calculer le nom du locataire à afficher automatiquement ***
  CASE
    -- Si une attribution principale ACTIVE existe, afficher le nom du chauffeur
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
    -- Sinon utiliser les types manuels
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
  -- *** CORRECTION : l.nom au lieu de l.nom_entreprise ***
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
        'loueur_nom', l.nom  -- CORRIGÉ ICI
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
-- ÉTAPE 5 : VÉRIFICATION
-- ==============================================================================

-- Vérifier que les colonnes ont été ajoutées
DO $$
DECLARE
  col_count int;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'vehicule'
  AND column_name IN ('locataire_type', 'loueur_type', 'proprietaire_carte_grise');

  IF col_count >= 3 THEN
    RAISE NOTICE '✓✓✓ Toutes les colonnes ont été ajoutées avec succès';
  ELSE
    RAISE WARNING '⚠ Seulement % colonnes ajoutées sur 6', col_count;
  END IF;
END $$;

-- Vérifier que la vue fonctionne
SELECT COUNT(*) as "Total véhicules dans la vue" FROM v_vehicles_list;

-- Afficher un exemple de locataire_affiche
SELECT
  immatriculation,
  marque,
  modele,
  locataire_affiche,
  loueur_affiche,
  nb_chauffeurs_actifs
FROM v_vehicles_list
ORDER BY created_at DESC
LIMIT 5;

-- Message de succès final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓✓✓ MIGRATION RÉUSSIE !';
  RAISE NOTICE '';
  RAISE NOTICE 'La colonne locataire_affiche est maintenant disponible dans v_vehicles_list';
  RAISE NOTICE 'Elle affiche automatiquement le nom du chauffeur principal actif';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaine étape : Rafraîchir la page de votre application';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
