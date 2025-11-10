# Mode Test pour le Webhook Yousign

## 🔧 Configuration du Mode Test

Le webhook Yousign a maintenant un **mode test** qui permet de sauter la vérification HMAC pour faciliter les tests.

### 1. Activer le Mode Test

Dans **Supabase Dashboard** → **Edge Functions** → **yousign-webhook** → **Secrets**, ajoutez :

```
SKIP_WEBHOOK_VERIFY=1
```

⚠️ **IMPORTANT** : En production, supprimez cette variable ou mettez-la à `0` pour activer la vérification HMAC !

### 2. Configurer le Secret Webhook (Production)

Pour la production, ajoutez aussi :

```
YOUSIGN_WEBHOOK_SECRET=<votre_secret_yousign>
```

Vous pouvez obtenir ce secret depuis votre dashboard Yousign dans la configuration des webhooks.

## 🧪 Tester le Webhook

### Format de Test 1 : Avec `event_name`

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/yousign-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "signature_request.done",
    "signature_request": {
      "id": "sr_xxx",
      "external_id": "ID_DE_VOTRE_CONTRAT"
    }
  }'
```

### Format de Test 2 : Avec `type` et `data`

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/yousign-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "signature_request.done",
    "data": {
      "signature_request_id": "sr_xxx"
    }
  }'
```

## 📋 Événements Supportés

Le webhook gère maintenant :

- `signature_request.done` - Contrat signé par tous les signataires
- `signature_request.declined` - Contrat refusé
- `signature_request.expired` - Contrat expiré
- `signer.signed` - Un signataire a signé (pour multi-signataires)

## 🔍 Recherche du Contrat

Le webhook recherche le contrat de 2 façons :

1. **Par `external_id`** (ID du contrat passé lors de la création)
2. **Par `yousign_signature_request_id`** (ID de la signature request Yousign)

## ✅ Actions Automatiques lors de `signature_request.done`

Quand un contrat est signé :

1. ✅ Met à jour le statut du contrat à `'signe'`
2. ✅ Enregistre la date de signature
3. ✅ Télécharge le PDF signé depuis Yousign
4. ✅ Sauvegarde le PDF dans Supabase Storage
5. ✅ Met à jour le profil du salarié à `'contrat_signe'`
6. ✅ Crée une entrée dans la table `document`

## 🔐 Vérification HMAC (Production)

En production (quand `SKIP_WEBHOOK_VERIFY` n'est pas `1`), le webhook vérifie la signature HMAC SHA-256 envoyée par Yousign dans le header `x-yousign-signature`.

## 📝 Logs

Le webhook log toutes les étapes importantes :

- ✅ Vérification de signature (activée/désactivée)
- ✅ Événement reçu et ses détails
- ✅ ID du contrat trouvé
- ✅ Mise à jour du contrat
- ✅ Téléchargement du PDF
- ✅ Upload dans Storage
- ✅ Mise à jour du profil

Consultez les logs dans **Supabase Dashboard** → **Edge Functions** → **yousign-webhook** → **Logs**.

## 🚀 Déploiement

Pour déployer la fonction mise à jour :

```bash
./deploy-yousign-webhook.sh
```

Ou manuellement avec le MCP tool `mcp__supabase__deploy_edge_function`.
