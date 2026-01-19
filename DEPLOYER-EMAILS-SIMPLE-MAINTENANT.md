# 📧 Déploiement du système d'envoi d'emails simplifié

## ✅ Ce qui a été modifié

J'ai complètement simplifié l'interface d'envoi d'emails pour la rendre intuitive :

### Avant (compliqué)
- ID template Brevo à saisir
- JSON de paramètres à écrire
- Tags à gérer
- Sélection en masse via checkboxes

### Maintenant (simple)
- Barre de recherche pour trouver les salariés par matricule/nom/prénom
- Ajout des destinataires avec des badges visuels
- Objet et message en texte libre
- Option "Tous les salariés" pour envoi groupé

## 🚀 Déploiement

### Étape 1 : Déployer la nouvelle fonction Edge

Ouvrez votre terminal et exécutez :

```bash
cd /tmp/cc-agent/59041934/project
chmod +x deploy-simple-email.sh
./deploy-simple-email.sh
```

**OU** déployez manuellement :

```bash
supabase functions deploy send-simple-email --no-verify-jwt
```

### Étape 2 : Vérifier le déploiement

La fonction devrait être disponible à :
```
https://[VOTRE_PROJECT_ID].supabase.co/functions/v1/send-simple-email
```

### Étape 3 : Tester l'interface

1. Connectez-vous à l'application
2. Allez dans **RH > Emails**
3. Vous verrez la nouvelle interface simplifiée

## 📝 Comment utiliser

### Mode 1 : Envoyer à des salariés spécifiques

1. Sélectionnez **"Sélectionner des salariés"**
2. Dans la barre de recherche, tapez :
   - Un matricule (ex: "1234")
   - Un nom (ex: "Dupont")
   - Un prénom (ex: "Jean")
3. Cliquez sur le salarié dans les résultats
4. Le salarié apparaît en badge bleu sous la barre de recherche
5. Répétez pour ajouter d'autres salariés
6. Remplissez l'objet et le message
7. Cliquez sur **"Envoyer"**

### Mode 2 : Envoyer à tous les salariés actifs

1. Sélectionnez **"Tous les salariés actifs"**
2. Remplissez l'objet et le message
3. Le compteur affiche le nombre total de destinataires
4. Cliquez sur **"Envoyer"**

## 🎨 Interface simplifiée

### Recherche intelligente
- Tape dans la barre → résultats instantanés
- Affiche : Nom, Prénom, Matricule, Email
- Maximum 10 résultats à la fois
- Clic pour ajouter

### Badges de destinataires
- Un badge par salarié sélectionné
- Croix pour retirer un destinataire
- Couleur bleue pour bien voir

### Zone de message
- Grand champ de texte (8 lignes)
- Écrivez ce que vous voulez
- Pas de formatage compliqué

### Compteur intelligent
- Affiche le nombre de destinataires en temps réel
- "1 destinataire" ou "X destinataires"

## 🔧 Fonctionnalités techniques

### Format de l'email envoyé
```html
Bonjour [Prénom] [Nom],

[Votre message]

---
Cordialement,
L'équipe MAD IMPACT
```

### Historique
- Tous les emails sont enregistrés dans `email_logs`
- Type: `crm_simple`
- Statut: `envoyé`
- Date d'envoi enregistrée

### Gestion des erreurs
- Si un email échoue, les autres continuent
- Rapport de succès/échec à la fin
- Liste des erreurs si besoin

## ✨ Avantages

1. **Plus besoin de template Brevo** - Écrivez directement
2. **Recherche rapide** - Comme pour les courriers
3. **Badges visuels** - Voyez qui recevra l'email
4. **Simple et rapide** - 3 champs à remplir
5. **Envoi groupé facile** - Un clic pour tout le monde

## 🎯 Prochaines étapes

Après le déploiement :

1. Testez avec 1 salarié d'abord
2. Vérifiez la réception de l'email
3. Regardez l'historique dans l'onglet "Historique"
4. Une fois validé, utilisez pour vos envois groupés

## 📊 Permissions

La permission `rh/emails` est déjà configurée pour votre utilisateur (ajdi@mad-impact.com).

Si vous voulez donner accès à d'autres utilisateurs :
1. Allez dans **Administration > Utilisateurs**
2. Sélectionnez l'utilisateur
3. Cochez **"Emails CRM"** dans les permissions RH
4. Sauvegardez

C'est tout ! Simple et efficace.
