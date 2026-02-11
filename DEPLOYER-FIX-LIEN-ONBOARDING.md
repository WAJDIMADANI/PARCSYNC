# Fix Lien Onboarding - Désactiver le tracking Brevo

## Problème identifié

Brevo wrappe automatiquement tous les liens dans les emails pour tracker les clics. Cela transforme:
```
https://crm.tca-transport.com/onboarding?id=xxx
```

En:
```
https://baaiffgc.r.af.d.sendibt2.com/tr/cl/xWXfjX4_130W3w...
```

## Solution appliquée

J'ai ajouté deux paramètres dans la requête API Brevo:
- `trackClicks: false` - Désactive le tracking des clics
- `trackOpens: false` - Désactive le tracking des ouvertures

## Déploiement

### Option 1: Via l'interface Supabase (Recommandé)

1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Aller dans **Edge Functions**
4. Cliquer sur **send-onboarding-email**
5. Cliquer sur **Deploy new version**
6. Copier-coller le contenu du fichier `supabase/functions/send-onboarding-email/index.ts`
7. Cliquer sur **Deploy**

### Option 2: Via Supabase CLI

```bash
# Se connecter à Supabase
npx supabase login

# Déployer la fonction
npx supabase functions deploy send-onboarding-email --no-verify-jwt
```

## Fichier modifié

**Fichier**: `supabase/functions/send-onboarding-email/index.ts`

**Changement** (ligne 52-53):
```typescript
subject: "Bienvenue chez TRANSPORT CLASSE AFFAIRE - Complétez votre dossier d'embauche",
trackClicks: false,    // ← AJOUTÉ
trackOpens: false,     // ← AJOUTÉ
htmlContent: `
```

## Test après déploiement

1. Créer un nouveau candidat dans le vivier
2. Lui envoyer l'email d'onboarding
3. Recevoir l'email
4. Cliquer sur le bouton "Compléter mon dossier"
5. Vérifier que l'URL dans la barre d'adresse est bien:
   ```
   https://crm.tca-transport.com/onboarding?id=xxx
   ```
   Et NON:
   ```
   https://baaiffgc.r.af.d.sendibt2.com/tr/cl/...
   ```

## Notes

- Le lien sera maintenant direct sans tracking
- Les statistiques d'ouverture et de clic ne seront plus disponibles dans Brevo
- Si vous voulez réactiver le tracking plus tard, enlevez simplement `trackClicks: false` et `trackOpens: false`

## Contenu du fichier à déployer

Le fichier complet est disponible dans:
`supabase/functions/send-onboarding-email/index.ts`
