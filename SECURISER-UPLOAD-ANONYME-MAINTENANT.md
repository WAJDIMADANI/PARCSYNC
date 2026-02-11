# 🔒 SÉCURISER L'UPLOAD ANONYME - SOLUTION PRODUCTION

## ⚠️ Pourquoi la première solution était dangereuse

Le SQL précédent avec `WITH CHECK (true)` pour `anon` permettait à **n'importe qui sur Internet** de :
- Uploader des fichiers dans votre bucket (spam, malware, facture de stockage)
- Insérer des lignes dans la table `document`
- Lire tous les documents et métadonnées

**❌ À NE JAMAIS UTILISER EN PRODUCTION !**

## ✅ Solution sécurisée implémentée

### 1️⃣ Validation côté base de données

Les policies RLS vérifient maintenant :
- ✅ Le token existe dans `upload_tokens`
- ✅ Le token n'est pas expiré
- ✅ Le `profil_id` correspond
- ✅ Le chemin de stockage commence par `<profilId>/`

### 2️⃣ Token passé dans les headers HTTP

Le front envoie maintenant le token dans un header personnalisé `x-upload-token` :
```typescript
createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-upload-token': token
    }
  }
});
```

### 3️⃣ Chemin de stockage sécurisé

Les fichiers sont stockés sous : `<profilId>/<docType>-<timestamp>.ext`

Exemple : `123e4567-e89b-12d3-a456-426614174000/carte_identite-1707234567890.pdf`

## 🚀 Déploiement (3 étapes)

### Étape 1 : SQL (Supabase Dashboard)

1. Ouvrez **Supabase Dashboard** → SQL Editor
2. Copiez-collez le contenu de **`FIX-UPLOAD-ANONYME-SECURISE.sql`**
3. Cliquez sur **Run**

Vous devriez voir :
```
✅ Bucket configuré (NON public)
✅ Storage policies sécurisées créées
✅ Document policies sécurisées créées
⚠️ IMPORTANT: Le front doit passer le token dans le header x-upload-token
```

### Étape 2 : Code (déjà fait ✅)

Les modifications suivantes ont été appliquées :

**`src/components/UploadAllMissingDocuments.tsx`** :
- ✅ Création d'un client Supabase avec le token dans les headers
- ✅ Vérification que le client est défini avant utilisation
- ✅ Chemin de stockage avec `profilId` en premier

### Étape 3 : Test

1. **Envoyez un rappel** depuis votre application (profil avec documents manquants)
2. **Ouvrez le lien** reçu par email
3. **Uploadez un document**
4. ✅ Ça devrait fonctionner !

## 🔍 Comment vérifier que c'est sécurisé

### Test 1 : Token invalide (doit échouer)
- Modifiez manuellement le token dans l'URL
- Essayez d'uploader → ❌ Doit être bloqué

### Test 2 : Token expiré (doit échouer)
- Utilisez un lien de plus de 7 jours
- Essayez d'uploader → ❌ Doit être bloqué

### Test 3 : Token valide (doit réussir)
- Utilisez un lien récent
- Uploadez → ✅ Doit fonctionner

### Test 4 : Mauvais profil_id (doit échouer)
- Modifiez le `profil` dans l'URL
- Essayez d'uploader → ❌ Doit être bloqué

## 📊 Différences avec la version dangereuse

| Aspect | Version dangereuse ❌ | Version sécurisée ✅ |
|--------|---------------------|-------------------|
| **Bucket public** | Oui | Non |
| **Validation token** | Aucune | Token + expiration + profil_id |
| **Header HTTP** | Non utilisé | x-upload-token requis |
| **Chemin contrôlé** | Non | Oui (profilId en 1er) |
| **Lectures publiques** | Oui (tous docs) | Non (auth only) |

## 🎯 Résumé

- ✅ **SQL sécurisé** : validation token + expiration + profil_id
- ✅ **Code modifié** : token dans headers + chemin sécurisé
- ✅ **Build réussi** : compilation sans erreurs
- 🚀 **Prêt pour production**

Il suffit maintenant d'exécuter le SQL dans Supabase !
