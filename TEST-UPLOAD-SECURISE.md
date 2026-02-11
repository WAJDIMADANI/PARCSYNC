# 🧪 TEST UPLOAD ANONYME SÉCURISÉ

## ✅ Statut : SQL exécuté avec succès

Le message `⚠️ IMPORTANT: Le front doit passer le token dans le header x-upload-token` confirme que le SQL s'est bien exécuté.

## 🔍 Étape 1 : Vérifier les policies (optionnel mais recommandé)

### Dans Supabase Dashboard → SQL Editor

Exécutez le fichier **`VERIFIER-UPLOAD-SECURISE.sql`**

Vous devriez voir :
- ✅ Policy `anon_upload_documents_with_token` sur storage.objects
- ✅ Policy `anon_insert_document_with_token` sur document
- ✅ Bucket `documents` avec `public = false`

## 🧪 Étape 2 : Test en conditions réelles

### Test 1 : Envoi du lien (via l'application)

1. **Connectez-vous** à votre application
2. Allez dans **Employés** ou **RH Dashboard**
3. **Trouvez un employé** avec documents manquants
4. Cliquez sur **"Envoyer rappel documents manquants"**
5. ✅ L'employé reçoit un email avec un lien

### Test 2 : Upload via le lien (utilisateur anonyme)

1. **Ouvrez le lien** reçu par email (ou copiez-le dans un navigateur privé)
   - Format : `https://votre-app.com/upload-documents?profil=xxx&token=yyy`

2. **Vérifiez l'affichage** :
   - ✅ La page charge sans erreur
   - ✅ Les documents manquants sont listés
   - ✅ Pas d'erreur 401/403 dans la console

3. **Uploadez un document** :
   - Cliquez sur "Choisir un fichier" ou utilisez la caméra
   - Sélectionnez/prenez une photo
   - Cliquez sur "Envoyer"
   - ✅ L'upload doit réussir
   - ✅ Message de succès affiché
   - ✅ Le document disparaît de la liste

### Test 3 : Vérifier dans l'application

1. **Retournez dans l'application** (connecté en tant qu'admin/RH)
2. Allez voir le profil de l'employé qui vient d'uploader
3. Onglet **"Documents"**
4. ✅ Le document uploadé est visible
5. ✅ Vous pouvez le télécharger

## 🔒 Étape 3 : Tests de sécurité (vérifier que c'est vraiment sécurisé)

### Test de sécurité 1 : Token invalide (doit échouer ❌)

1. Prenez l'URL de test
2. **Modifiez le token** dans l'URL :
   ```
   ?profil=xxx&token=FAUX_TOKEN_123
   ```
3. Essayez d'uploader un document
4. ✅ **Doit échouer** avec erreur RLS / 403

### Test de sécurité 2 : Mauvais profil_id (doit échouer ❌)

1. Prenez l'URL de test
2. **Modifiez le profil_id** dans l'URL
3. Essayez d'uploader un document
4. ✅ **Doit échouer** avec erreur RLS / 403

### Test de sécurité 3 : Sans token (doit échouer ❌)

1. Essayez d'accéder à :
   ```
   https://votre-app.com/upload-documents?profil=xxx
   ```
   (sans `&token=...`)
2. ✅ **Doit afficher** "Lien invalide ou expiré"

### Test de sécurité 4 : Token expiré (doit échouer ❌)

Pour tester, vous pouvez modifier un token dans la base :
```sql
-- Expirer manuellement un token pour test
UPDATE upload_tokens
SET expires_at = now() - interval '1 day'
WHERE token = 'votre-token-de-test';
```

Puis essayez d'uploader avec ce token.
✅ **Doit échouer** avec "Lien invalide ou expiré"

## 🐛 Débuggage si ça ne marche pas

### Erreur RLS / 403 lors de l'upload

**Console navigateur** (F12) :
```
🚀 Début de l'upload pour: carte_identite
📤 Upload du fichier vers le storage (chemin sécurisé): <profilId>/carte_identite-...
❌ Erreur storage: new row violates row-level security policy
```

**Causes possibles** :

1. **Le header n'est pas passé** :
   - Vérifiez dans le code que le client Supabase est créé avec le header
   - Vérifiez dans Network (F12) que le header `x-upload-token` est présent

2. **Le token n'est pas dans upload_tokens** :
   - Vérifiez dans Supabase : `SELECT * FROM upload_tokens WHERE token = 'votre-token'`

3. **Le chemin ne commence pas par profilId** :
   - Vérifiez dans la console que le path est : `<profilId>/<docType>-...`
   - Le profilId doit être en premier dans le chemin

### Le document ne s'enregistre pas dans la table

**Vérifiez les logs** :
```
✅ Upload storage réussi
📝 Insertion dans la table document...
❌ Erreur insertion: ...
```

**Causes possibles** :

1. **owner_id vs profil_id** :
   - La policy vérifie `document.owner_id`
   - Assurez-vous que votre code utilise `owner_id` (et non `profil_id`)

2. **Colonnes manquantes** :
   - Vérifiez que tous les champs obligatoires sont remplis

## 📊 Checklist finale

- [ ] SQL exécuté (message de confirmation reçu) ✅
- [ ] Policies créées (vérification SQL ok)
- [ ] Build réussi (npm run build ok) ✅
- [ ] Test upload via lien réussi
- [ ] Document visible dans l'application
- [ ] Test sécurité : token invalide bloqué
- [ ] Test sécurité : mauvais profil_id bloqué

## 🎯 Résultat attendu

**Comportement normal** :
- ✅ Upload réussi avec token valide
- ❌ Upload bloqué avec token invalide/expiré
- ❌ Upload bloqué avec mauvais profil_id
- ❌ Upload bloqué sans token

**Sécurité garantie** :
- 🔒 Bucket NON public (nécessite auth)
- 🔒 Validation token + expiration
- 🔒 Validation profil_id match
- 🔒 Chemin sécurisé avec profilId

---

**Si tous les tests passent** → Vous êtes prêt pour la production ! 🚀

**Si un test échoue** → Partagez l'erreur console et je vous aide à corriger.
