# 🔧 Guide d'Activation - Import en Masse (Version Corrigée)

## ⚠️ Correction Importante

**Erreur identifiée** : La table `app_utilisateur` n'a PAS de colonne `role`.

**Solution** : Le système utilise les **permissions** pour déterminer les droits d'accès.

---

## 📋 Structure de la Base de Données

### Table `app_utilisateur`
```sql
CREATE TABLE app_utilisateur (
  id UUID PRIMARY KEY,
  auth_user_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Note** : Pas de colonne `role` !

### Table `utilisateur_permissions`
```sql
CREATE TABLE utilisateur_permissions (
  id UUID PRIMARY KEY,
  utilisateur_id UUID REFERENCES app_utilisateur(id),
  section_id TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  UNIQUE(utilisateur_id, section_id)
);
```

---

## 🎯 Logique de la Solution

### Comment identifier les administrateurs ?

Un utilisateur est considéré comme **administrateur** s'il possède la permission :
- `admin/utilisateurs`

### Que fait le script corrigé ?

1. **Recherche** tous les utilisateurs avec la permission `admin/utilisateurs`
2. **Ajoute** la permission `admin/import-bulk` à ces utilisateurs
3. **Évite les doublons** grâce à `ON CONFLICT`

---

## 🚀 Exécution du Script

### Étape 1 : Accéder à Supabase

1. Ouvrez votre tableau de bord Supabase
2. Allez dans **SQL Editor**

### Étape 2 : Exécuter le Script

Copiez et exécutez le contenu de :
```
add-import-bulk-permission-corrected.sql
```

### Étape 3 : Vérifier les Résultats

Le script affiche automatiquement un tableau de vérification :

```
| id   | email              | nom    | prenom | has_import_bulk | has_admin_users |
|------|-------------------|--------|--------|-----------------|-----------------|
| xxx  | admin@example.com | Dupont | Jean   | 1               | 1               |
```

**Colonnes** :
- `has_import_bulk = 1` → Permission activée ✅
- `has_admin_users = 1` → C'est un administrateur ✅

---

## ✅ Vérification

### Dans l'interface utilisateur

1. **Déconnectez-vous** et **reconnectez-vous**
2. Accédez à **Admin → Utilisateurs**
3. Vérifiez que le bouton **"Import en Masse"** est maintenant visible

### En SQL (vérification manuelle)

```sql
-- Voir tous les utilisateurs avec leurs permissions
SELECT
  au.email,
  au.nom,
  au.prenom,
  ARRAY_AGG(up.section_id) FILTER (WHERE up.actif = true) as permissions
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
WHERE au.actif = true
GROUP BY au.id, au.email, au.nom, au.prenom
ORDER BY au.email;
```

---

## 🔍 Différences avec l'Ancien Script

### ❌ Ancien Script (Incorrect)
```sql
-- Cherchait une colonne 'role' qui n'existe pas
WHERE u.role = 'admin'
```

### ✅ Nouveau Script (Correct)
```sql
-- Utilise les permissions existantes
WHERE up.section_id = 'admin/utilisateurs'
  AND up.actif = true
```

---

## 📝 Fichiers Concernés

- **Script SQL corrigé** : `add-import-bulk-permission-corrected.sql`
- **Ancien script** : `add-import-bulk-permission-to-admins.sql` (à ne plus utiliser)
- **Documentation** : Ce fichier

---

## 🆘 En Cas de Problème

### Erreur : "column u.role does not exist"

**Cause** : Vous avez utilisé l'ancien script

**Solution** : Utilisez le nouveau script `add-import-bulk-permission-corrected.sql`

### La permission n'apparaît pas

1. **Déconnectez-vous** de l'application
2. **Reconnectez-vous** pour rafraîchir les permissions
3. Vérifiez que votre utilisateur a bien `admin/utilisateurs`

### Aucun utilisateur trouvé

Exécutez cette requête pour voir tous les utilisateurs et leurs permissions :

```sql
SELECT
  au.email,
  au.actif,
  up.section_id,
  up.actif as permission_active
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
ORDER BY au.email, up.section_id;
```

---

## 🎉 Résultat Final

Une fois le script exécuté avec succès :

✅ Tous les administrateurs (utilisateurs avec `admin/utilisateurs`) ont maintenant accès à l'import en masse

✅ Le bouton "Import en Masse" apparaît dans Admin → Utilisateurs

✅ L'import de fichiers CSV/Excel fonctionne correctement

---

## 📚 Voir Aussi

- Documentation de l'import en masse : `LIRE-MOI-IMPORT-MASSE.md`
- Structure des permissions : `create-demandes-and-permissions-system.sql`
- Gestion des utilisateurs : `src/components/UserManagement.tsx`
