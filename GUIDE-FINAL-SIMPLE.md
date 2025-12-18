# Guide Final - Résoudre le Problème du Webhook Yousign

## Ce Qui A Été Fait

1. ✅ Mise à jour de la clé API dans `.env`
2. ✅ Ajout de logs très visibles au début de la fonction webhook
3. ✅ Ajout de logs d'erreur détaillés

## Ce Que Tu Dois Faire MAINTENANT

### ÉTAPE 1 : Déployer la Fonction Mise à Jour

**Option A : Via Supabase Dashboard** (le plus simple)

1. Ouvre `supabase/functions/yousign-webhook/index.ts` dans ton éditeur
2. Copie tout le contenu (Ctrl+A puis Ctrl+C)
3. Va sur https://supabase.com/dashboard
4. Sélectionne ton projet
5. Va dans **Edge Functions** > **yousign-webhook**
6. Clique sur **Code**
7. Remplace le code par celui que tu as copié
8. Clique sur **Deploy**

**Option B : Via CLI** (si installée)
```bash
supabase functions deploy yousign-webhook
```

### ÉTAPE 2 : Vérifier le Déploiement

Teste que la fonction est bien déployée :
```bash
curl https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook
```

Tu devrais voir : `{"ok":true,"message":"Webhook ready"}`

### ÉTAPE 3 : Vérifier l'URL dans Yousign

1. Va sur https://yousign.app
2. **Développeurs** > **Webhooks**
3. Clique sur ton webhook
4. Vérifie que l'URL est exactement :
   ```
   https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook
   ```
5. Vérifie qu'il est **ACTIF**
6. Vérifie l'événement : `signature_request.done`

### ÉTAPE 4 : Tester le Webhook

**Dans Yousign :**
1. Clique sur ton webhook
2. Clique sur **"Tester le webhook"**
3. Envoie un test

**Puis IMMÉDIATEMENT :**
1. Va dans Supabase Dashboard
2. **Edge Functions** > **yousign-webhook** > **Logs**
3. Regarde si tu vois des lignes avec 🚨

### ÉTAPE 5 : Interpréter les Résultats

#### CAS 1 : Tu VOIS des logs avec 🚨
**C'est bon !** Le webhook fonctionne, il est appelé.
- Si le contrat ne passe pas à "signé", il y a un problème dans le traitement
- Lis les logs pour voir l'erreur exacte

#### CAS 2 : Tu ne vois AUCUN log
**Le webhook n'est PAS appelé du tout !**
Cela signifie :
- L'URL est incorrecte dans Yousign
- Le webhook n'est pas actif
- La clé API ne correspond pas

**Solutions :**
1. Vérifie l'URL exacte dans Yousign
2. Vérifie que le webhook est ACTIF
3. Vérifie que tu es dans le bon environnement (Sandbox/Production)
4. Vérifie que la clé API dans Yousign est : `BD6Dd2fYfnBKZ37Xk1HMlhoNA35jpaDt`

### ÉTAPE 6 : Vérifier le Contrat de Wajdi

Exécute ce SQL dans Supabase :
```sql
-- Voir le fichier VERIFIER-CONTRAT-WAJDI.sql
SELECT
  c.id,
  c.statut,
  c.date_signature,
  p.nom,
  p.prenom
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE p.prenom = 'WAJDI' AND p.nom = 'MADANI'
ORDER BY c.created_at DESC;
```

## Fichiers Créés Pour Toi

- `DEPLOYER-WEBHOOK-AVEC-LOGS.md` - Guide détaillé de déploiement
- `VERIFIER-CONTRAT-WAJDI.sql` - Requêtes SQL de vérification
- `GUIDE-COMPLET-WEBHOOK-YOUSIGN.md` - Guide complet
- `test-webhook-yousign.sh` - Script de test automatique
- `DIAGNOSTIC-WEBHOOK-CONTRATS.sql` - Diagnostic complet

## Questions Fréquentes

**Q: Les logs sont toujours vides**
R: Le webhook n'est pas appelé. Vérifie l'URL dans Yousign et que le webhook est actif.

**Q: Je vois les logs mais le statut ne change pas**
R: Lis les logs pour voir l'erreur. Partage-les moi pour qu'on analyse ensemble.

**Q: Comment forcer le statut si rien ne fonctionne ?**
R: Utilise le SQL dans `VERIFIER-CONTRAT-WAJDI.sql` (dernière section commentée).

## Résumé en 3 Points

1. **Déploie** la fonction mise à jour (Étape 1)
2. **Teste** depuis Yousign et vérifie les logs (Étapes 3-4)
3. **Analyse** les résultats selon le cas (Étape 5)

Si tu es bloqué, donne-moi :
- Les logs Supabase (copie-colle)
- Le résultat de `VERIFIER-CONTRAT-WAJDI.sql`
- La configuration du webhook dans Yousign (screenshot)
