# Guide Complet : Déployer l'Email de Refus sur Supabase

## 📋 Vue d'ensemble

Ce guide vous accompagne pas à pas pour déployer la fonction qui envoie automatiquement un email de refus aux candidats.

---

## 🎯 Méthode 1 : Via le Dashboard Supabase (RECOMMANDÉ pour débutants)

### Étape 1 : Accéder au Dashboard Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet "PARC SYNC"

### Étape 2 : Créer la fonction

1. Dans le menu de gauche, cliquez sur **"Edge Functions"**
2. Cliquez sur le bouton **"Create a new function"**
3. Donnez-lui le nom : `send-rejection-email`
4. Cliquez sur **"Create function"**

### Étape 3 : Copier le code

1. Une fois la fonction créée, vous verrez un éditeur de code
2. **Supprimez tout le code** qui s'y trouve
3. **Copiez-collez le code suivant** :

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestPayload {
  candidateEmail: string;
  candidateName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { candidateEmail, candidateName }: RequestPayload = await req.json();

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "PARC SYNC",
          email: "pierre.chopar12@gmail.com",
        },
        to: [
          {
            email: candidateEmail,
            name: candidateName,
          },
        ],
        subject: "Votre candidature chez PARC SYNC",
        htmlContent: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Votre candidature chez PARC SYNC</h1>
                </div>
                <div class="content">
                  <p>Bonjour \${candidateName},</p>

                  <p>Nous vous remercions de l'intérêt que vous portez à <strong>PARC SYNC</strong> et du temps que vous avez consacré à votre candidature.</p>

                  <p>Après un examen attentif de votre profil, nous avons le regret de vous informer que nous ne pouvons pas donner une suite favorable à votre candidature pour le moment.</p>

                  <p>Cette décision ne remet en aucun cas en cause vos compétences. Nous avons reçu de nombreuses candidatures et avons dû faire des choix difficiles.</p>

                  <p>Nous conservons votre dossier dans nos archives et n'hésiterons pas à vous recontacter si une opportunité correspondant mieux à votre profil se présentait.</p>

                  <p>Nous vous souhaitons beaucoup de succès dans vos recherches.</p>

                  <p>Cordialement,<br>
                  <strong>L'équipe PARC SYNC</strong></p>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      throw new Error(\`Brevo API error: \${brevoResponse.status} - \${errorData}\`);
    }

    const result = await brevoResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending rejection email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
```

### Étape 4 : Configurer les Secrets (Variables d'environnement)

1. Dans le menu de gauche, allez dans **"Project Settings"** (icône d'engrenage)
2. Cliquez sur **"Edge Functions"** dans le sous-menu
3. Descendez jusqu'à la section **"Secrets"**
4. Ajoutez un nouveau secret :
   - **Nom** : `BREVO_API_KEY`
   - **Valeur** : `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`
5. Cliquez sur **"Save"**

### Étape 5 : Déployer la fonction

1. Retournez dans **"Edge Functions"**
2. Sélectionnez votre fonction `send-rejection-email`
3. Cliquez sur le bouton **"Deploy"** en haut à droite
4. Attendez quelques secondes que le déploiement se termine
5. Vous verrez un message de confirmation ✅

### Étape 6 : Tester

1. Allez dans votre application PARC SYNC
2. Accédez à la liste des candidats
3. Sélectionnez un candidat
4. Changez son statut vers **"Candidature rejetée"**
5. Le candidat devrait recevoir l'email automatiquement

---

## 🖥️ Méthode 2 : Via le Terminal (pour utilisateurs avancés)

### Prérequis

1. **Node.js** installé sur votre ordinateur
2. **Terminal** ouvert dans le dossier de votre projet

### Étape 1 : Installer Supabase CLI

Ouvrez un terminal et exécutez :

```bash
npm install -g supabase
```

### Étape 2 : Se connecter à Supabase

```bash
npx supabase login
```

Cela ouvrira votre navigateur pour vous authentifier.

### Étape 3 : Lier votre projet

```bash
npx supabase link --project-ref jnlvinwekqvkrywxrjgr
```

(Remplacez `jnlvinwekqvkrywxrjgr` par votre ID de projet si différent)

### Étape 4 : Configurer le secret Brevo

```bash
npx supabase secrets set BREVO_API_KEY=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
```

### Étape 5 : Déployer la fonction

```bash
npx supabase functions deploy send-rejection-email
```

### Étape 6 : Vérifier le déploiement

```bash
npx supabase functions list
```

Vous devriez voir `send-rejection-email` dans la liste.

---

## ✅ Vérification que tout fonctionne

### Test manuel avec curl (optionnel)

Vous pouvez tester la fonction directement avec cette commande :

```bash
curl -X POST 'https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/send-rejection-email' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubHZpbndla3F2a3J5d3hyamdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzQ5MzgsImV4cCI6MjA3NjcxMDkzOH0.JGMxIxnd_J0gV5A1JSXUH02AalvNBbcwJB0PmRvopmU' \
  -H 'Content-Type: application/json' \
  -d '{
    "candidateEmail": "votre-email@test.com",
    "candidateName": "Test Candidat"
  }'
```

Remplacez `votre-email@test.com` par votre propre email pour recevoir un test.

---

## 🆘 Problèmes courants

### Erreur : "BREVO_API_KEY not configured"

**Solution** : Vous avez oublié de configurer le secret. Retournez à l'étape 4 de la méthode 1 ou l'étape 4 de la méthode 2.

### Erreur : "Failed to fetch"

**Solution** : La fonction n'est pas encore déployée. Recommencez l'étape 5.

### Erreur : "Brevo API error: 401"

**Solution** : La clé API Brevo est incorrecte ou expirée. Vérifiez votre clé dans votre compte Brevo.

### Je ne reçois pas l'email

**Vérifications** :
1. Regardez dans vos **spams**
2. Vérifiez que l'email du candidat est correct
3. Vérifiez les logs de la fonction dans Supabase Dashboard → Edge Functions → send-rejection-email → Logs

---

## 📧 Contenu de l'email envoyé

Quand un candidat est rejeté, il reçoit :

**Sujet** : "Votre candidature chez PARC SYNC"

**Contenu** :
- Remerciements pour l'intérêt porté
- Information du refus (formulé avec courtoisie)
- Mention que le refus ne remet pas en cause les compétences
- Conservation du dossier pour futures opportunités
- Souhaits de succès dans les recherches

---

## 📞 Besoin d'aide ?

Si vous rencontrez des difficultés :

1. Vérifiez les logs dans le Dashboard Supabase
2. Consultez la documentation Supabase : [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
3. Vérifiez que votre clé API Brevo est valide

---

## ✨ C'est terminé !

Une fois la fonction déployée, les emails de refus seront envoyés automatiquement à chaque fois que vous sélectionnez "Candidature rejetée" pour un candidat.
