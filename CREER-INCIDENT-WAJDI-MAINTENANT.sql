/*
  ╔════════════════════════════════════════════════════════════════════╗
  ║  CRÉER L'INCIDENT POUR LE CONTRAT EXPIRÉ DE WAJDI                ║
  ║                                                                    ║
  ║  PROBLÈME:                                                         ║
  ║  - Le contrat expire AUJOURD'HUI (0 jours restants)               ║
  ║  - Une notification existe dans "Documents"                       ║
  ║  - Mais AUCUN incident n'a été créé                               ║
  ║                                                                    ║
  ║  SOLUTION:                                                         ║
  ║  - Créer l'incident manuellement                                  ║
  ║  - Il apparaîtra dans: Incidents > Contrats Expirés               ║
  ╚════════════════════════════════════════════════════════════════════╝
*/

-- ========================================
-- 1. VÉRIFIER LE CONTRAT DE WAJDI
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    CONTRAT DE WAJDI' as titre;

SELECT
  c.id,
  p.prenom as "Prénom",
  p.nom as "Nom",
  p.matricule_tca as "Matricule",
  c.type as "Type",
  c.date_fin as "Date Fin",
  CURRENT_DATE as "Aujourd'hui",
  c.date_fin - CURRENT_DATE as "Jours restants",
  c.statut as "Statut",
  CASE
    WHEN c.date_fin < CURRENT_DATE THEN '❌ EXPIRÉ'
    WHEN c.date_fin = CURRENT_DATE THEN '⚠️ EXPIRE AUJOURD''HUI'
    ELSE '✅ Futur'
  END as "État"
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 2. CHERCHER UN INCIDENT EXISTANT
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    INCIDENTS POUR WAJDI' as titre;

SELECT
  i.id,
  i.type as "Type",
  i.titre as "Titre",
  i.statut as "Statut",
  i.date_expiration_originale as "Date Expiration",
  i.date_creation_incident as "Date Création",
  i.created_at as "Créé le"
FROM incident i
JOIN contrat c ON c.profil_id = i.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
  AND i.type IN ('contrat_expire', 'contrat_cdd')
ORDER BY i.created_at DESC;

-- ========================================
-- 3. CRÉER L'INCIDENT POUR WAJDI
-- ========================================
DO $$
DECLARE
  v_contrat RECORD;
  v_incident_exists BOOLEAN;
  v_incident_id uuid;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  CRÉATION INCIDENT CONTRAT EXPIRÉ - WAJDI                 ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- Récupérer le contrat de Wajdi
  SELECT
    c.id as contrat_id,
    c.profil_id,
    c.date_fin,
    c.type,
    p.prenom,
    p.nom,
    p.matricule_tca,
    p.email
  INTO v_contrat
  FROM contrat c
  JOIN profil p ON c.profil_id = p.id
  WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

  IF v_contrat.contrat_id IS NULL THEN
    RAISE NOTICE '❌ Contrat de Wajdi non trouvé avec cet ID';
    RAISE NOTICE '';
    RAISE NOTICE 'Vérifiez l''ID du contrat dans l''interface';
    RETURN;
  END IF;

  -- Vérifier si un incident existe déjà
  SELECT EXISTS (
    SELECT 1 FROM incident i
    WHERE i.profil_id = v_contrat.profil_id
      AND i.type = 'contrat_expire'
      AND (i.metadata->>'contrat_id')::uuid = v_contrat.contrat_id
      AND i.statut IN ('actif', 'en_cours')
  ) INTO v_incident_exists;

  IF v_incident_exists THEN
    RAISE NOTICE '✅ Un incident existe déjà pour ce contrat';
    RAISE NOTICE '';
    RAISE NOTICE 'Si vous ne le voyez pas:';
    RAISE NOTICE '  1. Rafraîchissez la page (F5)';
    RAISE NOTICE '  2. Allez dans: Incidents > Contrats Expirés';
    RAISE NOTICE '  3. Cherchez "wajdi" ou "15901"';
  ELSE
    -- Créer l'incident
    INSERT INTO incident (
      type,
      titre,
      profil_id,
      date_expiration_originale,
      date_creation_incident,
      statut,
      notes,
      metadata
    ) VALUES (
      'contrat_expire',
      format('Contrat %s expiré - %s %s (matricule: %s)',
        v_contrat.type,
        v_contrat.prenom,
        v_contrat.nom,
        v_contrat.matricule_tca
      ),
      v_contrat.profil_id,
      v_contrat.date_fin,
      CURRENT_DATE,
      'actif',
      format('Le contrat %s de %s %s (matricule: %s) a expiré le %s. Action requise: renouvellement ou fin de contrat.',
        v_contrat.type,
        v_contrat.prenom,
        v_contrat.nom,
        v_contrat.matricule_tca,
        to_char(v_contrat.date_fin, 'DD/MM/YYYY')
      ),
      jsonb_build_object(
        'contrat_id', v_contrat.contrat_id,
        'contrat_type', v_contrat.type,
        'date_expiration', v_contrat.date_fin,
        'matricule', v_contrat.matricule_tca,
        'email', v_contrat.email,
        'source', 'yousign',
        'created_manually', true,
        'reason', 'contract_expired_today'
      )
    )
    RETURNING id INTO v_incident_id;

    RAISE NOTICE '✅ Incident créé avec succès!';
    RAISE NOTICE '';
    RAISE NOTICE 'Détails:';
    RAISE NOTICE '  ID incident: %', v_incident_id;
    RAISE NOTICE '  Nom: % %', v_contrat.prenom, v_contrat.nom;
    RAISE NOTICE '  Matricule: %', v_contrat.matricule_tca;
    RAISE NOTICE '  Type: Contrat %', v_contrat.type;
    RAISE NOTICE '  Date expiration: %', v_contrat.date_fin;
    RAISE NOTICE '  Statut: ACTIF (à traiter)';
    RAISE NOTICE '';
    RAISE NOTICE '→ Rafraîchissez l''application (F5)';
    RAISE NOTICE '→ Allez dans: Incidents > Contrats Expirés';
    RAISE NOTICE '→ Cherchez "wajdi" ou "15901"';
    RAISE NOTICE '→ L''incident apparaîtra dans la liste';
  END IF;
  RAISE NOTICE '';
END $$;

-- ========================================
-- 4. VÉRIFICATION FINALE
-- ========================================
SELECT
  '═══════════════════════════════════' as separator,
  '    INCIDENT CRÉÉ' as titre;

SELECT
  i.id,
  i.type as "Type",
  i.titre as "Titre",
  i.date_expiration_originale as "Date Expiration",
  i.date_creation_incident as "Date Création",
  CURRENT_DATE - i.date_expiration_originale as "Jours depuis expiration",
  i.statut as "Statut",
  i.created_at as "Créé le",
  i.metadata->>'matricule' as "Matricule"
FROM incident i
JOIN contrat c ON c.profil_id = i.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
  AND i.type = 'contrat_expire'
ORDER BY i.created_at DESC
LIMIT 1;

-- ========================================
-- 5. ACTIVER LA GÉNÉRATION AUTOMATIQUE
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  GÉNÉRATION AUTOMATIQUE POUR LE FUTUR                     ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Pour que les incidents soient créés automatiquement à l''avenir:';
  RAISE NOTICE '';
  RAISE NOTICE '1. La fonction generate_daily_expired_incidents() doit exister';
  RAISE NOTICE '2. Un cron job doit l''appeler tous les jours à minuit';
  RAISE NOTICE '';
  RAISE NOTICE 'Si ce n''est pas configuré, consultez:';
  RAISE NOTICE '  → INSTALLATION-COMPLETE-SYSTEME.sql';
  RAISE NOTICE '';
END $$;
