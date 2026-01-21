# Déploiement de la fonction send-application-link

## Modification effectuée

Le lien dans l'email d'invitation à postuler a été mis à jour pour pointer vers :
```
https://crm.tca-transport.com/apply
```

## Fichier modifié

- `supabase/functions/send-application-link/index.ts`

## Déploiement manuel

Pour déployer cette fonction manuellement, utilisez la CLI Supabase :

```bash
supabase functions deploy send-application-link
```

Ou via le dashboard Supabase :
1. Allez dans "Edge Functions"
2. Sélectionnez "send-application-link"
3. Copiez le contenu du fichier `supabase/functions/send-application-link/index.ts`
4. Collez-le et déployez

## Vérification

Après le déploiement, testez en envoyant un lien de candidature. Le bouton "Postuler maintenant" dans l'email doit maintenant rediriger vers `https://crm.tca-transport.com/apply`.
