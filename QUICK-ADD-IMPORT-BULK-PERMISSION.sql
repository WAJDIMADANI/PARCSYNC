-- =====================================================
-- SCRIPT RAPIDE: Ajout permission Import en Masse
-- =====================================================
-- Ce script ajoute la permission 'admin/import-bulk'
-- à tous les administrateurs
--
-- À exécuter dans: Supabase Dashboard > SQL Editor
-- =====================================================

-- Insertion de la permission pour tous les admins
INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT
  u.id,
  'admin/import-bulk',
  true
FROM app_utilisateur u
WHERE u.role = 'admin'
  AND NOT EXISTS (
    SELECT 1
    FROM utilisateur_permissions up
    WHERE up.utilisateur_id = u.id
    AND up.section_id = 'admin/import-bulk'
  );

-- Vérification
SELECT
  u.email,
  u.nom,
  u.prenom,
  'Permission ajoutée ✓' as statut
FROM app_utilisateur u
JOIN utilisateur_permissions up ON u.id = up.utilisateur_id
WHERE u.role = 'admin'
  AND up.section_id = 'admin/import-bulk';
