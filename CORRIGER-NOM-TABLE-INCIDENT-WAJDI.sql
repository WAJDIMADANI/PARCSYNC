-- ============================================================================
-- CORRECTION: Déplacer l'incident de "incidents" vers "incident"
-- ============================================================================
-- Problème: L'incident a été créé dans la table "incidents" (pluriel)
-- mais l'interface lit depuis la table "incident" (singulier)
-- ============================================================================

-- ÉTAPE 1: Vérifier où est l'incident
DO $$
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC ===';

  -- Vérifier dans "incidents" (pluriel - mauvaise table)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidents') THEN
    RAISE NOTICE '1. Table "incidents" existe';
    RAISE NOTICE '   Incidents pour Wajdi (1590): %', (
      SELECT count(*)
      FROM incidents
      WHERE profil_id = (SELECT id FROM profil WHERE matricule = '1590')
    );
  ELSE
    RAISE NOTICE '1. Table "incidents" n''existe PAS';
  END IF;

  -- Vérifier dans "incident" (singulier - bonne table)
  RAISE NOTICE '2. Table "incident" existe';
  RAISE NOTICE '   Incidents pour Wajdi (1590): %', (
    SELECT count(*)
    FROM incident
    WHERE profil_id = (SELECT id FROM profil WHERE matricule = '1590')
  );
END $$;

-- ÉTAPE 2: Si la table "incidents" existe et contient des données, les déplacer
DO $$
DECLARE
  v_incident_record RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Vérifier si la table "incidents" existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidents') THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION ===';

    -- Copier tous les incidents de "incidents" vers "incident"
    FOR v_incident_record IN
      SELECT * FROM incidents
      WHERE profil_id = (SELECT id FROM profil WHERE matricule = '1590')
    LOOP
      -- Insérer dans la bonne table
      INSERT INTO incident (
        id,
        type,
        profil_id,
        date_expiration_originale,
        date_creation_incident,
        statut,
        date_resolution,
        nouvelle_date_validite,
        notes,
        metadata
      )
      VALUES (
        v_incident_record.id,
        v_incident_record.type,
        v_incident_record.profil_id,
        v_incident_record.date_expiration_originale,
        v_incident_record.date_creation_incident,
        v_incident_record.statut,
        v_incident_record.date_resolution,
        v_incident_record.nouvelle_date_validite,
        v_incident_record.notes,
        v_incident_record.metadata
      )
      ON CONFLICT (id) DO NOTHING;

      v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Incidents migrés: %', v_count;

    -- Supprimer de l'ancienne table
    DELETE FROM incidents
    WHERE profil_id = (SELECT id FROM profil WHERE matricule = '1590');

    RAISE NOTICE 'Incidents supprimés de l''ancienne table';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '=== PAS DE MIGRATION NÉCESSAIRE ===';
    RAISE NOTICE 'La table "incidents" n''existe pas';
  END IF;
END $$;

-- ÉTAPE 3: Si l'incident n'existe toujours pas dans "incident", le créer
DO $$
DECLARE
  v_profil_id UUID;
  v_incident_id UUID;
BEGIN
  -- Récupérer l'ID du profil
  SELECT id INTO v_profil_id
  FROM profil
  WHERE matricule = '1590';

  IF v_profil_id IS NULL THEN
    RAISE EXCEPTION 'Profil avec matricule 1590 non trouvé';
  END IF;

  -- Vérifier si l'incident existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM incident
    WHERE profil_id = v_profil_id
    AND type = 'contrat_cdd'
    AND statut = 'actif'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== CRÉATION DE L''INCIDENT ===';

    -- Créer l'incident dans la bonne table
    INSERT INTO incident (
      type,
      profil_id,
      date_expiration_originale,
      date_creation_incident,
      statut,
      notes,
      metadata
    )
    VALUES (
      'contrat_cdd',
      v_profil_id,
      '2025-12-11',
      NOW(),
      'actif',
      'Contrat CDD expiré - WAJDI MADANI (matricule: 1590)',
      jsonb_build_object(
        'source', 'correction_manuelle',
        'date_creation', NOW()
      )
    )
    RETURNING id INTO v_incident_id;

    RAISE NOTICE 'Incident créé avec succès: %', v_incident_id;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '=== INCIDENT DÉJÀ EXISTANT ===';
    RAISE NOTICE 'L''incident existe déjà dans la bonne table';
  END IF;
END $$;

-- ÉTAPE 4: Vérification finale
SELECT
  'SUCCÈS: L''incident est maintenant dans la bonne table' as message,
  i.id,
  i.type,
  i.statut,
  p.prenom || ' ' || p.nom as nom_complet,
  p.matricule,
  i.date_expiration_originale,
  i.date_creation_incident
FROM incident i
JOIN profil p ON p.id = i.profil_id
WHERE p.matricule = '1590'
AND i.type = 'contrat_cdd'
AND i.statut = 'actif';
