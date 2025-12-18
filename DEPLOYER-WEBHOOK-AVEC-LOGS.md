# Déployer la Fonction Webhook avec les Nouveaux Logs

## Modifications Apportées

J'ai ajouté des logs très visibles (avec 🚨) au tout début de la fonction `yousign-webhook/index.ts` :

```typescript
Deno.serve(async (req: Request) => {
  // LOG IMMÉDIAT - AVANT TOUT
  console.log("🚨 WEBHOOK YOUSIGN APPELÉ - TIMESTAMP:", new Date().toISOString());
  console.log("🚨 URL:", req.url);
  console.log("🚨 METHOD:", req.method);

  // ...reste du code
```

Ces logs s'afficheront **TOUJOURS**, même avant le try/catch, ce qui permet de voir :
- Si le webhook est appelé ou non
- L'URL exacte appelée
- La méthode HTTP utilisée

## Option 1 : Déploiement via Supabase Dashboard (RECOMMANDÉ)

### Étape 1 : Copier le Code
1. Ouvre le fichier `supabase/functions/yousign-webhook/index.ts`
2. Copie tout le contenu (Ctrl+A, Ctrl+C)

### Étape 2 : Aller dans Supabase Dashboard
1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet **MAD IMPACT**
3. Va dans **Edge Functions** (menu de gauche)

### Étape 3 : Éditer la Fonction
1. Clique sur **yousign-webhook** dans la liste
2. Clique sur **Code**
3. Supprime tout le code existant
4. Colle le nouveau code
5. Clique sur **Deploy**

## Option 2 : Via Supabase CLI

Si tu as la CLI installée :

```bash
cd /tmp/cc-agent/59041934/project

# Déployer la fonction
supabase functions deploy yousign-webhook
```

## Vérification du Déploiement

### 1. Tester la Fonction
```bash
curl https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook

# Tu devrais voir :
# {"ok":true,"message":"Webhook ready"}
```

### 2. Tester avec un Payload
```bash
curl -X POST https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "signature_request.done",
    "data": {
      "signature_request": {
        "external_id": "test-123",
        "status": "done"
      }
    }
  }'
```

### 3. Vérifier les Logs
1. Va dans Supabase Dashboard
2. Edge Functions > yousign-webhook > Logs
3. Tu devrais maintenant voir :
   ```
   🚨 WEBHOOK YOUSIGN APPELÉ - TIMESTAMP: 2025-12-18T...
   🚨 URL: https://...
   🚨 METHOD: POST
   ```

## Prochaines Étapes Après le Déploiement

### 1. Test Depuis Yousign
1. Va dans Yousign > Développeurs > Webhooks
2. Clique sur ton webhook
3. Teste-le
4. Vérifie immédiatement les logs Supabase

### 2. Test avec un Vrai Contrat
Si tu as déjà un contrat en statut "envoyé" :

```sql
-- Trouve l'ID du contrat
SELECT id, statut FROM contrat
WHERE profil_id = (SELECT id FROM profil WHERE prenom = 'WAJDI')
ORDER BY created_at DESC LIMIT 1;
```

Puis teste le webhook avec cet ID réel :
```bash
./test-webhook-yousign.sh
# (modifie TEST-ID dans le script avec l'ID réel)
```

### 3. Si les Logs Sont Toujours Vides

Cela signifierait que :
- **Le webhook n'est PAS appelé du tout**
- L'URL dans Yousign est incorrecte
- Le webhook n'est pas actif dans Yousign
- Il y a un problème de réseau/firewall

Dans ce cas, vérifie :
1. L'URL exacte dans Yousign (doit être : `https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook`)
2. Que le webhook est bien **ACTIF**
3. Que tu es dans le bon environnement (Sandbox vs Production)

## Résumé des Changements

✅ **Logs ajoutés au début** (avant tout, même le try/catch)
✅ **Logs d'erreur améliorés** (avec détails complets)
✅ **Logs OPTIONS** pour les requêtes CORS

Maintenant, **chaque appel** au webhook sera tracé, même s'il échoue immédiatement.
