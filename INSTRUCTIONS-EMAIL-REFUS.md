# Instructions pour déployer l'email de refus automatique

## Fonctionnalité implémentée

Quand vous changez le statut d'un candidat à **"Candidature rejetée"**, un email de refus professionnel est automatiquement envoyé au candidat avec une popup de confirmation qui apparaît au centre de l'écran indiquant : **"Email de refus envoyé avec succès"**.

## Déploiement de l'Edge Function

L'Edge Function `send-rejection-email` a été créée dans le dossier `supabase/functions/send-rejection-email/`.

### Pour déployer l'Edge Function sur Supabase :

1. Ouvrez le [Dashboard Supabase](https://supabase.com/dashboard)
2. Allez dans **Edge Functions**
3. Cliquez sur **Deploy new function**
4. Nommez-la : `send-rejection-email`
5. Copiez le contenu du fichier `supabase/functions/send-rejection-email/index.ts`
6. Collez-le dans l'éditeur
7. Cliquez sur **Deploy**

**OU** utilisez la CLI Supabase :

```bash
supabase functions deploy send-rejection-email
```

## Configuration requise

Assurez-vous que la variable d'environnement `BREVO_API_KEY` est configurée dans votre projet Supabase (comme pour l'email d'onboarding).

## Comment ça fonctionne

1. Dans la liste des candidats, vous avez maintenant un nouveau statut : **"Candidature rejetée"**
2. Quand vous sélectionnez ce statut pour un candidat :
   - Le statut est mis à jour dans la base de données
   - Un email de refus professionnel est automatiquement envoyé au candidat
   - Une popup centrée apparaît avec le message : "Email de refus envoyé avec succès à [Nom Prénom]"
3. L'email de refus contient :
   - Un message courtois et professionnel
   - Des remerciements pour l'intérêt porté
   - Une explication polie du refus
   - Une note positive pour le futur

## Template de l'email

L'email envoyé est professionnel et bienveillant :
- Sujet : "Votre candidature chez PARC SYNC"
- Contenu : Message de refus poli et encourageant
- Design : Email HTML responsive avec les couleurs de PARC SYNC

## Récapitulatif des modifications

### Fichiers créés :
- `supabase/functions/send-rejection-email/index.ts` - Edge Function pour envoyer l'email

### Fichiers modifiés :
- `src/components/CandidateList.tsx` :
  - Ajout du statut "Candidature rejetée" dans la liste des statuts
  - Ajout de la fonction `sendRejectionEmail()`
  - Modification de `handleStatutChange()` pour détecter le statut "candidature_rejetee" et envoyer l'email automatiquement
  - La popup de confirmation existante affiche le message de succès

## Test

Pour tester la fonctionnalité :
1. Allez dans la liste des candidats
2. Sélectionnez un candidat
3. Changez son statut à "Candidature rejetée"
4. Une popup apparaîtra confirmant l'envoi de l'email
5. Vérifiez que l'email a bien été reçu

**Note** : Assurez-vous d'avoir déployé l'Edge Function avant de tester !
