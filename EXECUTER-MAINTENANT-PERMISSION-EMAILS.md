# ⚡ À EXÉCUTER MAINTENANT - Permission Emails CRM

## 🎯 Objectif

Ajouter la permission "Emails CRM" à l'utilisateur **ajdi@mad-impact.com** pour qu'elle apparaisse dans la liste des permissions sous **Administration > Utilisateurs**.

## 📋 Étapes

### 1. Ouvrir Supabase SQL Editor

1. Allez sur votre dashboard Supabase
2. Cliquez sur **SQL Editor** dans le menu de gauche
3. Créez une nouvelle requête

### 2. Copier-coller ce script

```sql
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
```

### 3. Exécuter le script

Cliquez sur **Run** (ou Ctrl+Enter)

Vous devriez voir le résultat affichant tous les utilisateurs qui ont maintenant la permission "Emails CRM", dont **ajdi@mad-impact.com**.

### 4. Vérifier dans l'interface

1. Allez dans **Administration > Utilisateurs**
2. Cliquez sur l'utilisateur **ajdi@mad-impact.com**
3. Dans la liste des permissions RH, vous devriez maintenant voir :
   - ☑️ **Emails CRM** (cochée)

### 5. Voir l'onglet dans le menu

1. **Déconnectez-vous** de l'application
2. **Reconnectez-vous** avec ajdi@mad-impact.com

L'onglet **"Emails"** apparaîtra dans le menu RH, entre "Courriers" et "Alertes".

## ✅ Vérification rapide

Pour vérifier que la permission est bien attribuée :

```sql
SELECT
  au.prenom,
  au.nom,
  au.email,
  up.section_id,
  up.actif
FROM public.utilisateur_permissions up
JOIN public.app_utilisateur au ON up.utilisateur_id = au.id
WHERE au.email = 'ajdi@mad-impact.com'
ORDER BY up.section_id;
```

Vous devriez voir `rh/emails` dans la liste avec `actif = true`.

## 🔧 Gérer la permission

Après l'exécution du script, vous pouvez gérer cette permission comme toutes les autres via **Administration > Utilisateurs** :

- **Cocher** = Activer l'accès à l'onglet Emails
- **Décocher** = Désactiver l'accès à l'onglet Emails

C'est automatique, pas besoin de script SQL !
