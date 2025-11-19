# Déploiement de l'Edge Function send-rejection-email

## Problème actuel

L'erreur "Erreur lors de l'envoi de l'email de refus" apparaît car l'edge function `send-rejection-email` n'est pas encore déployée sur Supabase.

## Solution

### Étape 1 : Déployer l'edge function

Ouvrez un terminal et exécutez la commande suivante :

```bash
npx supabase functions deploy send-rejection-email
```

### Étape 2 : Vérifier le déploiement

Après le déploiement, vous pouvez vérifier que la fonction est bien déployée :

```bash
npx supabase functions list
```

Vous devriez voir `send-rejection-email` dans la liste.

### Étape 3 : Tester à nouveau

1. Allez dans l'interface Candidats
2. Sélectionnez un candidat
3. Changez son statut vers "Candidature rejetée"
4. Le candidat devrait recevoir l'email de refus

## Vérification des variables d'environnement

La variable `BREVO_API_KEY` est déjà configurée dans votre projet :
- ✅ BREVO_API_KEY configurée dans .env
- ✅ Cette clé sera automatiquement disponible dans l'edge function

## Contenu de l'email

L'email envoyé est professionnel et courtois :
- Remerciements pour l'intérêt porté
- Information du refus de la candidature
- Mention que cela ne remet pas en cause les compétences
- Conservation du dossier pour futures opportunités
- Souhaits de succès

## En cas d'erreur persistante

Si après le déploiement l'erreur persiste :

1. Vérifiez les logs de la fonction :
```bash
npx supabase functions logs send-rejection-email
```

2. Testez la fonction directement avec curl :
```bash
curl -X POST 'https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/send-rejection-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "candidateEmail": "test@example.com",
    "candidateName": "Test User"
  }'
```

3. Vérifiez que la clé Brevo est bien configurée dans le dashboard Supabase (Secrets)
