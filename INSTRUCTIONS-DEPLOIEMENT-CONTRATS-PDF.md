# Déploiement du système de contrats PDF

## Vue d'ensemble

Le système permet aux salariés de recevoir leur contrat par email et de le télécharger en PDF sans se connecter à la plateforme.

## Étapes de déploiement

### 1. Créer un compte PDFShift

PDFShift est un service qui convertit du HTML en PDF de haute qualité.

1. Allez sur https://pdfshift.io/
2. Créez un compte (il y a un plan gratuit pour 250 conversions/mois)
3. Récupérez votre clé API depuis le dashboard

### 2. Configurer les secrets Supabase

Dans le dashboard Supabase :

1. Allez dans **Edge Functions** → **Secrets**
2. Ajoutez le secret suivant :
   - Nom : `PDFSHIFT_API_KEY`
   - Valeur : Votre clé API PDFShift

### 3. Déployer les edge functions

#### Option A : Via le dashboard Supabase (Recommandé)

**Fonction 1 : generate-contract-pdf**

1. Allez dans **Edge Functions**
2. Cliquez sur **Deploy a new function**
3. Nom : `generate-contract-pdf`
4. Copiez le contenu du fichier : `supabase/functions/generate-contract-pdf/index.ts`
5. Cliquez sur **Deploy**

**Fonction 2 : Mettre à jour send-contract-email**

1. Trouvez la fonction `send-contract-email` (ou `end-contract-email`)
2. Cliquez sur **Edit**
3. Remplacez le contenu par celui du fichier : `supabase/functions/send-contract-email/index.ts`
4. Cliquez sur **Deploy**

#### Option B : Via CLI Supabase (si installé)

```bash
supabase functions deploy generate-contract-pdf
supabase functions deploy send-contract-email
```

### 4. Exécuter la migration SQL

Dans le **SQL Editor** de Supabase :

1. Ouvrez le fichier `allow-anonymous-contract-access.sql`
2. Copiez tout le contenu
3. Collez-le dans le SQL Editor
4. Cliquez sur **Run**

Cette migration permet aux utilisateurs anonymes de :
- Voir les contrats
- Signer les contrats
- Uploader des documents (certificat médical)

### 5. Tester le système

1. Dans l'application, allez dans **Salariés**
2. Sélectionnez un salarié avec statut "Contrat envoyé"
3. Cliquez sur **Renvoyer le contrat**
4. Vérifiez l'email reçu
5. Cliquez sur le lien **"Télécharger le contrat (PDF)"**
   - Le PDF devrait se télécharger automatiquement
6. Cliquez sur **"Signer le contrat en ligne"**
   - La page doit s'afficher sans demander de connexion
   - Vous devez pouvoir uploader le certificat médical
   - Vous devez pouvoir signer le contrat

## Fonctionnement

### Email envoyé au salarié

L'email contient maintenant :

1. **Un bouton rouge** : "Télécharger le contrat (PDF)"
   - Télécharge directement le PDF pré-rempli
   - Pas besoin de connexion

2. **Un bouton vert** : "Signer le contrat en ligne"
   - Ouvre la page de signature
   - Pas besoin de connexion
   - Permet d'uploader le certificat médical
   - Permet de signer électroniquement

### Génération du PDF

- Le PDF est généré à la volée par la fonction `generate-contract-pdf`
- Il contient toutes les informations du contrat (poste, salaire, dates, etc.)
- Le design est professionnel avec logo et mise en page A4
- Le nom du fichier est personnalisé : `contrat-Prenom-Nom.pdf`

### Sécurité

- Les utilisateurs anonymes peuvent uniquement :
  - Voir les contrats (mais ils ont besoin du lien direct)
  - Signer les contrats
  - Uploader des documents
- Ils ne peuvent PAS :
  - Voir la liste des contrats
  - Modifier les données des contrats (sauf la signature)
  - Supprimer des contrats
  - Accéder au dashboard admin

## Dépannage

### Le PDF ne se génère pas

- Vérifiez que la clé API PDFShift est correctement configurée
- Vérifiez les logs de la fonction `generate-contract-pdf` dans Supabase
- Vérifiez que vous n'avez pas dépassé votre quota PDFShift

### "Lien invalide" sur la page de signature

- Vérifiez que l'URL contient bien `?contrat=ID_DU_CONTRAT`
- Vérifiez que la migration SQL a été exécutée (accès anonyme)

### Le certificat médical ne s'uploade pas

- Vérifiez que le bucket `documents` existe dans Storage
- Vérifiez que les policies RLS permettent l'upload anonyme
- Vérifiez la taille du fichier (max 5MB généralement)

### L'email ne s'envoie pas

- Vérifiez que `BREVO_API_KEY` est configuré
- Vérifiez les logs de la fonction `send-contract-email`
- Vérifiez que le quota Brevo n'est pas dépassé

## Coûts

- **PDFShift** : Plan gratuit jusqu'à 250 PDF/mois
- **Supabase** : Inclus dans le plan gratuit
- **Brevo** : Plan gratuit jusqu'à 300 emails/jour

## Notes importantes

1. Le PDF est généré à la volée, il n'est pas stocké
2. Chaque téléchargement génère un nouveau PDF
3. Si vous modifiez les variables du contrat, le PDF sera mis à jour automatiquement
4. Le design du PDF peut être personnalisé dans `generate-contract-pdf/index.ts`
