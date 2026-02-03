/*
  # Activer la permission SMS pour les utilisateurs

  1. Ajoute la permission rh/sms à tous les utilisateurs qui ont déjà rh/emails
  2. Permet aux utilisateurs d'accéder au module SMS
*/

-- Ajouter la permission rh/sms à tous les utilisateurs qui ont déjà rh/emails
INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT DISTINCT utilisateur_id, 'rh/sms', true
FROM utilisateur_permissions
WHERE section_id = 'rh/emails'
  AND actif = true
  AND NOT EXISTS (
    SELECT 1 FROM utilisateur_permissions up2
    WHERE up2.utilisateur_id = utilisateur_permissions.utilisateur_id
    AND up2.section_id = 'rh/sms'
  );

-- OU pour un utilisateur spécifique, remplacez 'ID-UTILISATEUR' par l'ID de l'utilisateur
-- INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
-- VALUES ('ID-UTILISATEUR', 'rh/sms', true);
