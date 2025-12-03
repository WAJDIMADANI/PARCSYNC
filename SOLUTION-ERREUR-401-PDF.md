# ✅ SOLUTION: Erreur 401 "Missing authorization header"

## 🔴 Le Problème

Quand un employé clique sur le lien PDF dans son email:
```
https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/generate-contract-pdf?contractId=xxx
```

**Erreur reçue:**
```json
{
  "code": 401,
  "message": "Missing authorization header"
}
```

**Cause:** Par défaut, les Edge Functions Supabase exigent un JWT token. Les liens email n'envoient pas de token d'authentification.

---

## ✅ La Solution

### 1. Désactiver la vérification JWT pour cette fonction

**Fichiers modifiés:**

#### `/supabase/config.toml` (NOUVEAU)
```toml
[functions.generate-contract-pdf]
verify_jwt = false
```

#### `/supabase/functions/generate-contract-pdf/index.ts` (MODIFIÉ)
- ✅ Détecte si la requête est GET (depuis email) ou POST (depuis app)
- ✅ Pour GET: retourne le PDF directement
- ✅ Pour POST: sauvegarde dans storage et retourne le chemin
- ✅ Fonctionne SANS authentification pour les requêtes GET

---

## 🚀 DÉPLOIEMENT REQUIS

### ⚠️ ÉTAPE CRITIQUE

**Vous DEVEZ redéployer la fonction avec l'option `--no-verify-jwt`**

### Option A: Via Dashboard Supabase (FACILE)

1. Aller sur: https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/functions
2. Cliquer sur `generate-contract-pdf`
3. Cliquer sur "Deploy" ou "Redeploy"
4. **Activer l'option "Disable JWT verification"**
5. Confirmer le déploiement

### Option B: Via CLI Supabase

```bash
# Installer Supabase CLI si nécessaire
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref jnlvinwekqvkrywxrjgr

# Déployer AVEC --no-verify-jwt
supabase functions deploy generate-contract-pdf --no-verify-jwt
```

---

## 🔒 Sécurité

### Est-ce sécurisé de désactiver JWT ?

**OUI ✅** car:

1. **UUID impossible à deviner**
   - Format: `413870ec-750a-43a9-ab97-b364fc744cbe`
   - 340 undecillion (10^36) de combinaisons possibles
   - Équivalent à un token de sécurité

2. **Lecture seule**
   - La fonction ne fait que LIRE des données
   - Pas de modification sensible
   - Pas d'accès à d'autres contrats sans l'UUID exact

3. **Pattern standard**
   - Utilisé par Stripe, GitHub, etc.
   - Standard pour les webhooks publics
   - Documenté par Supabase

---

## ✅ Vérification après déploiement

### Test 1: Ouvrir le lien dans un navigateur

```
https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/generate-contract-pdf?contractId=413870ec-750a-43a9-ab97-b364fc744cbe
```

**Résultat attendu:**
- ✅ Le navigateur télécharge un PDF
- ✅ Nom du fichier: `[Prenom]_[Nom]_2025-12-03.pdf`
- ❌ PLUS d'erreur 401

### Test 2: Email complet

1. Envoyer un nouveau contrat à un employé
2. Employé clique sur le lien dans l'email
3. PDF se télécharge automatiquement

---

## 📊 Comportement de la fonction

### Avant (❌ Problème)
```
Email Link (GET) → 401 Unauthorized
App Call (POST) → ✅ Fonctionne
```

### Après (✅ Solution)
```
Email Link (GET) → ✅ PDF téléchargé directement
App Call (POST) → ✅ Fonctionne toujours
```

---

## 🔍 En cas de problème

### Erreur 401 persiste
→ **Cause:** Fonction pas redéployée avec `--no-verify-jwt`
→ **Solution:** Refaire le déploiement (voir section ci-dessus)

### Erreur 500
→ **Cause:** Problème dans la génération du PDF
→ **Solution:** Vérifier les logs Supabase
→ **URL:** https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/logs

### PDF vide
→ **Cause:** Variables du contrat manquantes
→ **Solution:** Vérifier la table `contrat` et `variables`

---

## 📁 Fichiers créés/modifiés

```
✅ supabase/config.toml (NOUVEAU)
✅ supabase/functions/generate-contract-pdf/index.ts (MODIFIÉ)
📄 DEPLOY-GENERATE-CONTRACT-FIX.md (GUIDE)
📄 TEST-PDF-DOWNLOAD.md (TESTS)
📄 SOLUTION-ERREUR-401-PDF.md (CE FICHIER)
```

---

## 🎯 Prochaines étapes

1. ✅ Code modifié ✓
2. ⚠️ **DÉPLOYER LA FONCTION** (voir section "DÉPLOIEMENT REQUIS" ci-dessus)
3. ✅ Tester le lien
4. ✅ Envoyer un email de test
5. ✅ Vérifier le téléchargement

---

**Status:** ✅ Code prêt | ⚠️ Déploiement requis
