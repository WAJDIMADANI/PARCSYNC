/*
  # Correction des contrats CDI fantômes

  ## Problème
  Lors de l'import CSV, un contrat CDI fantôme était créé automatiquement pour tous les salariés
  ayant uniquement des avenants dans leur fichier d'import, même si le CSV ne mentionnait pas de CDI.

  ## Solution
  Cette migration supprime les contrats CDI fantômes pour les profils qui :
  - Ont au moins un contrat de type 'avenant'
  - Ont un contrat de type 'cdi'
  - N'ont AUCUN contrat de type 'cdd'
  - Le CDI a été créé via import (source = 'import')

  Pour ces cas, le CDI est un faux positif créé par l'ancien code d'import.
  On le supprime pour ne garder que les avenants.

  ## Impact
  - Environ 40 contrats CDI fantômes seront supprimés
  - Les avenants associés restent intacts
  - Les incidents liés à ces CDI fantômes seront aussi nettoyés
*/

-- Étape 1: Identifier et afficher les profils concernés (pour audit)
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT c.profil_id)
  INTO affected_count
  FROM contrat c
  WHERE c.type = 'cdi'
    AND c.source = 'import'
    AND EXISTS (
      SELECT 1 FROM contrat c2
      WHERE c2.profil_id = c.profil_id
        AND c2.type = 'avenant'
    )
    AND NOT EXISTS (
      SELECT 1 FROM contrat c3
      WHERE c3.profil_id = c.profil_id
        AND c3.type = 'cdd'
    );

  RAISE NOTICE '🔍 Nombre de profils avec CDI fantômes détectés: %', affected_count;
END $$;

-- Étape 2: Supprimer les incidents liés à ces CDI fantômes
DELETE FROM incident
WHERE contrat_id IN (
  SELECT c.id
  FROM contrat c
  WHERE c.type = 'cdi'
    AND c.source = 'import'
    AND EXISTS (
      SELECT 1 FROM contrat c2
      WHERE c2.profil_id = c.profil_id
        AND c2.type = 'avenant'
    )
    AND NOT EXISTS (
      SELECT 1 FROM contrat c3
      WHERE c3.profil_id = c.profil_id
        AND c3.type = 'cdd'
    )
);

-- Étape 3: Supprimer les contrats CDI fantômes
WITH deleted_contracts AS (
  DELETE FROM contrat
  WHERE type = 'cdi'
    AND source = 'import'
    AND EXISTS (
      SELECT 1 FROM contrat c2
      WHERE c2.profil_id = contrat.profil_id
        AND c2.type = 'avenant'
    )
    AND NOT EXISTS (
      SELECT 1 FROM contrat c3
      WHERE c3.profil_id = contrat.profil_id
        AND c3.type = 'cdd'
    )
  RETURNING id, profil_id
)
SELECT COUNT(*) as deleted_count FROM deleted_contracts;

-- Étape 4: Vérification post-suppression
DO $$
DECLARE
  remaining_phantoms INTEGER;
  total_avenants INTEGER;
  total_cdd INTEGER;
BEGIN
  -- Vérifier qu'il ne reste plus de CDI fantômes
  SELECT COUNT(DISTINCT c.profil_id)
  INTO remaining_phantoms
  FROM contrat c
  WHERE c.type = 'cdi'
    AND c.source = 'import'
    AND EXISTS (
      SELECT 1 FROM contrat c2
      WHERE c2.profil_id = c.profil_id
        AND c2.type = 'avenant'
    )
    AND NOT EXISTS (
      SELECT 1 FROM contrat c3
      WHERE c3.profil_id = c.profil_id
        AND c3.type = 'cdd'
    );

  -- Compter les avenants restants
  SELECT COUNT(*) INTO total_avenants FROM contrat WHERE type = 'avenant';

  -- Compter les CDD restants
  SELECT COUNT(*) INTO total_cdd FROM contrat WHERE type = 'cdd';

  RAISE NOTICE '✅ Vérification terminée:';
  RAISE NOTICE '   - CDI fantômes restants: %', remaining_phantoms;
  RAISE NOTICE '   - Total avenants: %', total_avenants;
  RAISE NOTICE '   - Total CDD: %', total_cdd;

  IF remaining_phantoms > 0 THEN
    RAISE WARNING '⚠️ Il reste encore % CDI fantômes à traiter!', remaining_phantoms;
  ELSE
    RAISE NOTICE '🎉 Tous les CDI fantômes ont été supprimés avec succès!';
  END IF;
END $$;
