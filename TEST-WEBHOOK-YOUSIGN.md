# Test du Webhook Yousign - Guide Étape par Étape

## Problème Identifié
- **Ancien clé API** : `oXoYdHHpdz3vjINZUhp97wIvsqGrjPtp`
- **Nouvelle clé API** : `BD6Dd2fYfnBKZ37Xk1HMlhoNA35jpaDt`
- **Webhook créé** : avec la nouvelle clé
- **Logs vides** : Aucun appel reçu

## Solution Appliquée

### 1. Mise à jour de la clé API
✅ `.env` mis à jour avec la nouvelle clé

### 2. URL du Webhook à Vérifier dans Yousign

**URL EXACTE À CONFIGURER** :
```
https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook
```

### 3. Configuration du Webhook dans Yousign

Vérifie dans l'interface Yousign :

1. **Environnement** : Sandbox (pour les tests)
2. **Type d'événement** : `signature_request.done`
3. **URL endpoint** : `https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook`
4. **Actif** : Oui

### 4. Test Manuel du Webhook

#### Option A : Via curl (depuis ton terminal local)

```bash
curl -X POST https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "signature_request.done",
    "data": {
      "signature_request": {
        "external_id": "TEST-ID",
        "status": "done"
      }
    }
  }'
```

#### Option B : Depuis Yousign

1. Va dans **Développeurs** > **Webhooks**
2. Clique sur ton webhook
3. Clique sur **Tester le webhook**
4. Sélectionne l'événement `signature_request.done`
5. Envoie le test

### 5. Vérifier les Logs

1. Va dans Supabase Dashboard
2. Edge Functions > yousign-webhook > Logs
3. Tu devrais voir :
   - `=== Webhook Yousign appelé ===`
   - Les détails de l'événement
   - La mise à jour du contrat

### 6. Vérifier dans la Base de Données

```sql
-- Vérifier le statut du contrat
SELECT id, statut, date_signature, yousign_signed_at
FROM contrat
WHERE id = 'ID_DU_CONTRAT';
```

## Checklist de Débogage

- [ ] URL webhook correcte dans Yousign
- [ ] Webhook actif dans Yousign
- [ ] Environnement Sandbox ou Production correspond
- [ ] Clé API mise à jour dans .env
- [ ] Test manuel du webhook fonctionne
- [ ] Logs Supabase montrent les appels
- [ ] Contrat passe de "envoyé" à "signé"

## Si Ça Ne Marche Toujours Pas

1. **Vérifie la clé API utilisée** :
   - Dans Yousign : Développeurs > Clés API
   - Compare avec celle dans .env

2. **Vérifie les permissions du webhook** :
   - Le webhook doit pouvoir recevoir les événements
   - Vérifie les paramètres de sécurité

3. **Test avec un vrai contrat** :
   - Crée un nouveau contrat
   - Envoie-le pour signature
   - Signe-le
   - Vérifie les logs immédiatement après

## Résumé des Modifications

1. ✅ Mise à jour `YOUSIGN_API_KEY` dans `.env`
2. ⏳ Vérifier URL webhook dans Yousign
3. ⏳ Tester le webhook manuellement
4. ⏳ Vérifier les logs Supabase
