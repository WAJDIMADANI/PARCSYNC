/*
  # Diagnostic : Pourquoi get_cdd_expires() ne retourne pas les 2 CDD ?
*/

-- 1. Vérifier la définition de la fonction
SELECT '=== Définition de get_cdd_expires() ===' as test;
SELECT pg_get_functiondef('get_cdd_expires'::regproc);

-- 2. Appeler la fonction et voir ce qu'elle retourne
SELECT '=== Résultat de get_cdd_expires() ===' as test;
SELECT * FROM get_cdd_expires();

-- 3. Vérifier manuellement les CDD qui devraient être retournés
SELECT '=== CDD manuels (devrait inclure BUSIN et ATIK) ===' as test;
SELECT
  p.prenom,
  p.nom,
  p.email,
  c.type,
  c.statut,
  c.date_fin,
  (c.date_fin - CURRENT_DATE) as jours_avant_expiration
FROM profil p
INNER JOIN contrat c ON c.profil_id = p.id
WHERE c.type = 'CDD'
  AND c.date_fin IS NOT NULL
  AND c.statut IN ('signe', 'en_attente_signature', 'envoye', 'actif')
ORDER BY c.date_fin;
