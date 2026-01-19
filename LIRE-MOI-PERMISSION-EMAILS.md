# Guide d'activation de l'onglet Emails CRM

## Pourquoi l'onglet n'apparaît pas ?

L'onglet "Emails" dans le menu RH est contrôlé par une permission. Si vous ne voyez pas l'onglet, c'est que :
1. La permission `rh/emails` n'existe pas dans la base de données
2. La permission n'est pas attribuée à votre utilisateur

## Étape 1 : Exécuter le script SQL

Allez dans votre dashboard Supabase :
1. Ouvrez l'éditeur SQL (SQL Editor)
2. Collez et exécutez le contenu du fichier `add-permission-rh-emails.sql`

Ce script va :
- Créer la permission `rh/emails`
- L'attribuer automatiquement aux utilisateurs ayant déjà accès à "Salariés" ou "Utilisateurs"

## Étape 2 : Rafraîchir l'application

Une fois le script exécuté :
1. Déconnectez-vous de l'application
2. Reconnectez-vous

L'onglet "Emails" devrait maintenant apparaître dans le menu RH.

## Gestion des permissions

### Vérifier qui a accès

```sql
SELECT
  au.prenom,
  au.nom,
  au.email,
  up.actif
FROM public.utilisateur_permissions up
JOIN public.app_utilisateur au ON up.utilisateur_id = au.id
WHERE up.section_id = 'rh/emails';
```

### Donner accès à un utilisateur spécifique

```sql
-- Remplacer 'email@exemple.com' par l'email de l'utilisateur
INSERT INTO public.utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT au.id, 'rh/emails', true
FROM public.app_utilisateur au
WHERE au.email = 'email@exemple.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.utilisateur_permissions up2
    WHERE up2.utilisateur_id = au.id AND up2.section_id = 'rh/emails'
  );
```

### Retirer l'accès à un utilisateur

```sql
-- Remplacer 'email@exemple.com' par l'email de l'utilisateur
-- Option 1: Désactiver la permission (recommandé)
UPDATE public.utilisateur_permissions
SET actif = false
WHERE utilisateur_id = (SELECT id FROM public.app_utilisateur WHERE email = 'email@exemple.com')
  AND section_id = 'rh/emails';

-- Option 2: Supprimer complètement la permission
DELETE FROM public.utilisateur_permissions
WHERE utilisateur_id = (SELECT id FROM public.app_utilisateur WHERE email = 'email@exemple.com')
  AND section_id = 'rh/emails';
```

## Gestion dans l'interface

Vous pouvez aussi gérer les permissions via l'interface :
1. Allez dans **Administration > Utilisateurs**
2. Cliquez sur un utilisateur
3. Cochez/décochez la permission "Emails CRM"
