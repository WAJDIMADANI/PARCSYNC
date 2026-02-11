# 🚨 CORRIGER L'ERREUR D'UPLOAD - À FAIRE MAINTENANT

## ❌ Le problème

Quand un employé essaie d'uploader un document via le lien avec token, il reçoit :
```
Erreur lors du téléchargement
❌ Erreur insertion DB: new row violates row-level security policy for table "document"
```

## ✅ La solution (2 minutes)

### Étape 1 : Exécuter le SQL

1. **Ouvrez Supabase Dashboard** → https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr
2. **SQL Editor** (dans le menu de gauche)
3. **New query**
4. **Copiez-collez** le contenu du fichier `FIX-UPLOAD-ANONYME-AVEC-TOKEN.sql`
5. **Cliquez sur "Run"** (ou Ctrl+Enter)

### Étape 2 : Vérifier

Vous devriez voir ces messages de succès :
```
✅ Storage policies created
✅ Document table policies created
✅ L'upload anonyme avec token est maintenant autorisé !
```

### Étape 3 : Tester

1. **Envoyez un nouveau rappel** depuis votre application (sur un profil avec documents manquants)
2. **Ouvrez le lien** reçu par email
3. **Essayez d'uploader un document**
4. ✅ **Ça devrait fonctionner !**

## 🔍 Explication technique

Le problème était que :
- Les employés utilisent un **token anonyme** (pas d'authentification)
- Les **policies RLS** (Row Level Security) bloquaient les insertions anonymes
- La solution autorise les utilisateurs `anon` à uploader et insérer des documents

## ⚠️ Note de sécurité

Cette solution est sécurisée car :
- Le token a une **durée de vie limitée** (7 jours)
- Le token est **unique** et lié à un profil spécifique
- L'upload est **validé côté serveur** (types de fichiers, taille max, etc.)

## 📝 Après la correction

Une fois le SQL exécuté, **tous les futurs uploads fonctionneront automatiquement** !

Aucun redéploiement n'est nécessaire - c'est juste un problème de permissions au niveau de la base de données.
