/*
  # ACTIVATION RAPIDE - Module Comptabilité

  Ce script ajoute toutes les permissions comptabilité aux utilisateurs qui ont la permission "admin"

  Exécutez ce script dans l'éditeur SQL de Supabase.
*/

-- Option 1 : Ajouter la permission globale "comptabilite" à tous les admins
INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT DISTINCT
  up.utilisateur_id,
  'comptabilite' as section_id,
  true as actif
FROM utilisateur_permissions up
WHERE up.section_id = 'admin'
  AND up.actif = true
  AND NOT EXISTS (
    SELECT 1 FROM utilisateur_permissions up2
    WHERE up2.utilisateur_id = up.utilisateur_id
      AND up2.section_id = 'comptabilite'
  );

-- Option 2 : Ajouter toutes les permissions compta/* individuelles (au cas où)
INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT DISTINCT
  up.utilisateur_id,
  perm.section_id,
  true as actif
FROM utilisateur_permissions up
CROSS JOIN (
  SELECT unnest(ARRAY[
    'compta/entrees',
    'compta/sorties',
    'compta/rib',
    'compta/adresse',
    'compta/avenants',
    'compta/mutuelle',
    'compta/ar',
    'compta/avance-frais'
  ]) as section_id
) perm
WHERE up.section_id = 'admin'
  AND up.actif = true
  AND NOT EXISTS (
    SELECT 1 FROM utilisateur_permissions up2
    WHERE up2.utilisateur_id = up.utilisateur_id
      AND up2.section_id = perm.section_id
  );

-- Vérifier le résultat
SELECT
  au.email,
  au.nom,
  au.prenom,
  COUNT(*) FILTER (WHERE up.section_id LIKE 'compta%') as nb_permissions_compta
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON up.utilisateur_id = au.id AND up.actif = true
WHERE au.actif = true
GROUP BY au.id, au.email, au.nom, au.prenom
ORDER BY au.email;

-- Détail des permissions comptabilité par utilisateur
SELECT
  au.email,
  au.nom,
  au.prenom,
  up.section_id,
  up.actif
FROM utilisateur_permissions up
JOIN app_utilisateur au ON up.utilisateur_id = au.id
WHERE up.section_id LIKE 'compta%'
  AND au.actif = true
ORDER BY au.email, up.section_id;
