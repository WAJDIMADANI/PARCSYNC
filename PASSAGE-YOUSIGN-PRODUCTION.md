# Guide : Passage Yousign en Production

## Etape 1 : Vérification des clés API dans .env

### Statut actuel dans votre .env :
```
YOUSIGN_API_KEY=BD6Dd2fYfnBKZ37Xk1HMlhoNA35jpaDt
VITE_YOUSIGN_API_KEY=tb7LS9XfUkl7Be9kl2xAtWUDC7J9wcF6
```

### Quelle clé utiliser ?

**YOUSIGN_API_KEY** (ligne 7) :
- Utilisée par les **Edge Functions** (backend)
- Utilisée par `create-yousign-signature`
- Cette clé semble être en **production** (commence par BD6)

**VITE_YOUSIGN_API_KEY** (ligne 8) :
- Utilisée par le **frontend** (si nécessaire)
- Actuellement différente (commence par tb7)

### ACTION REQUISE :

**Avez-vous 2 clés différentes ?**
1. Une clé de **SANDBOX** (test) commençant par `tb7...`
2. Une clé de **PRODUCTION** commençant par `BD6...`

**Si oui :**
- Mettre la clé PRODUCTION dans `YOUSIGN_API_KEY`
- Mettre la même clé PRODUCTION dans `VITE_YOUSIGN_API_KEY`

**Actuellement, il semble que :**
- `YOUSIGN_API_KEY` = Production (BD6...)
- `VITE_YOUSIGN_API_KEY` = Sandbox (tb7...)

**Correction à faire :** Mettre la même clé production partout.

---

## Etape 2 : Configuration du Webhook Yousign

### URL du Webhook
Votre webhook doit pointer vers :
```
https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook
```

### Configuration dans Yousign Dashboard (Production)

1. Allez sur https://yousign.app (compte production)
2. Menu **Paramètres** → **Webhooks** → **API**
3. Créer ou modifier le webhook avec :
   - **URL** : `https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook`
   - **Events** à activer :
     - ✅ `signature_request.done`
     - ✅ `signature_request.declined`
     - ✅ `signature_request.expired`
   - **Statut** : ✅ Activé

### Vérification
Une fois configuré, testez avec un contrat réel en production.

---

## Etape 3 : Variables d'environnement Supabase

Les Edge Functions utilisent les variables d'environnement de **Supabase**, pas du fichier `.env` local.

### Vérifier les variables dans Supabase :

1. Allez sur https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr
2. Menu **Settings** → **Edge Functions** → **Environment Variables**
3. Vérifiez que `YOUSIGN_API_KEY` existe et contient la clé **PRODUCTION**

### Si la variable n'existe pas ou est en SANDBOX :

**Depuis votre terminal :**

```bash
# Se connecter à Supabase CLI (si pas déjà fait)
npx supabase login

# Lier le projet
npx supabase link --project-ref jnlvinwekqvkrywxrjgr

# Définir la clé API en production
npx supabase secrets set YOUSIGN_API_KEY=BD6Dd2fYfnBKZ37Xk1HMlhoNA35jpaDt
```

**⚠️ IMPORTANT :** Remplacez `BD6Dd2fYfnBKZ37Xk1HMlhoNA35jpaDt` par votre vraie clé de production si elle est différente.

---

## Etape 4 : Redéployer les Edge Functions

Après avoir mis à jour les variables d'environnement, vous devez redéployer les fonctions pour qu'elles utilisent la nouvelle clé.

### Fonctions à redéployer :

```bash
# Fonction principale de création de signature
npx supabase functions deploy create-yousign-signature

# Fonction webhook
npx supabase functions deploy yousign-webhook

# Fonction de téléchargement des contrats signés
npx supabase functions deploy download-signed-contract
```

### Ou tout redéployer en une fois :

```bash
npx supabase functions deploy
```

---

## Etape 5 : Tester en Production

### Test complet :

1. **Créer un contrat** depuis l'interface
2. **Envoyer en signature** à un email de test
3. **Vérifier les logs Supabase** :
   - Allez sur https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr
   - Menu **Edge Functions** → Logs
   - Vérifiez `create-yousign-signature` pour voir si la requête Yousign réussit
4. **Signer le contrat** via le lien reçu par email
5. **Vérifier le webhook** :
   - Dans les logs de `yousign-webhook`
   - Le contrat doit passer au statut `signe` dans la base de données

### Vérification du statut dans la base :

```sql
SELECT
  id,
  statut,
  yousign_signature_request_id,
  date_envoi,
  date_signature
FROM contrat
WHERE yousign_signature_request_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## Etape 6 : Différences Sandbox vs Production

### Sandbox (Test) :
- Clé API commence par `tb7...`
- URL : `https://api-sandbox.yousign.app`
- Emails de test seulement
- Pas de vraie signature électronique

### Production :
- Clé API commence par `BD6...` ou autre préfixe prod
- URL : `https://api.yousign.app`
- Emails réels
- Signatures légalement valides

**La fonction Edge détecte automatiquement l'environnement** en regardant le préfixe de la clé API.

---

## Checklist Finale

- [ ] Clé production dans `.env` local (`YOUSIGN_API_KEY`)
- [ ] Même clé dans `VITE_YOUSIGN_API_KEY`
- [ ] Webhook configuré dans Yousign Dashboard (production)
- [ ] Variable `YOUSIGN_API_KEY` mise à jour dans Supabase
- [ ] Edge Functions redéployées
- [ ] Test complet réussi (envoi + signature + webhook)

---

## Commandes Résumées

```bash
# 1. Mettre à jour la clé API dans Supabase
npx supabase secrets set YOUSIGN_API_KEY=VOTRE_CLE_PRODUCTION

# 2. Redéployer toutes les fonctions
npx supabase functions deploy

# 3. Vérifier les logs
# Via dashboard Supabase → Edge Functions → Logs
```

---

## Support

En cas de problème :
1. Vérifiez les logs dans Supabase Dashboard
2. Vérifiez que le webhook reçoit bien les événements (Dashboard Yousign → Webhooks → Historique)
3. Testez avec un email de test d'abord
