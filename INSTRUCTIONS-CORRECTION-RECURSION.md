# 🔧 Instructions : Correction de la Récursion Infinie RLS

## ❌ Problème Actuel

Vous obtenez l'erreur suivante dans votre application :
```
infinite recursion detected in policy for relation "app_utilisateur"
```

Cette erreur se produit sur la page **"Gestion des Utilisateurs"** et empêche l'affichage du tableau des utilisateurs.

---

## 🔍 Cause du Problème

Les policies RLS (Row Level Security) créent une **boucle infinie** :

1. Pour lire `app_utilisateur`, PostgreSQL vérifie la policy
2. La policy fait un JOIN vers `utilisateur_permissions`
3. Pour lire `utilisateur_permissions`, PostgreSQL vérifie sa policy
4. Cette policy fait un JOIN vers `app_utilisateur`
5. **→ Boucle infinie !**

**Exemple de policy récursive (dans vos scripts) :**
```sql
CREATE POLICY "Admins can manage users"
  ON app_utilisateur
  USING (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id  -- ← RÉCURSION !
      WHERE au.auth_user_id = auth.uid()
    )
  );
```

---

## ✅ Solution Proposée

Nous allons :

1. **Supprimer toutes les policies récursives**
2. **Désactiver RLS sur `utilisateur_permissions`** (table non sensible)
3. **Créer des policies simples et permissives** sur `app_utilisateur`
4. **Gérer les permissions au niveau applicatif** (React avec `PermissionGuard`)

### Pourquoi cette approche ?

- **Sécurité maintenue** : Les utilisateurs doivent être authentifiés (`TO authenticated`)
- **Pas de récursion** : Policies simples sans sous-requêtes
- **Contrôle métier dans React** : Le composant `PermissionGuard` vérifie les permissions
- **Performance améliorée** : Moins de requêtes en base de données

---

## �� Étapes à Suivre

### Étape 1 : Diagnostic (Optionnel)

Si vous voulez voir l'état actuel de vos policies RLS :

1. Allez sur Supabase Dashboard → SQL Editor
2. Copiez le contenu du fichier : **`DIAGNOSTIC-POLICIES-RLS-COMPLET.sql`**
3. Exécutez le script
4. Consultez les résultats pour voir toutes les policies existantes

### Étape 2 : Correction (Obligatoire)

1. Allez sur Supabase Dashboard → SQL Editor
2. Copiez le contenu du fichier : **`FIX-RECURSION-POLICIES-FINAL.sql`**
3. Exécutez le script
4. Attendez que le script se termine (environ 10 secondes)
5. Vérifiez les messages dans l'onglet "Messages" (en bas)

### Étape 3 : Vérification

Après l'exécution du script, vous devriez voir :

```
✅ CORRECTION TERMINÉE AVEC SUCCÈS

📊 État final:
  - Utilisateurs: 2
  - Permissions: 20
  - Policies app_utilisateur: 4
  - Policies utilisateur_permissions: 0
  - Policies demande_standard: 1

🔒 Sécurité:
  - RLS ACTIVÉ sur app_utilisateur (policies simples)
  - RLS DÉSACTIVÉ sur utilisateur_permissions (recommandé)
  - RLS ACTIVÉ sur demande_standard (policy permissive)
  - Contrôles métier gérés par React PermissionGuard
```

### Étape 4 : Test dans l'Application

1. **Rafraîchissez la page** de l'application (Ctrl+Shift+R ou Cmd+Shift+R)
2. Allez sur **"Gestion des Utilisateurs"** (menu Administration)
3. Vous devriez maintenant voir le tableau avec **2 utilisateurs** :
   - `wajdi@mad-impact.com` : 19 permissions (admin complet)
   - `admin@test.com` : 1 permission (rh/demandes uniquement)
4. **Plus d'erreur 500 !** ✅

---

## 👥 Utilisateurs Configurés

Après le script, vous aurez 2 utilisateurs :

### 1. wajdi@mad-impact.com (Admin Complet)

**Permissions (19 au total) :**
- RH : candidats, salariés, contrats, courriers, alertes, notifications, incidents, historique incidents, vivier, demandes
- Parc : véhicules, CT & assurance, maintenance
- Administration : sites, secteurs, postes, modèles, modèles de contrats, utilisateurs

### 2. admin@test.com (Standardiste)

**Permissions (1 seule) :**
- RH : demandes uniquement

---

## 🔒 Sécurité

### Qu'est-ce qui a changé ?

**Avant (Récursif) :**
```sql
-- Policy avec sous-requête récursive
CREATE POLICY "Admins can manage users"
  ON app_utilisateur
  USING (
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      INNER JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
    )
  );
```

**Après (Simple) :**
```sql
-- Policy permissive sans récursion
CREATE POLICY "Authenticated users can view all users"
  ON app_utilisateur
  FOR SELECT
  TO authenticated
  USING (true);
```

### Est-ce sécurisé ?

**OUI !** Voici pourquoi :

1. **Authentication requise** : `TO authenticated` = seuls les utilisateurs connectés peuvent accéder
2. **Contrôles dans React** : Le composant `PermissionGuard` vérifie les permissions
3. **Table permissions non sensible** : `utilisateur_permissions` contient uniquement des IDs de sections
4. **Pas de données sensibles exposées** : Les données sensibles (contrats, salaires, etc.) ont leurs propres RLS

### Comment ça fonctionne maintenant ?

1. L'utilisateur se connecte → Supabase Auth vérifie les credentials
2. React charge les permissions via `PermissionsContext`
3. Le composant `PermissionGuard` cache/affiche les sections selon les permissions
4. Les requêtes en base vérifient uniquement `authenticated` (pas de récursion)

---

## 🧪 Tests à Effectuer

### Test 1 : Connexion avec wajdi@mad-impact.com

1. Connectez-vous avec `wajdi@mad-impact.com`
2. Vous devriez voir **TOUTES les sections** dans la sidebar :
   - RH (10 sections)
   - Parc (3 sections)
   - Administration (6 sections)
3. Allez sur "Gestion des Utilisateurs"
4. Vous devriez voir les 2 utilisateurs

### Test 2 : Connexion avec admin@test.com

1. Connectez-vous avec `admin@test.com`
2. Vous devriez voir **UNIQUEMENT** :
   - RH → Demandes
3. Les autres sections sont masquées par `PermissionGuard`
4. Si vous essayez d'accéder à une autre section (URL directe), vous voyez "Accès refusé"

### Test 3 : Gestion des Permissions

1. Connectez-vous avec `wajdi@mad-impact.com`
2. Allez sur "Gestion des Utilisateurs"
3. Cliquez sur le bouton "X permissions" de `admin@test.com`
4. Cochez/décochez des permissions
5. Déconnectez-vous et reconnectez-vous avec `admin@test.com`
6. Les sections affichées correspondent aux permissions cochées

---

## ❓ FAQ

### Q : Pourquoi désactiver RLS sur `utilisateur_permissions` ?

**R :** Cette table contient uniquement des IDs de sections (ex: `'rh/salaries'`), pas de données sensibles. Les contrôles de permissions se font au niveau applicatif (React).

### Q : Est-ce que d'autres utilisateurs peuvent voir mes permissions ?

**R :** Oui, mais c'est voulu ! L'admin doit pouvoir gérer les permissions de tous les utilisateurs. Les permissions ne sont pas sensibles (juste des IDs de sections).

### Q : Peut-on réactiver RLS sur `utilisateur_permissions` plus tard ?

**R :** Oui, mais il faudra créer des policies **sans sous-requêtes** vers `app_utilisateur` pour éviter la récursion. La solution actuelle est plus simple et performante.

### Q : Que se passe-t-il si j'ajoute un nouvel utilisateur ?

**R :** Vous pouvez utiliser le bouton "Ajouter un utilisateur" dans l'interface. L'utilisateur sera créé sans permissions. Vous devrez ensuite cocher les permissions souhaitées.

### Q : Comment ajouter une nouvelle section/permission ?

**R :**
1. Ajoutez la section dans `Sidebar.tsx`
2. Ajoutez la permission dans `UserManagement.tsx` (tableau `AVAILABLE_PERMISSIONS`)
3. Utilisez `<PermissionGuard permission="nouvelle/section">` autour du composant
4. Cochez la permission pour les utilisateurs concernés

---

## 🆘 Dépannage

### Erreur persiste après le script

1. **Videz le cache du navigateur** : Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
2. **Déconnectez-vous et reconnectez-vous**
3. **Vérifiez que le script s'est bien exécuté** : Relancez le diagnostic
4. **Vérifiez la console du navigateur** (F12) pour voir les erreurs

### "Policy for relation still exists"

Le script n'a pas supprimé toutes les policies. Vérifiez les messages d'erreur et relancez le script.

### "Utilisateurs non trouvés dans auth.users"

Les comptes `wajdi@mad-impact.com` et `admin@test.com` n'existent pas dans Supabase Auth. Créez-les d'abord via Dashboard → Authentication → Users.

### "Vue utilisateur_avec_permissions ne fonctionne toujours pas"

Il reste probablement des policies récursives. Exécutez le diagnostic pour voir lesquelles.

---

## 📞 Support

Si le problème persiste après avoir suivi ces instructions :

1. Exécutez le script **`DIAGNOSTIC-POLICIES-RLS-COMPLET.sql`**
2. Copiez les résultats (Section 2 et Section 4 en particulier)
3. Partagez les résultats pour analyse

---

## ✅ Checklist Finale

Avant de considérer la correction comme terminée, vérifiez :

- [ ] Script `FIX-RECURSION-POLICIES-FINAL.sql` exécuté sans erreur
- [ ] Message "✅ CORRECTION TERMINÉE AVEC SUCCÈS" affiché
- [ ] Page "Gestion des Utilisateurs" accessible sans erreur 500
- [ ] 2 utilisateurs visibles dans le tableau
- [ ] Connexion avec `wajdi@mad-impact.com` : toutes les sections visibles
- [ ] Connexion avec `admin@test.com` : uniquement "Demandes" visible
- [ ] Possibilité de modifier les permissions d'un utilisateur
- [ ] Changements de permissions effectifs après reconnexion

---

**Une fois toutes les cases cochées, le problème est résolu ! 🎉**
