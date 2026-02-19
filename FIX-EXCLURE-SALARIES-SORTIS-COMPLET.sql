/*
  # Exclure les salariés sortis des incidents, notifications et documents manquants

  1. Problème
    - Les salariés avec statut='sorti' apparaissent encore dans :
      - Les incidents
      - Les notifications
      - Les documents manquants

  2. Solution
    - Modifier toutes les vues pour filtrer p.statut != 'sorti'
    - Modifier toutes les fonctions RPC pour exclure les sortis
    - Garantir qu'aucun incident/notification n'est créé pour les sortis

  3. Modifications
    - ✅ v_incidents_ouverts_rh
    - ✅ v_incidents_contrats_affichables
    - ✅ v_incidents_contrats_expires
    - ✅ get_cdd_expires()
    - ✅ get_cdd_expires_for_incidents()
    - ✅ get_avenants_expires()
    - ✅ get_missing_documents_by_salarie()
    - ✅ generate_expired_contract_incidents()
*/

-- ============================================================================
-- 1. RECRÉER LA VUE v_incidents_ouverts_rh
-- ============================================================================
DROP VIEW IF EXISTS v_incidents_ouverts_rh CASCADE;

CREATE OR REPLACE VIEW v_incidents_ouverts_rh AS
SELECT
  i.id,
  i.profil_id,
  i.type,
  i.statut,
  i.date_creation_incident,
  i.date_resolution,
  i.date_expiration_originale,
  i.created_at,
  i.metadata,
  p.prenom,
  p.nom,
  p.matricule,
  p.email
FROM incident i
INNER JOIN profil p ON i.profil_id = p.id
WHERE i.statut IN ('actif', 'en_cours', 'ignore')
  AND p.statut != 'sorti'  -- ✅ NOUVEAU: Exclure les salariés sortis
  AND p.deleted_at IS NULL
ORDER BY i.date_creation_incident DESC;

-- ============================================================================
-- 2. RECRÉER LA VUE v_incidents_contrats_affichables
-- ============================================================================
DROP VIEW IF EXISTS v_incidents_contrats_affichables CASCADE;

CREATE OR REPLACE VIEW v_incidents_contrats_affichables AS
SELECT
  i.id,
  i.profil_id,
  i.type,
  i.statut,
  i.date_creation_incident,
  i.date_resolution,
  i.date_expiration_originale,
  i.created_at,
  i.metadata,
  p.prenom,
  p.nom,
  p.matricule,
  p.email,
  c.type as contrat_type,
  c.date_fin_contrat,
  c.numero_avenant
FROM incident i
INNER JOIN contrat c ON (i.metadata->>'contrat_id')::uuid = c.id
INNER JOIN profil p ON i.profil_id = p.id
WHERE i.type = 'contrat_expire'
  AND LOWER(c.type) != 'cdi'
  AND p.statut != 'sorti'  -- ✅ NOUVEAU: Exclure les salariés sortis
  AND p.deleted_at IS NULL;

-- ============================================================================
-- 3. RECRÉER LA VUE v_incidents_contrats_expires
-- ============================================================================
DROP VIEW IF EXISTS v_incidents_contrats_expires CASCADE;

CREATE OR REPLACE VIEW v_incidents_contrats_expires AS
SELECT
  i.id,
  i.profil_id,
  i.type,
  i.statut,
  i.date_creation_incident,
  i.date_resolution,
  i.date_expiration_originale,
  i.created_at,
  i.metadata,
  p.prenom,
  p.nom,
  p.matricule,
  p.email,
  c.type as contrat_type,
  c.date_fin_contrat,
  c.numero_avenant
FROM incident i
INNER JOIN contrat c ON (i.metadata->>'contrat_id')::uuid = c.id
INNER JOIN profil p ON i.profil_id = p.id
WHERE i.type = 'contrat_expire'
  AND i.statut IN ('actif', 'en_cours')
  AND p.statut != 'sorti'  -- ✅ NOUVEAU: Exclure les salariés sortis
  AND p.deleted_at IS NULL
ORDER BY i.date_creation_incident DESC;

-- ============================================================================
-- 4. RECRÉER FONCTION get_cdd_expires()
-- ============================================================================
CREATE OR REPLACE FUNCTION get_cdd_expires()
RETURNS TABLE (
  contrat_id uuid,
  profil_id uuid,
  matricule text,
  prenom text,
  nom text,
  email text,
  date_debut_contrat date,
  date_fin_contrat date,
  jours_restants integer,
  statut_contrat text,
  numero_avenant integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as contrat_id,
    p.id as profil_id,
    p.matricule,
    p.prenom,
    p.nom,
    p.email,
    c.date_debut_contrat,
    c.date_fin_contrat,
    (c.date_fin_contrat - CURRENT_DATE) as jours_restants,
    c.statut as statut_contrat,
    c.numero_avenant
  FROM contrat c
  INNER JOIN profil p ON c.profil_id = p.id
  WHERE LOWER(c.type) = 'cdd'
    AND c.statut IN ('actif', 'signe', 'en_attente_signature')
    AND c.date_fin_contrat IS NOT NULL
    AND c.date_fin_contrat >= CURRENT_DATE
    AND c.date_fin_contrat <= CURRENT_DATE + INTERVAL '60 days'
    AND p.statut = 'actif'
    AND p.statut != 'sorti'  -- ✅ NOUVEAU: Exclure les salariés sortis
    AND p.deleted_at IS NULL
  ORDER BY c.date_fin_contrat ASC;
END;
$$;

-- ============================================================================
-- 5. RECRÉER FONCTION get_cdd_expires_for_incidents()
-- ============================================================================
DROP FUNCTION IF EXISTS get_cdd_expires_for_incidents() CASCADE;

CREATE OR REPLACE FUNCTION get_cdd_expires_for_incidents()
RETURNS TABLE (
  contrat_id uuid,
  profil_id uuid,
  matricule text,
  prenom text,
  nom text,
  email text,
  date_debut_contrat date,
  date_fin_contrat date,
  jours_restants integer,
  statut_contrat text,
  numero_avenant integer,
  type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as contrat_id,
    p.id as profil_id,
    p.matricule,
    p.prenom,
    p.nom,
    p.email,
    c.date_debut_contrat,
    c.date_fin_contrat,
    (c.date_fin_contrat - CURRENT_DATE) as jours_restants,
    c.statut as statut_contrat,
    c.numero_avenant,
    c.type
  FROM contrat c
  INNER JOIN profil p ON c.profil_id = p.id
  WHERE LOWER(c.type) = 'cdd'
    AND c.statut IN ('actif', 'signe', 'en_attente_signature')
    AND c.date_fin_contrat IS NOT NULL
    AND c.date_fin_contrat < CURRENT_DATE  -- CDD déjà expirés
    AND p.statut = 'actif'
    AND p.statut != 'sorti'  -- ✅ NOUVEAU: Exclure les salariés sortis
    AND p.deleted_at IS NULL
  ORDER BY c.date_fin_contrat DESC;
END;
$$;

-- ============================================================================
-- 6. RECRÉER FONCTION get_avenants_expires()
-- ============================================================================
CREATE OR REPLACE FUNCTION get_avenants_expires()
RETURNS TABLE (
  contrat_id uuid,
  profil_id uuid,
  matricule text,
  prenom text,
  nom text,
  email text,
  date_debut_contrat date,
  date_fin_contrat date,
  numero_avenant integer,
  jours_restants integer,
  statut_contrat text,
  type text,
  date_fin_avenant date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as contrat_id,
    p.id as profil_id,
    p.matricule,
    p.prenom,
    p.nom,
    p.email,
    c.date_debut_contrat,
    c.date_fin_contrat,
    c.numero_avenant,
    (c.date_fin_avenant - CURRENT_DATE) as jours_restants,
    c.statut as statut_contrat,
    c.type,
    c.date_fin_avenant
  FROM contrat c
  INNER JOIN profil p ON c.profil_id = p.id
  WHERE p.statut = 'actif'
    AND p.statut != 'sorti'  -- ✅ NOUVEAU: Exclure les salariés sortis
    AND p.deleted_at IS NULL
    AND c.numero_avenant IS NOT NULL
    AND c.numero_avenant > 0
    AND c.date_fin_avenant IS NOT NULL
    AND c.date_fin_avenant < CURRENT_DATE  -- Avenants déjà expirés
    AND c.statut IN ('actif', 'signe', 'en_attente_signature')
  ORDER BY c.date_fin_avenant DESC;
END;
$$;

-- ============================================================================
-- 7. RECRÉER FONCTION get_missing_documents_by_salarie()
-- ============================================================================
CREATE OR REPLACE FUNCTION get_missing_documents_by_salarie()
RETURNS TABLE (
  profil_id uuid,
  matricule text,
  prenom text,
  nom text,
  email text,
  type_document text,
  date_expiration date,
  jours_restants integer,
  est_expire boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH documents_requis AS (
    SELECT
      p.id as profil_id,
      p.matricule,
      p.prenom,
      p.nom,
      p.email,
      unnest(ARRAY['titre_sejour', 'visite_medicale', 'permis_conduire']) as type_doc
    FROM profil p
    WHERE p.statut = 'actif'
      AND p.statut != 'sorti'  -- ✅ NOUVEAU: Exclure les salariés sortis
      AND p.deleted_at IS NULL
  ),
  documents_existants AS (
    SELECT
      d.profil_id,
      d.type_document,
      d.date_expiration
    FROM document d
    WHERE d.type_document IN ('titre_sejour', 'visite_medicale', 'permis_conduire')
      AND d.deleted_at IS NULL
  )
  SELECT
    dr.profil_id,
    dr.matricule,
    dr.prenom,
    dr.nom,
    dr.email,
    dr.type_doc as type_document,
    de.date_expiration,
    CASE
      WHEN de.date_expiration IS NULL THEN NULL
      ELSE (de.date_expiration - CURRENT_DATE)
    END as jours_restants,
    CASE
      WHEN de.date_expiration IS NULL THEN true
      WHEN de.date_expiration < CURRENT_DATE THEN true
      ELSE false
    END as est_expire
  FROM documents_requis dr
  LEFT JOIN documents_existants de
    ON dr.profil_id = de.profil_id
    AND dr.type_doc = de.type_document
  WHERE de.profil_id IS NULL
     OR de.date_expiration IS NULL
     OR de.date_expiration < CURRENT_DATE
  ORDER BY dr.nom, dr.prenom, dr.type_doc;
END;
$$;

-- ============================================================================
-- 8. MODIFIER FONCTION generate_expired_contract_incidents()
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_expired_contract_incidents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contrat_record RECORD;
  existing_incident_id uuid;
BEGIN
  -- Générer des incidents pour les CDD expirés
  FOR contrat_record IN
    SELECT
      c.id as contrat_id,
      c.profil_id,
      c.date_fin_contrat,
      c.type,
      c.numero_avenant,
      p.email,
      p.prenom,
      p.nom
    FROM contrat c
    INNER JOIN profil p ON c.profil_id = p.id
    WHERE LOWER(c.type) = 'cdd'
      AND c.statut IN ('actif', 'signe')
      AND c.date_fin_contrat < CURRENT_DATE
      AND p.statut = 'actif'
      AND p.statut != 'sorti'  -- ✅ NOUVEAU: Exclure les salariés sortis
      AND p.deleted_at IS NULL
  LOOP
    -- Vérifier si un incident existe déjà pour ce contrat
    SELECT id INTO existing_incident_id
    FROM incident
    WHERE profil_id = contrat_record.profil_id
      AND type = 'contrat_expire'
      AND (metadata->>'contrat_id')::uuid = contrat_record.contrat_id
      AND statut IN ('actif', 'en_cours');

    -- Si pas d'incident existant, en créer un
    IF existing_incident_id IS NULL THEN
      INSERT INTO incident (
        profil_id,
        type,
        date_expiration_originale,
        date_creation_incident,
        statut,
        metadata
      ) VALUES (
        contrat_record.profil_id,
        'contrat_expire',
        contrat_record.date_fin_contrat,
        CURRENT_DATE,
        'actif',
        jsonb_build_object(
          'contrat_id', contrat_record.contrat_id,
          'contrat_type', contrat_record.type,
          'numero_avenant', contrat_record.numero_avenant
        )
      );
    END IF;
  END LOOP;

  -- Générer des incidents pour les avenants expirés
  FOR contrat_record IN
    SELECT
      c.id as contrat_id,
      c.profil_id,
      c.date_fin_avenant,
      c.type,
      c.numero_avenant,
      p.email,
      p.prenom,
      p.nom
    FROM contrat c
    INNER JOIN profil p ON c.profil_id = p.id
    WHERE c.numero_avenant IS NOT NULL
      AND c.numero_avenant > 0
      AND c.date_fin_avenant IS NOT NULL
      AND c.date_fin_avenant < CURRENT_DATE
      AND c.statut IN ('actif', 'signe')
      AND p.statut = 'actif'
      AND p.statut != 'sorti'  -- ✅ NOUVEAU: Exclure les salariés sortis
      AND p.deleted_at IS NULL
  LOOP
    -- Vérifier si un incident existe déjà pour cet avenant
    SELECT id INTO existing_incident_id
    FROM incident
    WHERE profil_id = contrat_record.profil_id
      AND type = 'contrat_expire'
      AND (metadata->>'contrat_id')::uuid = contrat_record.contrat_id
      AND (metadata->>'contrat_type')::text = 'avenant'
      AND statut IN ('actif', 'en_cours');

    -- Si pas d'incident existant, en créer un
    IF existing_incident_id IS NULL THEN
      INSERT INTO incident (
        profil_id,
        type,
        date_expiration_originale,
        date_creation_incident,
        statut,
        metadata
      ) VALUES (
        contrat_record.profil_id,
        'contrat_expire',
        contrat_record.date_fin_avenant,
        CURRENT_DATE,
        'actif',
        jsonb_build_object(
          'contrat_id', contrat_record.contrat_id,
          'contrat_type', 'avenant',
          'numero_avenant', contrat_record.numero_avenant
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 9. CRÉER FONCTION POUR FERMER LES INCIDENTS DES SALARIÉS SORTIS
-- ============================================================================
CREATE OR REPLACE FUNCTION close_incidents_for_departed_employees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fermer tous les incidents actifs des salariés sortis
  UPDATE incident i
  SET
    statut = 'resolu',
    date_resolution = CURRENT_DATE,
    metadata = COALESCE(i.metadata, '{}'::jsonb) || jsonb_build_object(
      'closed_reason', 'employee_departed',
      'closed_at', CURRENT_TIMESTAMP
    )
  FROM profil p
  WHERE i.profil_id = p.id
    AND p.statut = 'sorti'
    AND i.statut IN ('actif', 'en_cours')
    AND i.date_resolution IS NULL;

  RAISE NOTICE 'Incidents fermés pour les salariés sortis';
END;
$$;

-- ============================================================================
-- 10. CRÉER FONCTION POUR ARCHIVER LES NOTIFICATIONS DES SALARIÉS SORTIS
-- ============================================================================
CREATE OR REPLACE FUNCTION archive_notifications_for_departed_employees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Archiver toutes les notifications actives des salariés sortis
  UPDATE notification n
  SET
    statut = 'archive'
  FROM profil p
  WHERE n.profil_id = p.id
    AND p.statut = 'sorti'
    AND n.statut IN ('active', 'email_envoye');

  RAISE NOTICE 'Notifications archivées pour les salariés sortis';
END;
$$;

-- ============================================================================
-- 11. EXÉCUTER LES FONCTIONS DE NETTOYAGE
-- ============================================================================
-- Fermer les incidents existants des salariés sortis
SELECT close_incidents_for_departed_employees();

-- Archiver les notifications existantes des salariés sortis
SELECT archive_notifications_for_departed_employees();

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
