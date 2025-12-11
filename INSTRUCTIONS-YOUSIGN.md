# Instructions d'intégration Yousign

## Étape 1 : Exécuter la migration SQL

Exécute le fichier `add-yousign-integration.sql` dans ta base de données Supabase pour ajouter les colonnes nécessaires.

## Étape 2 : Configurer les webhooks Yousign

1. Va sur ton dashboard Yousign : https://yousign.app/auth/workspace/integrations/webhooks
2. Clique sur "Add webhook"
3. Configure :
   - **URL** : `https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook`
   - **Events à sélectionner** :
     - `signature_request.done` (Tous les signataires ont signé)
     - `signature_request.declined` (Signature refusée)
     - `signature_request.expired` (Demande expirée)
     - `signer.signed` (Un signataire a signé)
   - **Environment** : Sandbox (pour les tests)

## Étape 3 : Déployer les Edge Functions

Tu dois déployer les deux nouvelles fonctions :

1. `create-yousign-signature` - Crée la demande de signature
2. `yousign-webhook` - Reçoit les notifications de Yousign

**Important** : Configure la variable d'environnement `YOUSIGN_API_KEY` dans Supabase.

## Étape 4 : Tester l'intégration

1. Envoie un contrat à un employé depuis l'interface
2. L'employé recevra un email de Yousign avec le lien de signature
3. Après signature, le webhook mettra à jour automatiquement :
   - Le statut du contrat → `signe`
   - Le statut du profil → `contrat_signe`
   - La date de signature
   - L'URL du document signé
   - **NOUVEAU** : Création automatique de notification ou incident selon la date d'expiration

## ✨ Nouvelles Fonctionnalités : Notifications Automatiques

À partir de maintenant, le webhook Yousign génère automatiquement des notifications ou incidents pour :
- **CDD** (Contrats à Durée Déterminée)
- **Avenant 1**
- **Avenant 2**

### Gestion Intelligente des Dates
Pour les avenants, le système consulte automatiquement **deux sources** de dates et prend la plus récente :
- `contrat.variables.date_fin`
- `profil.avenant_1_date_fin` ou `profil.avenant_2_date_fin`

### Trois Scénarios Automatiques
- **Contrat > 30 jours** : Notification créée à J-30
- **Contrat 1-30 jours** : Notification urgente immédiate
- **Contrat expiré** : Incident créé automatiquement

📖 **Documentation complète** : Voir `WEBHOOK-NOTIFICATIONS-AUTO.md`

## Flux complet

```
1. RH envoie le contrat
   ↓
2. Système crée le contrat dans la BDD
   ↓
3. Appel à create-yousign-signature
   ↓
4. Yousign génère le PDF et envoie l'email
   ↓
5. Employé reçoit l'email et clique sur le lien
   ↓
6. Employé signe électroniquement
   ↓
7. Yousign appelle le webhook
   ↓
8. Système met à jour le contrat (statut = signé)
   ↓
9. Document signé disponible via yousign_document_url
   ↓
10. ✨ NOUVEAU : Si CDD ou Avenant, création automatique notification/incident
   ↓
11. RH voit l'alerte dans l'interface (onglet Notifications ou Incidents)
```

## Nouveaux statuts des contrats

- `envoye` → Initial (créé dans la BDD)
- `en_attente_signature` → Envoyé à Yousign
- `signe` → Signé électroniquement
- `refuse` → Signature refusée
- `expire` → Demande expirée

## Passer en Production

Quand tu es prêt à passer en production :

1. Dans ton compte Yousign, va dans Settings → API
2. Change l'environnement de "Sandbox" à "Production"
3. Crée une nouvelle clé API Production
4. Mets à jour `YOUSIGN_API_KEY` dans les variables d'environnement Supabase
5. Reconfigure le webhook avec l'environnement "Production"
6. Dans les Edge Functions, remplace `api-sandbox.yousign.app` par `api.yousign.app`

## Documentation API Yousign

- Documentation v3 : https://developers.yousign.com/docs
- Guide signature électronique : https://developers.yousign.com/docs/guides/electronic-signature
- Webhooks : https://developers.yousign.com/docs/guides/webhooks
