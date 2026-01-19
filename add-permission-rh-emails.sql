/*
  # Ajouter la permission pour l'onglet Emails CRM

  1. Nouvelle permission
    - `rh/emails` : Accès à l'onglet Emails pour envoyer des emails groupés

  2. Attribution
    - La permission sera attribuée à ajdi@mad-impact.com
    - Et à tous les utilisateurs ayant déjà accès aux salariés
*/

-- Attribuer la permission rh/emails à ajdi@mad-impact.com
INSERT INTO public.utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT au.id, 'rh/emails', true
FROM public.app_utilisateur au
WHERE au.email = 'ajdi@mad-impact.com'
  AND NOT EXISTS (
    SELECT 1
    FROM public.utilisateur_permissions up2
    WHERE up2.utilisateur_id = au.id
      AND up2.section_id = 'rh/emails'
  );

-- Attribuer aussi à tous les autres utilisateurs qui ont déjà rh/salaries ou admin/utilisateurs
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
  'Emails CRM ajouté' as statut
FROM public.utilisateur_permissions up
JOIN public.app_utilisateur au ON up.utilisateur_id = au.id
WHERE up.section_id = 'rh/emails'
  AND up.actif = true
ORDER BY au.email;
