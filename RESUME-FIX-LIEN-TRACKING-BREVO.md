# Fix Liens Tracking Brevo - Résumé

## Problème résolu

Les liens dans les emails Brevo étaient automatiquement "wrappés" pour le tracking:
```
https://crm.tca-transport.com/onboarding?id=xxx
↓
https://baaiffgc.r.af.d.sendibt2.com/tr/cl/xWXfjX4_130W3w...
```

## Solution appliquée

Ajout de deux paramètres dans l'API Brevo:
```typescript
trackClicks: false,  // Désactive le tracking des clics
trackOpens: false,   // Désactive le tracking des ouvertures
```

## Fonction corrigée

✅ **send-onboarding-email** - Lien vers le formulaire d'onboarding

## Déploiement

### Via l'interface Supabase (Recommandé)

1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Edge Functions → **send-onboarding-email**
3. Deploy new version
4. Copier-coller le contenu de `supabase/functions/send-onboarding-email/index.ts`
5. Deploy

### Vérifier le déploiement

```bash
# Tester l'envoi d'un email
curl -X POST https://VOTRE_PROJECT.supabase.co/functions/v1/send-onboarding-email \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "candidateEmail": "test@example.com",
    "candidateName": "Test User",
    "candidateId": "uuid-test"
  }'
```

## Autres fonctions avec des liens importants

Ces fonctions envoient aussi des liens et pourraient bénéficier du même fix si nécessaire:

- **send-application-link** - Lien vers le formulaire de candidature
- **send-user-invitation** - Lien d'invitation utilisateur
- **send-demande-confirmation** - Lien de confirmation de demande

Pour les corriger, ajouter les mêmes lignes:
```typescript
subject: "...",
trackClicks: false,
trackOpens: false,
htmlContent: `...`
```

## Impact

✅ Les utilisateurs cliquent sur le lien et arrivent directement sur `crm.tca-transport.com`
✅ Pas de redirection via les serveurs Brevo
✅ URL propre dans la barre d'adresse

❌ Les statistiques de clics ne sont plus disponibles dans Brevo
❌ Les statistiques d'ouverture ne sont plus disponibles dans Brevo

## Fichiers créés

1. `DEPLOYER-FIX-LIEN-ONBOARDING.md` - Guide de déploiement
2. `RESUME-FIX-LIEN-TRACKING-BREVO.md` - Ce fichier

## Status

✅ Code modifié
⏳ Déploiement en attente (voir guide ci-dessus)
