# Déploiement Fix Tracking Brevo - Tous les emails de documents

## Problème résolu

Tous les liens dans les emails de rappel de documents sont maintenant directs, sans redirection Brevo.

## Fonctions corrigées

✅ **send-onboarding-email** - Email d'onboarding initial
✅ **send-missing-documents-reminder** - Rappel documents manquants (avec token)
✅ **send-all-missing-documents-reminder** - Rappel tous documents manquants
✅ **send-documents-reminder** - Rappel documents génériques

## Changement appliqué

Dans chaque fonction, ajout de:
```typescript
trackClicks: false,
trackOpens: false,
```

## Déploiement via l'interface Supabase

### 1. send-onboarding-email
1. Dashboard → Edge Functions → **send-onboarding-email**
2. Deploy new version
3. Copier le contenu de `supabase/functions/send-onboarding-email/index.ts`
4. Deploy

### 2. send-missing-documents-reminder
1. Dashboard → Edge Functions → **send-missing-documents-reminder**
2. Deploy new version
3. Copier le contenu de `supabase/functions/send-missing-documents-reminder/index.ts`
4. Deploy

### 3. send-all-missing-documents-reminder
1. Dashboard → Edge Functions → **send-all-missing-documents-reminder**
2. Deploy new version
3. Copier le contenu de `supabase/functions/send-all-missing-documents-reminder/index.ts`
4. Deploy

### 4. send-documents-reminder
1. Dashboard → Edge Functions → **send-documents-reminder**
2. Deploy new version
3. Copier le contenu de `supabase/functions/send-documents-reminder/index.ts`
4. Deploy

## Déploiement via CLI (Alternative)

```bash
# Se connecter
npx supabase login

# Déployer toutes les fonctions
npx supabase functions deploy send-onboarding-email --no-verify-jwt
npx supabase functions deploy send-missing-documents-reminder --no-verify-jwt
npx supabase functions deploy send-all-missing-documents-reminder --no-verify-jwt
npx supabase functions deploy send-documents-reminder --no-verify-jwt
```

## Test après déploiement

1. Envoyer un email de rappel de documents depuis l'interface
2. Recevoir l'email
3. Cliquer sur "Télécharger mes documents"
4. Vérifier que l'URL est directe:
   ```
   ✅ https://crm.tca-transport.com/upload-all-documents?profil=xxx&token=xxx
   ❌ https://baaiffgc.r.bh.d.sendibt3.com/tr/cl/...
   ```

## Impact

### Avantages
- URL propre et directe dans la barre d'adresse
- Pas de redirection via les serveurs Brevo
- Meilleure expérience utilisateur
- Plus professionnel

### Inconvénients
- Les statistiques de clics Brevo ne seront plus disponibles
- Les statistiques d'ouverture ne seront plus disponibles

## Fichiers modifiés

1. `supabase/functions/send-onboarding-email/index.ts` (ligne 52-53)
2. `supabase/functions/send-missing-documents-reminder/index.ts` (ligne 118-119)
3. `supabase/functions/send-all-missing-documents-reminder/index.ts` (ligne 69-70)
4. `supabase/functions/send-documents-reminder/index.ts` (ligne 159-160)

## Status

✅ Code modifié et build réussi
⏳ Déploiement en attente (voir guide ci-dessus)
