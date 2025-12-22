# DIAGNOSTIC - Photo de profil ne s'affiche pas

## Symptômes

✅ La photo a été chargée (uploadée)
❌ La photo ne s'affiche pas dans l'avatar
✅ L'avatar est maintenant GRAND et ROND
❌ Seules les initiales s'affichent

## Causes possibles

1. **Bucket Storage pas public** (cause la plus probable)
2. **Policies RLS incorrectes**
3. **URL mal formée**
4. **Problème de CORS**

## Solution rapide - FAIRE MAINTENANT

### ÉTAPE 1 : Exécuter le script SQL de correction

Dans votre dashboard Supabase :
1. Allez dans **SQL Editor**
2. Ouvrez et exécutez le fichier `FIX-PHOTO-PROFILE-URGENT.sql`
3. Vérifiez que toutes les requêtes s'exécutent sans erreur

Ce script va :
- ✅ Forcer le bucket `profile-photos` à être PUBLIC
- ✅ Recréer toutes les policies RLS correctement
- ✅ Vérifier la colonne `photo_url` dans la table `profil`

### ÉTAPE 2 : Vider le cache du navigateur

Après avoir exécuté le script SQL :

**Chrome/Edge/Brave :**
1. Ouvrir les DevTools (F12)
2. Clic droit sur le bouton Actualiser
3. Choisir "Vider le cache et actualiser de force"

**Firefox :**
1. Ctrl + Shift + Suppr
2. Cocher "Images et fichiers en cache"
3. Cliquer sur "Effacer maintenant"

**Safari :**
1. Développement > Vider les caches
2. Actualiser la page

### ÉTAPE 3 : Vérifier dans Supabase Dashboard

1. Allez dans **Storage** > **profile-photos**
2. Vous devriez voir un dossier avec l'ID du profil
3. À l'intérieur, le fichier `photo.jpg` (ou `.png`)
4. Cliquez dessus et vérifiez que vous pouvez le voir

### ÉTAPE 4 : Retenter l'upload

Si la photo ne s'affiche toujours pas :
1. Supprimez la photo actuelle (bouton rouge)
2. Rechargez une nouvelle photo
3. Attendez la notification de succès
4. Rafraîchissez la page

## Vérifications SQL

### Vérifier que le bucket est public

```sql
SELECT id, name, public
FROM storage.buckets
WHERE id = 'profile-photos';
```

**Résultat attendu :**
```
id              | name           | public
profile-photos  | profile-photos | true
```

Si `public = false`, **PROBLÈME !** → Exécutez le script de correction.

### Vérifier les policies RLS

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%profile%'
ORDER BY policyname;
```

**Résultat attendu :** 4 policies
- `Anyone can view profile photos` (SELECT)
- `Users can upload their own profile photo` (INSERT)
- `Users can update their own profile photo` (UPDATE)
- `Users can delete their own profile photo` (DELETE)

### Vérifier les photos existantes

```sql
SELECT
  p.nom,
  p.prenom,
  p.photo_url,
  CASE
    WHEN p.photo_url IS NOT NULL THEN '✅ URL présente'
    ELSE '❌ Pas de photo'
  END as status
FROM profil p
WHERE p.photo_url IS NOT NULL
ORDER BY p.nom;
```

## Test manuel

### Test dans le SQL Editor

```sql
-- Créer une URL de test
SELECT
  id,
  nom,
  prenom,
  photo_url,
  -- Extraire juste le path du fichier
  SPLIT_PART(photo_url, 'profile-photos/', 2) as file_path
FROM profil
WHERE photo_url IS NOT NULL
LIMIT 1;
```

Copiez l'URL complète (`photo_url`) et ouvrez-la dans un nouvel onglet :
- ✅ **Si l'image s'affiche** → Le bucket est OK, c'est un problème de cache
- ❌ **Si erreur 404** → Le fichier n'existe pas dans Storage
- ❌ **Si erreur 403** → Le bucket n'est pas public

## Erreurs courantes dans la console

### Erreur : `Failed to load resource: 404`
**Cause :** Le fichier n'existe pas dans Storage
**Solution :** Recharger la photo

### Erreur : `Failed to load resource: 403`
**Cause :** Le bucket n'est pas public ou policies RLS bloquent
**Solution :** Exécuter `FIX-PHOTO-PROFILE-URGENT.sql`

### Erreur : `CORS policy: No 'Access-Control-Allow-Origin'`
**Cause :** Problème de CORS (rare avec Supabase)
**Solution :** Vérifier la configuration du projet Supabase

## Si rien ne fonctionne

### Option 1 : Recréer le bucket complètement

```sql
-- ATTENTION : Ceci supprime toutes les photos !
DELETE FROM storage.objects WHERE bucket_id = 'profile-photos';
DELETE FROM storage.buckets WHERE id = 'profile-photos';

-- Puis exécuter FIX-PHOTO-PROFILE-URGENT.sql
```

### Option 2 : Vérifier le .env

Assurez-vous que les variables d'environnement sont correctes :

```bash
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

### Option 3 : Vérifier les logs Supabase

Dans le dashboard Supabase :
1. Allez dans **Logs** > **Storage**
2. Cherchez les erreurs récentes
3. Notez le message d'erreur exact

## Test de l'upload en console

Ouvrez la console du navigateur et tapez :

```javascript
// Récupérer les infos Supabase
const { data: buckets } = await supabase.storage.listBuckets();
console.log('Buckets disponibles:', buckets);

// Vérifier le bucket profile-photos
const { data: files } = await supabase.storage
  .from('profile-photos')
  .list();
console.log('Fichiers dans profile-photos:', files);
```

## Checklist finale

Avant de demander de l'aide, vérifiez :

- [ ] Script `FIX-PHOTO-PROFILE-URGENT.sql` exécuté sans erreur
- [ ] Bucket `profile-photos` existe et `public = true`
- [ ] 4 policies RLS actives pour le bucket
- [ ] Cache du navigateur vidé
- [ ] Photo rechargée après correction
- [ ] URL de la photo accessible dans un nouvel onglet
- [ ] Variables d'environnement correctes
- [ ] Pas d'erreurs dans la console du navigateur

## Support

Si le problème persiste après toutes ces étapes :
1. Faites une capture d'écran de la console (F12)
2. Copiez l'URL complète de la photo depuis la base de données
3. Copiez les erreurs de la console
4. Vérifiez les logs Storage dans Supabase

---

**Temps estimé de résolution :** 2-5 minutes
**Complexité :** Facile (problème de configuration)
