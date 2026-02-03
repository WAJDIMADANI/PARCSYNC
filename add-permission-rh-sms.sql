/*
  # Ajouter la permission rh/sms

  Ajoute la permission pour accéder au module SMS
*/

-- Ajouter la permission rh/sms à tous les utilisateurs qui ont déjà la permission rh/emails
INSERT INTO permission_utilisateur (utilisateur_id, permission)
SELECT DISTINCT utilisateur_id, 'rh/sms'
FROM permission_utilisateur
WHERE permission = 'rh/emails'
  AND NOT EXISTS (
    SELECT 1 FROM permission_utilisateur pu2
    WHERE pu2.utilisateur_id = permission_utilisateur.utilisateur_id
    AND pu2.permission = 'rh/sms'
  );
