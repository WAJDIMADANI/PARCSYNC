/*
  Script de fusion automatique des doublons de matricule TCA

  ATTENTION: Ce script modifie la base de données de manière irréversible!

  Stratégie:
  1. Pour chaque groupe de doublons, identifier le "profil principal"
     (celui avec le plus de contrats, ou le plus récent)
  2. Transférer tous les contrats, documents et historiques vers le profil principal
  3. Mettre à jour les références
  4. Supprimer les profils en doublon

  Exécutez d'abord detect-duplicate-matricules.sql pour voir les doublons!
*/

-- Fonction pour fusionner les doublons d'un matricule spécifique
CREATE OR REPLACE FUNCTION merge_duplicate_profiles_for_matricule(p_matricule_tca text)
RETURNS TABLE(
  kept_profile_id uuid,
  merged_profile_ids uuid[],
  transferred_contracts integer,
  transferred_documents integer
) AS $$
DECLARE
  v_main_profile_id uuid;
  v_duplicate_ids uuid[];
  v_contracts_count integer := 0;
  v_documents_count integer := 0;
BEGIN
  -- Trouver tous les profils avec ce matricule
  SELECT ARRAY_AGG(id ORDER BY
    (SELECT COUNT(*) FROM contrat WHERE profil_id = profil.id) DESC,
    created_at DESC
  )
  INTO v_duplicate_ids
  FROM profil
  WHERE matricule_tca = p_matricule_tca;

  -- Le premier (avec le plus de contrats ou le plus récent) devient le principal
  v_main_profile_id := v_duplicate_ids[1];

  -- Transférer tous les contrats des doublons vers le profil principal
  UPDATE contrat
  SET profil_id = v_main_profile_id
  WHERE profil_id = ANY(v_duplicate_ids[2:]);

  GET DIAGNOSTICS v_contracts_count = ROW_COUNT;

  -- Transférer tous les documents des doublons vers le profil principal
  UPDATE document
  SET owner_id = v_main_profile_id
  WHERE owner_type = 'profil' AND owner_id = ANY(v_duplicate_ids[2:]);

  GET DIAGNOSTICS v_documents_count = ROW_COUNT;

  -- Transférer les demandes
  UPDATE demande
  SET profil_id = v_main_profile_id
  WHERE profil_id = ANY(v_duplicate_ids[2:]);

  -- Transférer les incidents
  UPDATE incident
  SET profil_id = v_main_profile_id
  WHERE profil_id = ANY(v_duplicate_ids[2:]);

  -- Transférer les notifications
  UPDATE notification
  SET profil_id = v_main_profile_id
  WHERE profil_id = ANY(v_duplicate_ids[2:]);

  -- Fusionner les informations manquantes dans le profil principal
  -- (garder les valeurs non-null des doublons si le principal a des valeurs null)
  UPDATE profil p_main
  SET
    email = COALESCE(p_main.email, (SELECT email FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND email IS NOT NULL LIMIT 1)),
    tel = COALESCE(p_main.tel, (SELECT tel FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND tel IS NOT NULL LIMIT 1)),
    date_naissance = COALESCE(p_main.date_naissance, (SELECT date_naissance FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND date_naissance IS NOT NULL LIMIT 1)),
    lieu_naissance = COALESCE(p_main.lieu_naissance, (SELECT lieu_naissance FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND lieu_naissance IS NOT NULL LIMIT 1)),
    pays_naissance = COALESCE(p_main.pays_naissance, (SELECT pays_naissance FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND pays_naissance IS NOT NULL LIMIT 1)),
    nationalite = COALESCE(p_main.nationalite, (SELECT nationalite FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND nationalite IS NOT NULL LIMIT 1)),
    genre = COALESCE(p_main.genre, (SELECT genre FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND genre IS NOT NULL LIMIT 1)),
    adresse = COALESCE(p_main.adresse, (SELECT adresse FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND adresse IS NOT NULL LIMIT 1)),
    ville = COALESCE(p_main.ville, (SELECT ville FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND ville IS NOT NULL LIMIT 1)),
    code_postal = COALESCE(p_main.code_postal, (SELECT code_postal FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND code_postal IS NOT NULL LIMIT 1)),
    iban = COALESCE(p_main.iban, (SELECT iban FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND iban IS NOT NULL LIMIT 1)),
    bic = COALESCE(p_main.bic, (SELECT bic FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND bic IS NOT NULL LIMIT 1)),
    numero_securite_sociale = COALESCE(p_main.numero_securite_sociale, (SELECT numero_securite_sociale FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND numero_securite_sociale IS NOT NULL LIMIT 1)),
    secteur_id = COALESCE(p_main.secteur_id, (SELECT secteur_id FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND secteur_id IS NOT NULL LIMIT 1)),
    modele_contrat = COALESCE(p_main.modele_contrat, (SELECT modele_contrat FROM profil WHERE id = ANY(v_duplicate_ids[2:]) AND modele_contrat IS NOT NULL LIMIT 1))
  WHERE p_main.id = v_main_profile_id;

  -- Supprimer les profils en doublon (sauf le principal)
  DELETE FROM profil
  WHERE id = ANY(v_duplicate_ids[2:]);

  -- Retourner les résultats
  RETURN QUERY SELECT
    v_main_profile_id,
    v_duplicate_ids[2:],
    v_contracts_count,
    v_documents_count;
END;
$$ LANGUAGE plpgsql;

-- Script pour fusionner TOUS les doublons automatiquement
DO $$
DECLARE
  v_matricule text;
  v_result record;
BEGIN
  RAISE NOTICE '🔄 Début de la fusion des doublons...';

  FOR v_matricule IN
    SELECT matricule_tca
    FROM profil
    WHERE matricule_tca IS NOT NULL
    GROUP BY matricule_tca
    HAVING COUNT(*) > 1
    ORDER BY matricule_tca
  LOOP
    SELECT * INTO v_result
    FROM merge_duplicate_profiles_for_matricule(v_matricule);

    RAISE NOTICE '✅ Matricule %: Profil principal %, % contrats transférés, % documents transférés',
      v_matricule,
      v_result.kept_profile_id,
      v_result.transferred_contracts,
      v_result.transferred_documents;
  END LOOP;

  RAISE NOTICE '✅ Fusion terminée!';
END $$;

-- Vérification après fusion
SELECT
  'Profils avec doublons restants' as verification,
  COUNT(*) as nombre
FROM (
  SELECT matricule_tca
  FROM profil
  WHERE matricule_tca IS NOT NULL
  GROUP BY matricule_tca
  HAVING COUNT(*) > 1
) subquery;
