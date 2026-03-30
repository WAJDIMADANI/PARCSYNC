/*
  # Nettoyage des notifications A&R invalides

  Ce script supprime les notifications A&R qui ne correspondent pas aux critères:
  1. Référence invalide (compta_ar_events n'existe plus)
  2. Type incorrect (pas une absence)
  3. Date incorrecte (end_date != CURRENT_DATE)

  ATTENTION: Ce script supprime des données. Vérifier d'abord avec le diagnostic.
*/

-- 1. Afficher d'abord les notifications qui vont être supprimées
SELECT
  '=== NOTIFICATIONS QUI VONT ÊTRE SUPPRIMÉES ===' as section;

SELECT
  i.id,
  i.titre,
  i.description,
  i.reference_id,
  i.created_at,
  ar.end_date,
  CASE
    WHEN ar.id IS NULL THEN 'Référence invalide'
    WHEN ar.ar_type != 'ABSENCE' THEN 'Pas une absence (type: ' || ar.ar_type || ')'
    WHEN ar.end_date != CURRENT_DATE THEN 'Date incorrecte (end_date: ' || ar.end_date::text || ', aujourd''hui: ' || CURRENT_DATE::text || ')'
    ELSE 'OK (ne devrait pas être listé)'
  END as raison_suppression
FROM inbox i
LEFT JOIN compta_ar_events ar ON i.reference_id = ar.id::text
WHERE i.type = 'ar_fin_absence'
  AND (
    ar.id IS NULL  -- référence invalide
    OR ar.ar_type != 'ABSENCE'  -- pas une absence
    OR ar.end_date != CURRENT_DATE  -- date incorrecte
  );

-- 2. Compter les notifications à supprimer
SELECT
  '=== COMPTEURS ===' as section;

SELECT
  COUNT(*) as notifications_a_supprimer,
  SUM(CASE WHEN ar.id IS NULL THEN 1 ELSE 0 END) as references_invalides,
  SUM(CASE WHEN ar.id IS NOT NULL AND ar.ar_type != 'ABSENCE' THEN 1 ELSE 0 END) as mauvais_type,
  SUM(CASE WHEN ar.id IS NOT NULL AND ar.end_date != CURRENT_DATE THEN 1 ELSE 0 END) as mauvaises_dates
FROM inbox i
LEFT JOIN compta_ar_events ar ON i.reference_id = ar.id::text
WHERE i.type = 'ar_fin_absence'
  AND (
    ar.id IS NULL
    OR ar.ar_type != 'ABSENCE'
    OR ar.end_date != CURRENT_DATE
  );

-- 3. SUPPRESSION EFFECTIVE (décommenter après vérification)
-- ATTENTION: Cette commande supprime définitivement les notifications invalides

/*
DELETE FROM inbox
WHERE type = 'ar_fin_absence'
  AND (
    -- Référence invalide
    NOT EXISTS (
      SELECT 1 FROM compta_ar_events
      WHERE id::text = inbox.reference_id
    )
    -- Ou mauvais type
    OR EXISTS (
      SELECT 1 FROM compta_ar_events ar
      WHERE ar.id::text = inbox.reference_id
        AND ar.ar_type != 'ABSENCE'
    )
    -- Ou mauvaise date
    OR EXISTS (
      SELECT 1 FROM compta_ar_events ar
      WHERE ar.id::text = inbox.reference_id
        AND ar.end_date != CURRENT_DATE
    )
  );
*/

-- 4. Après suppression, vérifier ce qui reste
SELECT
  '=== NOTIFICATIONS A&R RESTANTES (VALIDES) ===' as section;

SELECT
  i.id,
  i.titre,
  i.description,
  ar.start_date,
  ar.end_date,
  p.matricule_tca,
  p.nom,
  p.prenom,
  '✅ VALIDE' as statut
FROM inbox i
JOIN compta_ar_events ar ON i.reference_id = ar.id::text
JOIN profil p ON ar.profil_id = p.id
WHERE i.type = 'ar_fin_absence'
  AND ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE;

-- INSTRUCTIONS D'UTILISATION:
-- 1. Exécuter le script complet pour voir les notifications invalides
-- 2. Vérifier la liste et les compteurs
-- 3. Si OK, décommenter la section DELETE (ligne 53-71)
-- 4. Réexécuter pour effectuer le nettoyage
-- 5. Vérifier les notifications restantes (section 4)
