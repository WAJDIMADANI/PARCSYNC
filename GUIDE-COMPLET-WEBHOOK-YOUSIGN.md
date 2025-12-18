# Guide Complet - Résolution Webhook Yousign

## 🎯 Objectif
Faire en sorte que le statut des contrats passe automatiquement de "envoyé" à "signé" quand ils sont signés dans Yousign.

## ✅ Modifications Effectuées

### 1. Mise à jour de la clé API
- **Ancienne clé** : `oXoYdHHpdz3vjINZUhp97wIvsqGrjPtp`
- **Nouvelle clé** : `BD6Dd2fYfnBKZ37Xk1HMlhoNA35jpaDt`
- **Fichier modifié** : `.env`

Les deux variables utilisent maintenant la même clé :
```env
YOUSIGN_API_KEY=BD6Dd2fYfnBKZ37Xk1HMlhoNA35jpaDt
VITE_YOUSIGN_API_KEY=BD6Dd2fYfnBKZ37Xk1HMlhoNA35jpaDt
```

## 📋 Étapes à Suivre Maintenant

### ÉTAPE 1 : Vérifier la Configuration Yousign

1. **Connecte-toi à Yousign** : https://yousign.app
2. **Va dans Développeurs** > **Webhooks**
3. **Vérifie ton webhook** :
   - ✅ **URL exacte** : `https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook`
   - ✅ **Événement** : `signature_request.done`
   - ✅ **Environnement** : Sandbox (ou Production selon tes besoins)
   - ✅ **Statut** : Actif

4. **Si l'URL est différente** :
   - Clique sur le webhook
   - Modifie l'URL endpoint
   - Enregistre

### ÉTAPE 2 : Tester le Webhook Manuellement

**Option A : Test depuis Yousign**

1. Dans Yousign, clique sur ton webhook
2. Clique sur **"Tester le webhook"**
3. Sélectionne l'événement `signature_request.done`
4. Clique sur **"Envoyer le test"**

**Option B : Test avec curl**

```bash
./test-webhook-yousign.sh
```

Ou manuellement :

```bash
curl -X POST https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "signature_request.done",
    "data": {
      "signature_request": {
        "external_id": "ID_DTON_CONTRAT",
        "status": "done"
      }
    }
  }'
```

### ÉTAPE 3 : Vérifier les Logs Supabase

1. **Ouvre Supabase Dashboard**
2. **Va dans Edge Functions** > **yousign-webhook** > **Logs**
3. **Cherche les logs** :
   - `=== Webhook Yousign appelé ===`
   - Les détails de l'événement
   - `Contrat mis à jour avec succès`

**Si les logs sont vides** :
- Le webhook n'a pas été appelé
- Vérifie l'URL dans Yousign
- Vérifie que le webhook est actif

### ÉTAPE 4 : Diagnostiquer les Contrats

**Exécute ce SQL dans Supabase** :

```sql
-- Voir les contrats en attente de signature
SELECT
  c.id,
  c.statut,
  p.nom,
  p.prenom,
  c.created_at
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
WHERE c.statut = 'envoye'
ORDER BY c.created_at DESC;
```

**Ou utilise le fichier complet** :
- Ouvre `DIAGNOSTIC-WEBHOOK-CONTRATS.sql` dans Supabase SQL Editor
- Exécute chaque requête une par une

### ÉTAPE 5 : Tester avec un Vrai Contrat

1. **Trouve un contrat test** :
   ```sql
   SELECT id, statut FROM contrat WHERE profil_id = (
     SELECT id FROM profil WHERE prenom = 'WAJDI'
   ) ORDER BY created_at DESC LIMIT 1;
   ```

2. **Note l'ID du contrat**

3. **Teste le webhook avec cet ID** :
   - Modifie `test-webhook-yousign.sh`
   - Remplace `TEST-ID` par l'ID réel
   - Exécute `./test-webhook-yousign.sh`

4. **Vérifie le statut** :
   ```sql
   SELECT id, statut, date_signature, yousign_signed_at
   FROM contrat
   WHERE id = 'TON_ID_ICI';
   ```

### ÉTAPE 6 : Si Ça Ne Fonctionne Toujours Pas

#### Problème : URL Webhook Incorrecte
**Solution** : Vérifie que l'URL dans Yousign est exactement :
```
https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook
```

#### Problème : Mauvaise Clé API
**Solution** :
1. Va dans Yousign > Développeurs > Clés API
2. Vérifie que tu utilises bien : `BD6Dd2fYfnBKZ37Xk1HMlhoNA35jpaDt`
3. Vérifie que cette clé correspond à l'environnement (Sandbox/Production)

#### Problème : Webhook Non Actif
**Solution** :
1. Dans Yousign, va dans Webhooks
2. Clique sur ton webhook
3. Active-le si nécessaire

#### Problème : Fonction Non Déployée
**Solution** :
```bash
# Vérifie que la fonction existe
curl https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook

# Devrait retourner : {"ok":true,"message":"Webhook ready"}
```

### ÉTAPE 7 : Forcer le Statut (Dernier Recours)

**⚠️ SEULEMENT si le webhook ne fonctionne pas et que le contrat est vraiment signé**

```sql
-- Forcer le statut pour WAJDI
UPDATE contrat
SET
  statut = 'signe',
  date_signature = NOW(),
  yousign_signed_at = NOW(),
  updated_at = NOW()
WHERE profil_id IN (
  SELECT id FROM profil WHERE prenom = 'WAJDI' AND nom = 'MADANI'
)
AND statut = 'envoye';
```

## 🔍 Checklist Complète

- [ ] Clé API mise à jour dans `.env`
- [ ] URL webhook correcte dans Yousign
- [ ] Webhook actif dans Yousign
- [ ] Test manuel du webhook réussi
- [ ] Logs Supabase montrent les appels
- [ ] Test avec un vrai contrat fonctionne
- [ ] Statut passe de "envoyé" à "signé"

## 📞 Si Tu Es Bloqué

**Donne-moi ces informations** :

1. **Résultat du test manuel** :
   ```bash
   ./test-webhook-yousign.sh
   ```

2. **Logs Supabase** :
   - Copie les derniers logs de yousign-webhook

3. **État du contrat** :
   ```sql
   SELECT id, statut, yousign_signature_request_id
   FROM contrat
   WHERE profil_id = (SELECT id FROM profil WHERE prenom = 'WAJDI')
   ORDER BY created_at DESC LIMIT 1;
   ```

## 📚 Fichiers Créés

- `TEST-WEBHOOK-YOUSIGN.md` - Guide de test
- `DIAGNOSTIC-WEBHOOK-CONTRATS.sql` - Requêtes de diagnostic
- `test-webhook-yousign.sh` - Script de test automatique
- `GUIDE-COMPLET-WEBHOOK-YOUSIGN.md` - Ce guide
