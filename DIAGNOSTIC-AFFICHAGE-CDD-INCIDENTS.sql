/*
  # Diagnostic : Pourquoi les CDD expirés ne s'affichent pas dans Gestion des incidents
*/

-- 1. Vérifier que la fonction get_cdd_expires() retourne des données
SELECT '=== Test 1 : Fonction get_cdd_expires() ===' as test;
SELECT * FROM get_cdd_expires();

-- 2. Vérifier les contrats CDD directement dans la table
SELECT '=== Test 2 : Contrats CDD dans la table ===' as test;
SELECT
  p.nom,
  p.prenom,
  p.matricule,
  c.type,
  c.statut,
  c.date_fin,
  (c.date_fin - CURRENT_DATE) as jours_restants
FROM profil p
INNER JOIN contrat c ON c.profil_id = p.id
WHERE c.type = 'CDD'
  AND c.date_fin IS NOT NULL
ORDER BY c.date_fin;

-- 3. Vérifier la vue incidents_ouverts_rh pour les CDD
SELECT '=== Test 3 : Vue incidents_ouverts_rh (CDD uniquement) ===' as test;
SELECT *
FROM incidents_ouverts_rh
WHERE type_incident = 'contrat_cdd_expire'
ORDER BY date_expiration;

-- 4. Vérifier s'il y a des incidents CDD créés
SELECT '=== Test 4 : Incidents CDD dans la table incident ===' as test;
SELECT
  i.id,
  i.type,
  i.statut,
  i.date_expiration,
  i.created_at,
  p.nom,
  p.prenom
FROM incident i
LEFT JOIN profil p ON p.id = i.profil_id
WHERE i.type = 'contrat_cdd_expire'
ORDER BY i.created_at DESC;

-- 5. Vérifier la définition actuelle de la vue
SELECT '=== Test 5 : Définition de la vue incidents_ouverts_rh ===' as test;
SELECT pg_get_viewdef('incidents_ouverts_rh', true);
