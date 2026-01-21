# Déploiement de la fonction send-onboarding-email

## Modification effectuée

Le lien dans l'email d'onboarding a été mis à jour pour pointer vers :
```
https://crm.tca-transport.com/onboarding?id=${candidateId}
```

## Fichiers modifiés

- `supabase/functions/send-onboarding-email/index.ts`
- `supabase/functions/send-application-link/index.ts` (déjà modifié pour apply)

## Déploiement manuel requis

L'outil de déploiement automatique rencontre un problème. Déployez manuellement via CLI Supabase :

```bash
# Déployer la fonction onboarding
supabase functions deploy send-onboarding-email

# Déployer aussi la fonction application (si pas encore fait)
supabase functions deploy send-application-link
```

Ou via le dashboard Supabase :
1. Allez dans "Edge Functions"
2. Sélectionnez "send-onboarding-email"
3. Cliquez sur "Deploy new version"
4. Le code sera synchronisé automatiquement

## Vérification

Après le déploiement, testez en envoyant un email d'onboarding. Le bouton "Compléter mon dossier" doit rediriger vers `https://crm.tca-transport.com/onboarding?id=...`
