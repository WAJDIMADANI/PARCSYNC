# Guide d'installation - Système de Photos de Profil

## Ce qui a été créé

### 1. Nouveaux fichiers

#### `/src/hooks/useProfilePhoto.ts`
Hook React pour gérer l'upload et la suppression de photos de profil.

**Fonctionnalités :**
- Upload de photos vers Supabase Storage
- Validation du type de fichier (JPG, PNG, WebP uniquement)
- Validation de la taille (max 5MB)
- Mise à jour automatique de la table `profil`
- Suppression de photos
- Gestion des erreurs

#### `/src/components/ProfileAvatar.tsx`
Composant React pour afficher et gérer l'avatar de profil.

**Fonctionnalités :**
- Avatar circulaire GRAND (320px de diamètre sur desktop, 256px sur mobile)
- Gradient coloré (bleu → violet → rose) en arrière-plan
- Affichage de la photo ou des initiales bien visibles
- Drag-and-drop pour upload
- Clic pour sélectionner un fichier
- Bouton de suppression (visible au survol)
- Animations fluides
- Toast de notification (succès/erreur)
- Modal de confirmation avant suppression

#### `/setup-profile-photos-bucket.sql`
Script SQL pour configurer le bucket Storage et les permissions RLS.

### 2. Fichiers modifiés

#### `/src/components/EmployeeList.tsx`
- Ajout de l'import du composant `ProfileAvatar`
- Ajout de la propriété `photo_url` à l'interface `Employee`
- Intégration du composant dans le modal de détail salarié
- Gestion de l'état `currentPhotoUrl`

---

## Installation - Étape par étape

### ÉTAPE 1 : Exécuter le script SQL

**Action :** Exécuter le fichier `setup-profile-photos-bucket.sql` dans votre base de données Supabase.

Ce script va :
- ✅ Créer le bucket `profile-photos` (public)
- ✅ Configurer les limites (5MB max, formats image uniquement)
- ✅ Créer les politiques RLS (sécurité)
- ✅ Ajouter la colonne `photo_url` à la table `profil` (si elle n'existe pas)

**Comment faire :**
1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Aller dans "SQL Editor"
4. Coller le contenu du fichier `setup-profile-photos-bucket.sql`
5. Cliquer sur "Run"

### ÉTAPE 2 : Vérifier que le bucket est créé

1. Dans Supabase Dashboard, aller dans **Storage**
2. Vous devriez voir le bucket `profile-photos`
3. Vérifier que :
   - Le bucket est marqué comme **Public**
   - La taille max est **5 MB**
   - Les types autorisés sont : **image/jpeg, image/png, image/webp**

### ÉTAPE 3 : Tester l'upload

1. Lancer l'application : `npm run dev`
2. Se connecter
3. Aller dans **"Salariés"**
4. Cliquer sur un salarié pour ouvrir son profil
5. Vous devriez voir l'avatar en haut du modal
6. Essayer :
   - **Drag & drop** : Glisser une image sur l'avatar
   - **Clic** : Cliquer sur l'avatar pour sélectionner un fichier
   - **Suppression** : Survoler l'avatar avec la souris et cliquer sur la croix rouge

---

## Fonctionnement technique

### Structure des fichiers dans Storage

Les photos sont stockées dans le bucket `profile-photos` avec cette structure :
```
profile-photos/
  ├── {profil_id_1}/
  │   └── photo.jpg
  ├── {profil_id_2}/
  │   └── photo.png
  └── {profil_id_3}/
      └── photo.webp
```

Chaque salarié a son propre dossier identifié par son `profil_id`.

### Politiques RLS (sécurité)

Les politiques RLS configurées garantissent que :
- ✅ Les utilisateurs authentifiés peuvent **uploader** leur propre photo
- ✅ Les utilisateurs authentifiés peuvent **mettre à jour** leur propre photo
- ✅ Les utilisateurs authentifiés peuvent **supprimer** leur propre photo
- ✅ Tout le monde peut **voir** les photos (bucket public)

**Note :** Le système vérifie que l'utilisateur ne peut modifier que les photos des profils qui lui appartiennent (via `auth_user_id`).

### Base de données

La colonne `photo_url` dans la table `profil` stocke l'URL publique de la photo :
```sql
ALTER TABLE profil ADD COLUMN photo_url text;
```

Exemple de valeur :
```
https://[project-ref].supabase.co/storage/v1/object/public/profile-photos/abc-123-def/photo.jpg?t=1234567890
```

Le paramètre `?t=timestamp` évite les problèmes de cache.

---

## Personnalisation

### Changer les couleurs du gradient

Modifier dans `/src/components/ProfileAvatar.tsx` :

```tsx
// Ligne 166
<div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
```

Remplacer par d'autres couleurs Tailwind, par exemple :
- `from-green-500 via-teal-500 to-cyan-500` (vert → turquoise)
- `from-orange-500 via-red-500 to-pink-500` (orange → rouge)
- `from-indigo-500 via-purple-500 to-pink-500` (indigo → violet)

### Changer la taille de l'avatar

Modifier dans `/src/components/ProfileAvatar.tsx` :

```tsx
// Ligne 146 (taille actuelle)
w-64 h-64 md:w-80 md:h-80
```

Valeurs disponibles :
- `w-32 h-32 md:w-40 md:h-40` (128px/160px) - Petit
- `w-48 h-48 md:w-56 md:h-56` (192px/224px) - Moyen
- `w-64 h-64 md:w-80 md:h-80` (256px/320px) - Grand (actuel)
- `w-72 h-72 md:w-96 md:h-96` (288px/384px) - Très grand

**Note :** Pensez aussi à ajuster la taille des initiales (`text-8xl md:text-9xl` ligne 162)

### Changer la taille maximale des fichiers

Modifier dans `/src/hooks/useProfilePhoto.ts` :

```typescript
// Ligne 30
const maxSize = 5 * 1024 * 1024; // 5MB en bytes
```

ET dans `setup-profile-photos-bucket.sql` :

```sql
-- Ligne 20
file_size_limit = 5242880, -- 5MB en bytes
```

---

## Dépannage

### Erreur : "Format de fichier invalide"

**Cause :** Le fichier uploadé n'est pas au bon format.

**Solution :** Utiliser uniquement JPG, PNG ou WebP.

---

### Erreur : "Le fichier est trop volumineux"

**Cause :** Le fichier dépasse 5MB.

**Solution :**
1. Compresser l'image avec un outil en ligne (ex: TinyPNG)
2. Ou augmenter la limite (voir "Personnalisation" ci-dessus)

---

### Erreur : "Erreur lors de l'upload"

**Causes possibles :**
1. Le bucket `profile-photos` n'existe pas
2. Les politiques RLS ne sont pas configurées
3. L'utilisateur n'a pas les permissions

**Solution :**
1. Vérifier que le script SQL a été exécuté
2. Vérifier dans Storage > Policies que les 4 politiques existent
3. Vérifier que l'utilisateur est bien authentifié

---

### La photo ne s'affiche pas après upload

**Causes possibles :**
1. Le bucket n'est pas public
2. L'URL est incorrecte
3. Problème de cache

**Solution :**
1. Dans Storage, vérifier que le bucket est marqué "Public"
2. Vérifier l'URL dans la colonne `photo_url` de la table `profil`
3. Faire Ctrl+F5 pour vider le cache du navigateur

---

### Erreur : "Permission denied"

**Cause :** Les politiques RLS ne sont pas configurées correctement.

**Solution :**
1. Réexécuter le script `setup-profile-photos-bucket.sql`
2. Vérifier dans Storage > Policies que ces 4 politiques existent :
   - "Users can upload their own profile photo"
   - "Users can update their own profile photo"
   - "Users can delete their own profile photo"
   - "Public access to profile photos"

---

## Améliorations futures possibles

### 1. Crop/Resize automatique
Ajouter un éditeur d'image avant l'upload pour recadrer et redimensionner.

### 2. Miniatures
Générer des miniatures (thumbnails) pour optimiser les performances.

### 3. Détection de visage
Utiliser une API de détection de visage pour centrer automatiquement.

### 4. Historique de photos
Garder un historique des anciennes photos de profil.

### 5. Photos pour d'autres entités
Utiliser le même système pour les véhicules, sites, etc.

---

## Support

Si vous rencontrez un problème :
1. Vérifier les logs dans la console du navigateur (F12)
2. Vérifier les logs dans Supabase Dashboard > Logs
3. Vérifier que le bucket et les politiques existent
4. Vérifier que la colonne `photo_url` existe dans la table `profil`

---

**Système créé avec :**
- React 18
- TypeScript
- Tailwind CSS
- Supabase Storage
- Lucide React (icônes)

**Taille totale du code ajouté :** ~500 lignes
**Temps d'installation :** ~5 minutes
