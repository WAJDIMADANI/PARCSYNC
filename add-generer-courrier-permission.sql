/*
  # Ajouter la permission "Générer Courrier"

  1. Objectif
    - Ajouter la permission `admin/generer-courrier` à tous les utilisateurs qui ont déjà `admin/modeles`
    - Permet d'afficher le menu "Générer Courrier (V2)" dans le sidebar

  2. Actions
    - Insertion de la permission pour tous les utilisateurs avec `admin/modeles`
    - Évite les doublons avec ON CONFLICT DO NOTHING
*/

-- Ajouter la permission admin/generer-courrier pour tous les utilisateurs qui ont admin/modeles
INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT
  utilisateur_id,
  'admin/generer-courrier' as section_id,
  true as actif
FROM utilisateur_permissions
WHERE section_id = 'admin/modeles'
  AND actif = true
ON CONFLICT (utilisateur_id, section_id) DO NOTHING;

-- Vérifier les permissions ajoutées
SELECT
  u.nom,
  u.prenom,
  u.email,
  up.section_id,
  up.actif
FROM utilisateur_permissions up
JOIN app_utilisateur u ON u.id = up.utilisateur_id
WHERE up.section_id IN ('admin/modeles', 'admin/generer-courrier')
ORDER BY u.nom, up.section_id;
