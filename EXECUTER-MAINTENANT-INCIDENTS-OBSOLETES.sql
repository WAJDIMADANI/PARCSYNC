-- ========================================
-- FIX: Incidents contrats expirés obsolètes
-- À exécuter dans Supabase SQL Editor
-- ========================================

-- ÉTAPE 1: Modifier get_cdd_expires()
CREATE OR REPLACE FUNCTION get_cdd_expires()
RETURNS TABLE (
  profil_id uuid,
  nom text,
  prenom text,
  email text,
  matricule_tca text,
  date_expiration_reelle date,
  contrat_id uuid,
  contrat_type text,
  contrat_date_debut date,
  contrat_date_fin date,
  contrat_statut text,
  jours_avant_expiration integer
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH cdd_avec_date_reelle AS (
    SELECT
      p.id as profil_id,
      p.nom,
      p.prenom,
      p.email,
      p.matricule_tca,
      c.id as contrat_id,
      c.type as contrat_type,
      c.date_debut as contrat_date_debut,
      c.date_fin as contrat_date_fin,
      c.statut as contrat_statut,
      GREATEST(
        c.date_fin,
        COALESCE(c.date_fin_avenant1, c.date_fin),
        COALESCE(c.date_fin_avenant2, c.date_fin)
      ) as date_expiration_reelle
    FROM profil p
    INNER JOIN contrat c ON c.profil_id = p.id
    WHERE
      LOWER(c.type) = 'cdd'
      AND c.statut IN ('actif', 'signed', 'signe')
      AND p.statut = 'actif'
  ),
  profils_avec_cdi_couvrant AS (
    SELECT DISTINCT cdd.profil_id, cdd.date_expiration_reelle
    FROM cdd_avec_date_reelle cdd
    INNER JOIN contrat cdi ON cdi.profil_id = cdd.profil_id
    WHERE
      LOWER(cdi.type) = 'cdi'
      AND cdi.statut IN ('actif', 'signed', 'signe')
      AND cdi.date_fin IS NULL
      AND cdi.date_debut >= cdd.date_expiration_reelle
  )
  SELECT
    cdd.profil_id,
    cdd.nom,
    cdd.prenom,
    cdd.email,
    cdd.matricule_tca,
    cdd.date_expiration_reelle,
    cdd.contrat_id,
    cdd.contrat_type,
    cdd.contrat_date_debut,
    cdd.contrat_date_fin,
    cdd.contrat_statut,
    (cdd.date_expiration_reelle - CURRENT_DATE) as jours_avant_expiration
  FROM cdd_avec_date_reelle cdd
  WHERE NOT EXISTS (
    SELECT 1
    FROM profils_avec_cdi_couvrant pcdi
    WHERE pcdi.profil_id = cdd.profil_id
      AND pcdi.date_expiration_reelle = cdd.date_expiration_reelle
  )
  AND (
    cdd.date_expiration_reelle < CURRENT_DATE
    OR cdd.date_expiration_reelle <= (CURRENT_DATE + INTERVAL '30 days')
  )
  ORDER BY cdd.date_expiration_reelle ASC;
END;
$$ LANGUAGE plpgsql;

-- ÉTAPE 2: Modifier get_avenants_expires()
CREATE OR REPLACE FUNCTION get_avenants_expires()
RETURNS TABLE (
  profil_id uuid,
  nom text,
  prenom text,
  email text,
  matricule_tca text,
  date_expiration_reelle date,
  contrat_id uuid,
  contrat_type text,
  contrat_date_debut date,
  contrat_date_fin date,
  contrat_statut text,
  avenant_1_date_fin date,
  avenant_2_date_fin date,
  jours_depuis_expiration integer
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH avenants_avec_date_reelle AS (
    SELECT
      p.id as profil_id,
      p.nom,
      p.prenom,
      p.email,
      p.matricule_tca,
      GREATEST(
        COALESCE(p.avenant_2_date_fin, '1900-01-01'::date),
        COALESCE(p.avenant_1_date_fin, '1900-01-01'::date)
      ) as date_expiration_reelle,
      c.id as contrat_id,
      c.type as contrat_type,
      c.date_debut as contrat_date_debut,
      c.date_fin as contrat_date_fin,
      c.statut as contrat_statut,
      p.avenant_1_date_fin,
      p.avenant_2_date_fin,
      (CURRENT_DATE - GREATEST(
        COALESCE(p.avenant_2_date_fin, '1900-01-01'::date),
        COALESCE(p.avenant_1_date_fin, '1900-01-01'::date)
      )) as jours_depuis_expiration
    FROM profil p
    LEFT JOIN contrat c ON c.profil_id = p.id
    WHERE
      p.statut = 'actif'
      AND (p.avenant_1_date_fin IS NOT NULL OR p.avenant_2_date_fin IS NOT NULL)
      AND GREATEST(
        COALESCE(p.avenant_2_date_fin, '1900-01-01'::date),
        COALESCE(p.avenant_1_date_fin, '1900-01-01'::date)
      ) < CURRENT_DATE
  ),
  profils_avec_cdi_couvrant AS (
    SELECT DISTINCT av.profil_id, av.date_expiration_reelle
    FROM avenants_avec_date_reelle av
    INNER JOIN contrat cdi ON cdi.profil_id = av.profil_id
    WHERE
      LOWER(cdi.type) = 'cdi'
      AND cdi.statut IN ('actif', 'signed', 'signe')
      AND cdi.date_fin IS NULL
      AND cdi.date_debut >= av.date_expiration_reelle
  )
  SELECT
    av.profil_id,
    av.nom,
    av.prenom,
    av.email,
    av.matricule_tca,
    av.date_expiration_reelle,
    av.contrat_id,
    av.contrat_type,
    av.contrat_date_debut,
    av.contrat_date_fin,
    av.contrat_statut,
    av.avenant_1_date_fin,
    av.avenant_2_date_fin,
    av.jours_depuis_expiration
  FROM avenants_avec_date_reelle av
  WHERE NOT EXISTS (
    SELECT 1
    FROM profils_avec_cdi_couvrant pcdi
    WHERE pcdi.profil_id = av.profil_id
      AND pcdi.date_expiration_reelle = av.date_expiration_reelle
  )
  ORDER BY av.date_expiration_reelle ASC;
END;
$$ LANGUAGE plpgsql;

-- ÉTAPE 3: Créer fonction résolution incidents obsolètes
CREATE OR REPLACE FUNCTION resoudre_incidents_contrats_obsoletes()
RETURNS TABLE (
  incident_id uuid,
  profil_nom text,
  profil_prenom text,
  date_expiration date,
  cdi_date_debut date,
  action text
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH incidents_a_resoudre AS (
    SELECT
      i.id as incident_id,
      p.nom as profil_nom,
      p.prenom as profil_prenom,
      i.date_expiration_originale,
      cdi.date_debut as cdi_date_debut
    FROM incident i
    INNER JOIN profil p ON p.id = i.profil_id
    INNER JOIN contrat cdi ON cdi.profil_id = p.id
    WHERE
      i.type = 'contrat_expire'
      AND i.statut IN ('actif', 'expire')
      AND LOWER(cdi.type) = 'cdi'
      AND cdi.statut IN ('actif', 'signed', 'signe')
      AND cdi.date_fin IS NULL
      AND cdi.date_debut >= i.date_expiration_originale
  )
  UPDATE incident i
  SET
    statut = 'resolu',
    date_resolution = NOW(),
    commentaire_resolution = 'Auto-résolu: CDI signé/actif couvrant cette période',
    updated_at = NOW()
  FROM incidents_a_resoudre iar
  WHERE i.id = iar.incident_id
  RETURNING
    i.id as incident_id,
    iar.profil_nom,
    iar.profil_prenom,
    iar.date_expiration_originale as date_expiration,
    iar.cdi_date_debut,
    'Résolu automatiquement'::text as action;
END;
$$ LANGUAGE plpgsql;

-- ÉTAPE 4: Trigger auto-résolution lors signature CDI
CREATE OR REPLACE FUNCTION trigger_resoudre_incidents_obsoletes_sur_cdi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF LOWER(NEW.type) = 'cdi'
     AND NEW.statut IN ('actif', 'signed', 'signe')
     AND NEW.date_fin IS NULL
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.statut != NEW.statut))
  THEN
    UPDATE incident
    SET
      statut = 'resolu',
      date_resolution = NOW(),
      commentaire_resolution = 'Auto-résolu: CDI signé/actif depuis le ' || NEW.date_debut::text,
      updated_at = NOW()
    WHERE
      profil_id = NEW.profil_id
      AND type = 'contrat_expire'
      AND statut IN ('actif', 'expire')
      AND date_expiration_originale <= NEW.date_debut;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_resolve_incidents_on_cdi ON contrat;

CREATE TRIGGER auto_resolve_incidents_on_cdi
  AFTER INSERT OR UPDATE ON contrat
  FOR EACH ROW
  EXECUTE FUNCTION trigger_resoudre_incidents_obsoletes_sur_cdi();

-- ÉTAPE 5: BACKFILL - Résoudre incidents existants
SELECT * FROM resoudre_incidents_contrats_obsoletes();

-- ÉTAPE 6: Vérification
SELECT
  'Incidents résolus' as info,
  COUNT(*) as nombre
FROM incident
WHERE type = 'contrat_expire'
  AND statut = 'resolu'
  AND commentaire_resolution LIKE '%Auto-résolu: CDI%';
