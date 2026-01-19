/*
  # Ajouter la permission pour l'onglet Emails CRM

  1. Nouvelle permission
    - `rh/emails` : Accès à l'onglet Emails pour envoyer des emails groupés

  2. Attribution
    - La permission sera attribuée automatiquement aux utilisateurs ayant déjà accès aux salariés
*/

-- Attribuer la permission rh/emails aux utilisateurs qui ont déjà accès à rh/salaries
-- (car si on peut gérer les salariés, on devrait pouvoir leur envoyer des emails)
INSERT INTO public.utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT DISTINCT utilisateur_id, 'rh/emails', true
FROM public.utilisateur_permissions
WHERE section_id IN ('rh/salaries', 'admin/utilisateurs')
  AND actif = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.utilisateur_permissions up2
    WHERE up2.utilisateur_id = utilisateur_permissions.utilisateur_id
      AND up2.section_id = 'rh/emails'
  );

-- Vérifier le résultat
SELECT
  au.prenom,
  au.nom,
  au.email,
  'rh/emails' as permission_ajoutee
FROM public.utilisateur_permissions up
JOIN public.app_utilisateur au ON up.utilisateur_id = au.id
WHERE up.section_id = 'rh/emails'
  AND up.actif = true;
