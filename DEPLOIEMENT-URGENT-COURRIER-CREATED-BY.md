# Déploiement Urgent - Correction FK courrier_genere.created_by

## ⚠️ PROBLÈME IDENTIFIÉ

Dans Network, la requête POST `/rest/v1/courrier_genere` envoie :
```json
{
  "created_by": "4f0875..."  // ❌ C'est auth.uid() (auth.users.id)
}
```

Et renvoie l'erreur :
```
23503 FK courrier_genere_created_by_fkey
```

**Cause :** La colonne `courrier_genere.created_by` référence `app_utilisateur.id`, pas `auth.users.id`.

---

## ✅ CORRECTIF APPLIQUÉ

### Fichiers modifiés

#### 1. `src/lib/letterTemplateGenerator.ts`

La fonction `saveGeneratedLetter` a été mise à jour pour :

1. **Récupérer l'auth user** via `supabase.auth.getUser()`
2. **Récupérer l'app_utilisateur.id** via `SELECT id FROM app_utilisateur WHERE auth_user_id = user.id`
3. **Forcer `created_by = appUser.id`** dans le payload (AUCUN fallback vers `auth.uid()`)

#### 2. `src/components/GenerateLetterV2Wizard.tsx`

Le composant qui génère des courriers Word a été corrigé :
- Récupération de `app_utilisateur.id` avant insertion
- Logs `[courrier-v2]` ajoutés
- `created_by = appUser.id` au lieu de `user.id`

#### 3. `src/components/GeneratedLettersList.tsx`

La fonction `handleDuplicate` qui duplique des courriers a été corrigée :
- Récupération de `app_utilisateur.id` avant insertion
- Logs `[duplicate]` ajoutés
- `created_by = appUser.id` ajouté au payload (était absent avant)

### Logs obligatoires ajoutés

Ces logs apparaîtront dans la console du navigateur :

```javascript
console.log('[courrier] auth uid', user.id)              // UUID de auth.users
console.log('[courrier] appUser.id', appUser.id)        // UUID de app_utilisateur
console.log('[courrier] payload.created_by', payload.created_by)  // Doit = appUser.id
console.log('[courrier] payload complet:', JSON.stringify(payload, null, 2))
console.error('[courrier] insert error', dbError)        // En cas d'erreur
```

### Code exact du correctif

```typescript
// 1) Récupérer l'utilisateur authentifié
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  console.error('[courrier] Auth error:', authError);
  throw authError || new Error('Utilisateur non authentifié');
}
console.log('[courrier] auth uid', user.id);

// 2) Récupérer l'app_utilisateur.id correspondant
const { data: appUser, error: appUserError } = await supabase
  .from('app_utilisateur')
  .select('id')
  .eq('auth_user_id', user.id)
  .maybeSingle();

if (appUserError || !appUser) {
  console.error('[courrier] app_utilisateur introuvable:', appUserError);
  throw appUserError || new Error('app_utilisateur introuvable pour cet utilisateur');
}
console.log('[courrier] appUser.id', appUser.id);

// 3) Insérer dans courrier_genere avec created_by = appUser.id (PAS auth.uid())
const payload = {
  profil_id: profilId,
  modele_courrier_id: modeleId,
  modele_nom: modeleName,
  sujet: subject,
  contenu_genere: content,
  variables_remplies: variables,
  fichier_pdf_url: pdfUrl,
  created_by: appUser.id  // ✅ FORCÉ à app_utilisateur.id
};

console.log('[courrier] payload.created_by', payload.created_by);
console.log('[courrier] payload complet:', JSON.stringify(payload, null, 2));

const { data, error: dbError } = await supabase
  .from('courrier_genere')
  .insert(payload)
  .select()
  .single();

if (dbError) {
  console.error('[courrier] insert error', dbError);
  throw dbError;
}
```

---

## 📦 BUILD EFFECTUÉ

```bash
npm run build
```

**Résultat :**
- ✅ Build réussi
- **Nouveau hash JS :** `index-DvwY9aR8.js`
- **Anciens hashs :** `index-FtUp1YnB.js`, `index-BH2k12zg.js`
- **Nouveau hash :** Garantit que le cache navigateur sera invalidé

---

## 🚀 DÉPLOIEMENT SUR PRODUCTION

### Étape 1 : Publier le nouveau build

Si vous utilisez Netlify, Vercel, ou autre plateforme :

1. **Poussez les changements** (si Git)
   ```bash
   git add .
   git commit -m "fix: FK courrier_genere.created_by - force app_utilisateur.id"
   git push
   ```

2. **Ou uploadez manuellement** le contenu du dossier `dist/` sur parcsync.madimpact.fr

### Étape 2 : Invalider le cache

Le nouveau hash de fichier `index-FtUp1YnB.js` devrait automatiquement invalider le cache des navigateurs.

**Si le cache persiste :**
- Sur Netlify : Clear cache and redeploy
- Sur Vercel : Redeploy
- Sur serveur custom : Videz le cache CDN/proxy

### Étape 3 : Forcer le rechargement navigateur

Dans le navigateur, sur parcsync.madimpact.fr :
1. Ouvrir DevTools (F12)
2. Clic droit sur le bouton Refresh
3. Sélectionner **"Empty Cache and Hard Reload"** (Vider le cache et recharger)

---

## 🔍 VÉRIFICATION POST-DÉPLOIEMENT

### 1. Ouvrir la Console DevTools

Dans Chrome/Firefox, appuyer sur F12 > Console

### 2. Générer un courrier

Aller dans l'interface de génération de courrier et essayer de créer un nouveau courrier.

### 3. Vérifier les logs dans la Console

Selon le type d'opération, vous DEVEZ voir ces logs :

**Pour génération de courrier HTML/PDF :**
```
[courrier] auth uid 4f0875...
[courrier] appUser.id a497...  // ✅ Différent de auth uid !
[courrier] payload.created_by a497...  // ✅ Doit = appUser.id
[courrier] payload complet: { ... }
[courrier] Courrier enregistré avec succès, ID: ...
```

**Pour génération de courrier Word (V2) :**
```
[courrier-v2] auth uid 4f0875...
[courrier-v2] appUser.id a497...
[courrier-v2] payload.created_by a497...
```

**Pour duplication de courrier :**
```
[duplicate] auth uid 4f0875...
[duplicate] appUser.id a497...
[duplicate] payload.created_by a497...
```

### 4. Vérifier Network Tab

Dans DevTools > Network > filtrer sur "courrier_genere" :

**Payload de la requête POST doit maintenant contenir :**
```json
{
  "created_by": "a497..."  // ✅ app_utilisateur.id (PAS 4f0875... !)
}
```

**Si vous voyez encore `"created_by": "4f0875..."`**, cela signifie :
- Le cache n'a pas été invalidé (recharger avec Ctrl+Shift+R)
- Le nouveau build n'a pas été déployé
- L'ancien JS est encore chargé

---

## ❌ EN CAS DE PROBLÈME "app_utilisateur introuvable"

Si vous voyez dans la console :
```
[courrier] app_utilisateur introuvable
```

Cela signifie que l'utilisateur auth n'a pas d'entrée dans `app_utilisateur`.

**Solution SQL :**

```sql
-- Vérifier si l'utilisateur existe
SELECT
  u.id as auth_user_id,
  u.email,
  au.id as app_user_id
FROM auth.users u
LEFT JOIN app_utilisateur au ON au.auth_user_id = u.id
WHERE u.id = '4f0875...'  -- Remplacer par l'auth uid affiché dans les logs
;

-- Si app_user_id est NULL, créer l'entrée
INSERT INTO app_utilisateur (auth_user_id, email, nom, prenom, role)
SELECT
  id,
  email,
  'NOM_A_COMPLETER',
  'PRENOM_A_COMPLETER',
  'admin'
FROM auth.users
WHERE id = '4f0875...'  -- Remplacer par l'auth uid
AND NOT EXISTS (
  SELECT 1 FROM app_utilisateur WHERE auth_user_id = '4f0875...'
);
```

---

## 📊 TABLEAU DE DIAGNOSTIC

| Indicateur | Ancien (erreur) | Nouveau (corrigé) |
|-----------|-----------------|-------------------|
| Hash JS | `index-BH2k12zg.js` / `index-FtUp1YnB.js` | `index-DvwY9aR8.js` ✅ |
| Log auth uid | Non présent | `[courrier*] auth uid 4f0875...` ✅ |
| Log appUser.id | Non présent | `[courrier*] appUser.id a497...` ✅ |
| Log payload.created_by | Non présent | `[courrier*] payload.created_by a497...` ✅ |
| Network created_by | `4f0875...` ❌ | `a497...` ✅ |
| Erreur FK 23503 | Oui ❌ | Non ✅ |
| Fichiers corrigés | 0 | 3 ✅ |

*`[courrier]`, `[courrier-v2]`, ou `[duplicate]` selon le contexte

---

## 🎯 CHECKLIST FINALE

- [x] Code corrigé dans 3 fichiers
  - [x] `letterTemplateGenerator.ts`
  - [x] `GenerateLetterV2Wizard.tsx`
  - [x] `GeneratedLettersList.tsx`
- [x] Logs détaillés ajoutés (`[courrier]`, `[courrier-v2]`, `[duplicate]`)
- [x] Build npm effectué avec nouveau hash
- [ ] **Deploy sur parcsync.madimpact.fr**
- [ ] Cache invalidé (nouveau hash `index-DvwY9aR8.js` chargé)
- [ ] DevTools Console : logs `[courrier*]` présents
- [ ] Network : `created_by` = UUID app_utilisateur (pas auth.uid)
- [ ] Erreur FK 23503 disparue

---

## 🆘 SUPPORT

Si après déploiement l'erreur persiste :

1. **Vérifier le hash JS chargé** dans DevTools > Sources
   - Doit être `index-DvwY9aR8.js`
   - Si c'est `index-FtUp1YnB.js` ou `index-BH2k12zg.js`, le cache n'est pas invalidé

2. **Vérifier les logs console**
   - Doivent commencer par `[courrier]`
   - Si absents, le nouveau code n'est pas chargé

3. **Vérifier Network Payload**
   - `created_by` doit être un UUID différent de l'auth uid
   - Si identiques, l'ancien code est toujours actif

4. **Forcer le redéploiement complet**
   - Supprimer le dossier `dist/`
   - Relancer `npm run build`
   - Redéployer

---

**Date du build :** 2025-12-24
**Hash du nouveau build :** `index-DvwY9aR8.js`
**Fichiers sources modifiés :**
- `src/lib/letterTemplateGenerator.ts`
- `src/components/GenerateLetterV2Wizard.tsx`
- `src/components/GeneratedLettersList.tsx`
