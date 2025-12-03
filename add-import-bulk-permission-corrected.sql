/*
  # Add Import Bulk Permission to Administrators

  ## Summary
  This script activates the "Import en Masse" functionality for all administrators
  by adding the `admin/import-bulk` permission.

  ## Logic
  1. Identifies all users who have the `admin/utilisateurs` permission
  2. Adds the `admin/import-bulk` permission to these users
  3. Uses INSERT ... ON CONFLICT to avoid duplicates

  ## Target Users
  - Users with permission: `admin/utilisateurs`
  - This permission indicates they have administrative rights

  ## Important Notes
  - The table `app_utilisateur` does NOT have a `role` column
  - Administrator status is determined by permissions, not roles
  - The system uses `utilisateur_permissions` table to manage access
  - This script is idempotent (can be run multiple times safely)
*/

-- Insert the admin/import-bulk permission for all users who have admin/utilisateurs permission
INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif, created_at)
SELECT
  up.utilisateur_id,
  'admin/import-bulk' AS section_id,
  true AS actif,
  NOW() AS created_at
FROM utilisateur_permissions up
WHERE up.section_id = 'admin/utilisateurs'
  AND up.actif = true
ON CONFLICT (utilisateur_id, section_id)
DO UPDATE SET
  actif = true,
  created_at = NOW();

-- Verify the results
SELECT
  au.id,
  au.email,
  au.nom,
  au.prenom,
  COUNT(up.section_id) FILTER (WHERE up.section_id = 'admin/import-bulk') as has_import_bulk,
  COUNT(up.section_id) FILTER (WHERE up.section_id = 'admin/utilisateurs') as has_admin_users
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON au.id = up.utilisateur_id AND up.actif = true
WHERE au.actif = true
GROUP BY au.id, au.email, au.nom, au.prenom
HAVING COUNT(up.section_id) FILTER (WHERE up.section_id = 'admin/utilisateurs') > 0
ORDER BY au.email;
