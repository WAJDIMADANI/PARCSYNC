# Passage Yousign en Production - Guide Étape par Étape

## ✅ ETAPE 1 : Mise à jour du .env local (TERMINÉ)

Les deux clés utilisent maintenant la clé de production :
```
YOUSIGN_API_KEY=tb7LS9XfUkl7Be9kl2xAtWUDC7J9wcF6
VITE_YOUSIGN_API_KEY=tb7LS9XfUkl7Be9kl2xAtWUDC7J9wcF6
```

---

## 📋 ETAPE 2 : Vérifier la configuration du Webhook Yousign

### Action à faire dans le Dashboard Yousign

1. **Allez sur** : https://yousign.app (votre compte production)
2. **Menu** : Paramètres → Webhooks → API
3. **Vérifiez ou créez un webhook avec** :
   - **URL** : `https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook`
   - **Events activés** :
     - ✅ `signature_request.done`
     - ✅ `signature_request.declined`
     - ✅ `signature_request.expired`
   - **Statut** : ✅ Activé

4. **Notez** : Si vous voyez "sandbox" dans l'URL, vous êtes sur le mauvais compte

### Comment vérifier que vous êtes bien en production :
- L'URL du dashboard doit être `https://yousign.app` (pas `https://yousign.com/sandbox`)
- Votre clé API commence par `tb7...`

---

## 🔧 ETAPE 3 : Mettre à jour la clé dans Supabase

Les Edge Functions utilisent les variables d'environnement de Supabase, pas du fichier `.env`.

### Vérification dans le Dashboard Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr
2. **Menu** : Settings (en bas à gauche) → Configuration → Secrets
3. **Cherchez** : `YOUSIGN_API_KEY`
4. **Vérifiez la valeur** :
   - Si elle est différente de `tb7LS9XfUkl7Be9kl2xAtWUDC7J9wcF6`, cliquez sur "Edit"
   - Mettez la bonne valeur : `tb7LS9XfUkl7Be9kl2xAtWUDC7J9wcF6`
   - Cliquez sur "Save"

### Alternative : Via la ligne de commande (optionnel)

Si vous préférez utiliser le terminal :

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter
npx supabase login

# Lier le projet
npx supabase link --project-ref jnlvinwekqvkrywxrjgr

# Mettre à jour le secret
npx supabase secrets set YOUSIGN_API_KEY=tb7LS9XfUkl7Be9kl2xAtWUDC7J9wcF6
```

---

## 🚀 ETAPE 4 : Redéployer les Edge Functions

Une fois la variable mise à jour, il faut redéployer les fonctions.

### Option A : Redéployer via le Dashboard Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr
2. **Menu** : Edge Functions
3. Pour chaque fonction concernée, cliquez sur "..." → "Redeploy"
   - `create-yousign-signature` (prioritaire)
   - `yousign-webhook` (prioritaire)
   - `download-signed-contract`

### Option B : Redéployer via la ligne de commande (recommandé)

```bash
# Redéployer toutes les fonctions en une fois
npx supabase functions deploy
```

Ou une par une :
```bash
npx supabase functions deploy create-yousign-signature
npx supabase functions deploy yousign-webhook
npx supabase functions deploy download-signed-contract
```

⏱️ Le déploiement prend environ 30 secondes par fonction.

---

## ✅ ETAPE 5 : Tester en Production

### Test complet

1. **Ouvrir l'application** : https://parcsync.madimpact.fr
2. **Créer un contrat de test** :
   - Allez dans Contrats
   - Sélectionnez un employé
   - Cliquez sur "Envoyer en signature"
   - Remplissez les informations
   - **IMPORTANT** : Utilisez une vraie adresse email que vous pouvez consulter
3. **Vérifier l'envoi** :
   - Ouvrez la console du navigateur (F12)
   - Cherchez les logs de succès ou d'erreur
4. **Vérifier l'email** :
   - Vous devez recevoir un email de Yousign avec le lien de signature
5. **Signer le contrat** :
   - Cliquez sur le lien dans l'email
   - Signez le contrat
6. **Vérifier le webhook** :
   - Retournez sur l'application
   - Le contrat doit passer au statut "Signé"
   - Vous devez pouvoir télécharger le PDF signé

### Vérifier les logs dans Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr
2. **Menu** : Edge Functions
3. **Cliquez sur** : `create-yousign-signature`
4. **Onglet** : Logs
5. **Cherchez** :
   - ✅ Logs de succès : "Signature request created"
   - ❌ Logs d'erreur : Si vous voyez des erreurs 401/403, la clé API n'est pas bonne

### Vérifier dans la base de données

```sql
-- Voir les derniers contrats envoyés
SELECT
  id,
  statut,
  yousign_signature_request_id,
  date_envoi,
  date_signature,
  created_at
FROM contrat
WHERE yousign_signature_request_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🐛 En cas de problème

### Erreur 401 ou 403 dans les logs

**Cause** : La clé API n'est pas valide ou pas en production
**Solution** :
1. Vérifiez que la clé dans Supabase Secrets est bien `tb7LS9XfUkl7Be9kl2xAtWUDC7J9wcF6`
2. Redéployez les fonctions
3. Testez à nouveau

### Le webhook ne fonctionne pas (statut reste "en_attente_signature")

**Cause** : Le webhook n'est pas correctement configuré dans Yousign
**Solution** :
1. Allez sur Yousign Dashboard → Webhooks
2. Vérifiez l'URL : `https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook`
3. Vérifiez que les events sont bien cochés
4. Testez le webhook manuellement depuis le dashboard Yousign

### Logs du webhook

Pour voir si le webhook reçoit bien les événements :
1. **Supabase Dashboard** → Edge Functions → `yousign-webhook` → Logs
2. **Yousign Dashboard** → Webhooks → Historique des événements

---

## 📋 Checklist finale

- [ ] Fichier `.env` mis à jour avec la clé production
- [ ] Webhook configuré dans Yousign Dashboard (production)
- [ ] Variable `YOUSIGN_API_KEY` mise à jour dans Supabase Secrets
- [ ] Edge Functions redéployées
- [ ] Test d'envoi réussi
- [ ] Email de signature reçu
- [ ] Signature effectuée
- [ ] Webhook reçu et contrat mis à jour en "Signé"
- [ ] Téléchargement du PDF signé fonctionne

---

## 🎉 C'est terminé !

Une fois tous les tests réussis, Yousign est complètement en production.

Tous vos contrats seront maintenant :
- ✅ Envoyés avec des signatures légalement valides
- ✅ Traçables dans Yousign Dashboard
- ✅ Automatiquement mis à jour via webhook

---

## 📞 Support

Si vous avez des questions à chaque étape, n'hésitez pas à demander de l'aide !
