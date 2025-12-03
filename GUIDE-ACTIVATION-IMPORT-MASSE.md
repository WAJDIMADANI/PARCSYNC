# Guide d'activation de l'Import en Masse pour les administrateurs

## 📋 Résumé

Ce guide vous explique comment activer la fonctionnalité **"Import en Masse"** pour tous les administrateurs de l'application.

## ✅ Ce qui sera fait

- Ajout automatique de la permission `admin/import-bulk` pour tous les utilisateurs avec le rôle `admin`
- Le menu "Import en Masse" apparaîtra dans la section Administration de la sidebar

## 🚀 Instructions d'installation

### Étape 1: Accéder à Supabase SQL Editor

1. Connectez-vous à votre tableau de bord Supabase
2. Ouvrez votre projet
3. Dans le menu latéral, cliquez sur **"SQL Editor"**

### Étape 2: Exécuter le script SQL

1. Ouvrez le fichier `add-import-bulk-permission-to-admins.sql`
2. Copiez **tout** le contenu du fichier
3. Dans Supabase SQL Editor, collez le contenu
4. Cliquez sur le bouton **"Run"** (ou appuyez sur Ctrl+Entrée)

### Étape 3: Vérifier les résultats

Le script affichera dans la console :

- ✅ La liste des administrateurs trouvés
- ✅ Le nombre de permissions ajoutées
- ✅ Un tableau de vérification montrant qui a la permission

Exemple de sortie attendue :
```
========================================
LISTE DES ADMINISTRATEURS
========================================
wajdi@mad-impact.com | Wajdi | ...

========================================
AJOUT DE LA PERMISSION admin/import-bulk
========================================
✓ wajdi@mad-impact.com (Wajdi ...) : Permission ajoutée

========================================
RÉSUMÉ
========================================
Administrateurs trouvés: 1
Permissions ajoutées: 1
```

### Étape 4: Rafraîchir l'application

1. Ouvrez votre application dans le navigateur
2. Videz le cache :
   - **Windows/Linux** : `Ctrl + Shift + R`
   - **Mac** : `Cmd + Shift + R`
3. Rafraîchissez la page

### Étape 5: Vérifier que le menu apparaît

1. Connectez-vous en tant qu'administrateur
2. Dans la sidebar, ouvrez la section **"Administration"**
3. Vous devriez maintenant voir le menu **"Import en Masse"** avec l'icône 📤

## 📁 Fichiers concernés

- **`add-import-bulk-permission-to-admins.sql`** : Script SQL à exécuter dans Supabase
- **`src/components/ImportSalariesBulk.tsx`** : Composant d'import en masse
- **`src/components/Sidebar.tsx`** : Définition du menu (ligne 151)

## 🔍 Comment ça fonctionne

1. Le script SQL recherche tous les utilisateurs dans la table `app_utilisateur` avec `role = 'admin'`
2. Pour chaque administrateur, il vérifie si la permission `admin/import-bulk` existe déjà
3. Si elle n'existe pas, il l'ajoute dans la table `utilisateur_permissions`
4. La sidebar utilise le contexte `PermissionsContext` pour vérifier les permissions
5. Si l'utilisateur a la permission `admin/import-bulk`, le menu "Import en Masse" s'affiche

## ⚙️ Détails techniques

### Permission ajoutée
```
section_id: 'admin/import-bulk'
actif: true
```

### Tables modifiées
- `utilisateur_permissions` : Ajout de nouvelles lignes

### Aucune modification de code
- Le menu existe déjà dans le code (ligne 151 de `Sidebar.tsx`)
- Le composant `ImportSalariesBulk.tsx` existe déjà
- Seule la permission en base de données est ajoutée

## 🎯 Utilisateurs concernés

**Tous les administrateurs** (`role = 'admin'`) recevront automatiquement cette permission, notamment :
- wajdi@mad-impact.com
- Et tout autre utilisateur avec le rôle `admin`

## ✨ Fonctionnalités du module Import en Masse

Une fois activé, les administrateurs pourront :

1. **Télécharger un modèle CSV** avec tous les champs nécessaires
2. **Importer plusieurs salariés** en une seule fois (CSV, XLSX, XLS)
3. **Prévisualiser les données** avant l'import
4. **Valider automatiquement** les données (emails en double, secteurs invalides, etc.)
5. **Sélectionner** les lignes à importer
6. **Voir un rapport détaillé** de l'import (succès, erreurs)

## ❓ Dépannage

### Le menu n'apparaît pas après l'exécution

1. Vérifiez que le script SQL s'est bien exécuté sans erreur
2. Videz complètement le cache du navigateur
3. Déconnectez-vous et reconnectez-vous
4. Vérifiez dans Supabase SQL Editor que la permission existe :
   ```sql
   SELECT u.email, up.section_id
   FROM app_utilisateur u
   JOIN utilisateur_permissions up ON u.id = up.utilisateur_id
   WHERE u.role = 'admin' AND up.section_id = 'admin/import-bulk';
   ```

### Erreur lors de l'exécution du script

- Assurez-vous d'être connecté au bon projet Supabase
- Vérifiez que les tables `app_utilisateur` et `utilisateur_permissions` existent
- Contactez le support si l'erreur persiste

## 📞 Support

Pour toute question ou problème :
1. Vérifiez que vous êtes bien connecté en tant qu'administrateur
2. Consultez les logs dans la console du navigateur (F12)
3. Vérifiez les permissions dans Supabase Dashboard

---

**✅ C'est tout !** Le menu "Import en Masse" devrait maintenant être accessible à tous les administrateurs.
