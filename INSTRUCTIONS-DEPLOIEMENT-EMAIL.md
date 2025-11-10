# 🚀 Instructions de déploiement de l'automatisation d'emails

## ✅ Ce qui est déjà fait dans le code

1. **Clé API Brevo** ajoutée dans `.env`
2. **Edge Function** créée dans `supabase/functions/send-onboarding-email/`
3. **Code frontend** qui détecte le changement de statut et envoie l'email
4. **Script SQL** préparé pour tracer les emails envoyés

---

## 📋 Ce que VOUS devez faire maintenant

### Étape 1 : Déployer l'Edge Function dans Supabase

Vous devez déployer manuellement l'Edge Function sur votre compte Supabase.

**Via le Dashboard Supabase :**

1. Connectez-vous à https://supabase.com/dashboard
2. Sélectionnez votre projet `jnlvinwekqvkrywxrjgr`
3. Allez dans **Edge Functions** (menu de gauche)
4. Cliquez sur **"Create a new function"**
5. Nom de la fonction : `send-onboarding-email`
6. Copiez-collez le contenu du fichier `supabase/functions/send-onboarding-email/index.ts`
7. Cliquez sur **"Deploy"**

**Ou via Supabase CLI (si installé) :**

```bash
# Installez Supabase CLI si nécessaire
npm install -g supabase

# Liez votre projet
supabase link --project-ref jnlvinwekqvkrywxrjgr

# Déployez la fonction
supabase functions deploy send-onboarding-email
```

---

### Étape 2 : Configurer les variables d'environnement dans Supabase

1. Dans le Dashboard Supabase, allez dans **Settings** > **Edge Functions** > **Environment Variables**
2. Ajoutez la variable :
   - **Nom** : `BREVO_API_KEY`
   - **Valeur** : `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`
3. Ajoutez aussi (optionnel mais recommandé) :
   - **Nom** : `APP_URL`
   - **Valeur** : L'URL de votre application (ex: `https://votre-app.com` ou en local `http://localhost:5173`)

---

### Étape 3 : Exécuter le script SQL (optionnel - pour tracer les emails)

1. Dans le Dashboard Supabase, allez dans **SQL Editor**
2. Cliquez sur **"New query"**
3. Copiez-collez le contenu du fichier `setup-email-automation.sql`
4. Cliquez sur **"Run"**

Cela créera une table `onboarding_emails` pour garder une trace de tous les emails envoyés.

---

## 🎯 Comment ça marche maintenant ?

### Workflow automatique :

1. **Vous changez le statut d'un candidat à "À embaucher"**
   - Via le menu déroulant dans la liste des candidats
   - Ou en cliquant sur la flèche pour avancer d'une étape

2. **L'application envoie automatiquement un email** via Brevo
   - Email expéditeur : pierre.chopar12@gmail.com
   - Nom expéditeur : PARC SYNC
   - Destinataire : l'email du candidat
   - Contenu : Email professionnel avec lien vers le formulaire d'onboarding

3. **Le candidat reçoit l'email** avec :
   - Message de bienvenue
   - Lien direct vers le formulaire `/onboarding?id=XXX`
   - Liste des documents à préparer
   - Design professionnel avec vos couleurs

4. **Le candidat clique sur le lien** et remplit le formulaire d'embauche

---

## 🧪 Comment tester ?

1. **Après avoir déployé l'Edge Function** (Étape 1 et 2)
2. Allez dans votre liste de candidats
3. Prenez un candidat en statut "Entretien"
4. Changez son statut à "À embaucher"
5. Vérifiez la boîte mail du candidat (ou la vôtre si vous testez avec votre email)
6. Vous devriez recevoir l'email automatiquement !

---

## ⚠️ Important

- **Ne partagez JAMAIS votre clé API Brevo** publiquement
- La clé dans `.env` est pour le développement local uniquement
- La vraie clé doit être dans les variables d'environnement de Supabase
- L'email expéditeur (pierre.chopar12@gmail.com) doit être **vérifié dans Brevo**

---

## 🐛 En cas de problème

### L'email ne part pas ?

1. Vérifiez que la fonction est bien déployée dans Supabase
2. Vérifiez que `BREVO_API_KEY` est configurée dans les variables d'environnement
3. Vérifiez les logs dans **Edge Functions** > **Logs** dans le Dashboard Supabase
4. Vérifiez que l'email expéditeur est vérifié dans Brevo

### Comment voir les logs ?

Dans le Dashboard Supabase :
1. Allez dans **Edge Functions**
2. Cliquez sur `send-onboarding-email`
3. Onglet **Logs**

---

## 🎉 Une fois que ça marche

Vous aurez un workflow 100% automatisé :
- Changement de statut → Email automatique
- Pas besoin de copier-coller les liens
- Pas besoin d'envoyer les emails manuellement
- Gain de temps énorme !

---

**Besoin d'aide ?** Relisez les étapes 1 et 2, ce sont les plus importantes !
