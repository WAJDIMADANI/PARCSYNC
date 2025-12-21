-- ============================================
-- CORRECTIONS POUR CONTRATS CDI
-- ============================================
-- Exécutez ce script APRÈS avoir identifié le problème
-- avec le script de diagnostic

-- CORRECTION 1: Normaliser les types de contrats mal orthographiés
-- Remplace tous les variants de "CDI" par "CDI" exactement
UPDATE modeles_contrats
SET type_contrat = 'CDI'
WHERE UPPER(TRIM(type_contrat)) = 'CDI'
  AND type_contrat != 'CDI';

-- Vérifier le résultat
SELECT
  'Modèles CDI après normalisation:' as info,
  COUNT(*) as nombre
FROM modeles_contrats
WHERE type_contrat = 'CDI';

-- CORRECTION 2: S'assurer que les politiques RLS permettent la lecture
-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Admins et RH peuvent voir tous les contrats" ON contrat;

-- Créer une politique RLS permissive pour les admins et RH
CREATE POLICY "Admins et RH peuvent voir tous les contrats"
ON contrat
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_utilisateur au
    WHERE au.user_id = auth.uid()
    AND (
      au.role = 'super_admin'
      OR au.role = 'admin'
      OR EXISTS (
        SELECT 1 FROM app_utilisateur_permissions aup
        WHERE aup.utilisateur_id = au.id
        AND aup.permission_id IN (
          SELECT id FROM app_permissions
          WHERE nom IN ('gerer_contrats', 'voir_contrats', 'gerer_rh')
        )
      )
    )
  )
);

-- CORRECTION 3: Ajouter une policy pour voir ses propres contrats
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs propres contrats" ON contrat;

CREATE POLICY "Utilisateurs peuvent voir leurs propres contrats"
ON contrat
FOR SELECT
TO authenticated
USING (
  profil_id IN (
    SELECT id FROM profil
    WHERE user_id = auth.uid()
  )
);

-- CORRECTION 4: Vérifier que tous les contrats CDI ont un profil_id valide
SELECT
  '=== CONTRATS CDI SANS PROFIL VALIDE ===' as probleme,
  c.id as contrat_id,
  c.profil_id,
  c.statut,
  m.nom as modele
FROM contrat c
JOIN modeles_contrats m ON c.modele_id = m.id
LEFT JOIN profil p ON c.profil_id = p.id
WHERE m.type_contrat = 'CDI'
  AND p.id IS NULL;

-- CORRECTION 5: Vérifier que les statuts sont valides
SELECT
  '=== STATUTS DES CONTRATS CDI ===' as info,
  c.statut,
  COUNT(*) as nombre
FROM contrat c
JOIN modeles_contrats m ON c.modele_id = m.id
WHERE m.type_contrat = 'CDI'
GROUP BY c.statut
ORDER BY COUNT(*) DESC;

-- CORRECTION 6: Mettre à jour les statuts invalides vers 'actif' pour les CDI signés
UPDATE contrat
SET statut = 'actif'
WHERE id IN (
  SELECT c.id
  FROM contrat c
  JOIN modeles_contrats m ON c.modele_id = m.id
  WHERE m.type_contrat = 'CDI'
    AND c.statut = 'signe'
    AND c.date_signature IS NOT NULL
);

-- CORRECTION 7: Résumé final
SELECT
  '=== RÉSUMÉ FINAL ===' as section,
  'Nombre de modèles CDI:' as description,
  COUNT(*)::text as valeur
FROM modeles_contrats
WHERE type_contrat = 'CDI'
UNION ALL
SELECT
  NULL,
  'Nombre de contrats CDI:',
  COUNT(*)::text
FROM contrat c
JOIN modeles_contrats m ON c.modele_id = m.id
WHERE m.type_contrat = 'CDI'
UNION ALL
SELECT
  NULL,
  'Contrats CDI signés:',
  COUNT(*)::text
FROM contrat c
JOIN modeles_contrats m ON c.modele_id = m.id
WHERE m.type_contrat = 'CDI'
  AND c.statut IN ('signe', 'actif')
UNION ALL
SELECT
  NULL,
  'Contrats CDI avec profil valide:',
  COUNT(*)::text
FROM contrat c
JOIN modeles_contrats m ON c.modele_id = m.id
JOIN profil p ON c.profil_id = p.id
WHERE m.type_contrat = 'CDI';
