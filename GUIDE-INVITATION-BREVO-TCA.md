# 🎯 Système d'Invitation Utilisateur via Brevo avec TCA

## ✅ Ce qui a été fait

### 1. **Nouvelle Edge Function : `send-user-invitation`**
- Envoie les emails d'invitation via **Brevo** (pas Supabase)
- Utilise le nom **"TCA"** dans les emails
- Design professionnel avec gradient violet
- Template HTML responsive

### 2. **Mise à jour : `admin-create-user`**
- Ne utilise plus `inviteUserByEmail` de Supabase
- Crée l'utilisateur avec un mot de passe temporaire aléatoire
- Génère un lien de récupération de mot de passe
- Envoie l'email via la fonction `send-user-invitation`

### 3. **Page Frontend : `/set-password`**
- Permet à l'utilisateur de définir son mot de passe
- Design cohérent avec l'application
- Redirection automatique après succès

---

## 🚀 Déploiement

### Option 1 : Via le script (Recommandé)

```bash
chmod +x deploy-invitation-system.sh
./deploy-invitation-system.sh
```

### Option 2 : Commandes manuelles

```bash
# 1. Se connecter
npx supabase login

# 2. Lier le projet
npx supabase link --project-ref jnlvinwekqvkrywxrjgr

# 3. Déployer les fonctions
npx supabase functions deploy send-user-invitation
npx supabase functions deploy admin-create-user
```

### Option 3 : Via le Dashboard Supabase

1. Va sur https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/functions
2. Crée/édite `send-user-invitation` avec le contenu de `supabase/functions/send-user-invitation/index.ts`
3. Mets à jour `admin-create-user` avec le contenu de `supabase/functions/admin-create-user/index.ts`

---

## 📧 Contenu de l'Email

L'email envoyé contient :

**Expéditeur :** TCA (noreply@madimpact.fr)
**Sujet :** Invitation à rejoindre TCA

**Contenu :**
- Design avec gradient violet/indigo
- Message personnalisé avec le nom et prénom
- Bouton "Définir mon mot de passe" qui redirige vers `/set-password`
- Indication que le lien expire dans 24h
- Signature de "L'équipe TCA"

---

## 🧪 Tester le système

### 1. Créer un utilisateur
- Va dans l'interface admin
- Clique sur "Gestion des utilisateurs"
- Crée un nouvel utilisateur

### 2. Vérifier l'email
- L'email doit arriver via Brevo
- L'expéditeur doit être "TCA"
- Le lien doit pointer vers `https://parcsync.madimpact.fr/set-password`

### 3. Définir le mot de passe
- Clique sur le lien dans l'email
- Tu arrives sur la page de définition du mot de passe
- Saisis ton nouveau mot de passe (min. 8 caractères)
- Confirme le mot de passe
- Tu es redirigé vers l'application et connecté automatiquement

---

## 🔧 Configuration requise

### Variables d'environnement (déjà configurées)

```env
BREVO_API_KEY=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
VITE_APP_URL=https://parcsync.madimpact.fr
```

### URL de redirection Supabase (déjà configurée)

Dans Dashboard Supabase → Authentication → URL Configuration :
- **Site URL:** `https://parcsync.madimpact.fr`
- **Redirect URLs:**
  - `https://parcsync.madimpact.fr/**`
  - `http://localhost:3000/**`

---

## 📝 Personnaliser l'email

Pour modifier le contenu de l'email, édite le fichier :
```
supabase/functions/send-user-invitation/index.ts
```

Puis redéploie la fonction :
```bash
npx supabase functions deploy send-user-invitation
```

---

## 🐛 Dépannage

### L'email n'arrive pas
1. Vérifie les logs de la fonction : Dashboard Supabase → Edge Functions → send-user-invitation → Logs
2. Vérifie que la clé API Brevo est correcte
3. Vérifie les quotas Brevo

### Le lien ne fonctionne pas
1. Vérifie que les Redirect URLs sont correctes dans Supabase
2. Vérifie que la page `/set-password` est accessible
3. Le lien expire après 24h

### L'utilisateur n'est pas créé
1. Vérifie les logs de admin-create-user
2. Vérifie que l'email n'existe pas déjà
3. Vérifie les permissions RLS sur `app_utilisateur`

---

## ✨ Avantages de cette solution

✅ Emails personnalisés avec votre marque (TCA)
✅ Contrôle total du design de l'email
✅ Pas de spam avec les emails Supabase
✅ Statistiques d'envoi via Brevo
✅ Lien sécurisé qui expire après 24h
✅ Expérience utilisateur fluide

---

## 🎨 Preview de l'email

L'email a un design moderne avec :
- Header violet avec emoji 🎉
- Message personnalisé
- Bouton CTA avec gradient
- Encadré d'information sur l'expiration
- Footer avec signature TCA
- Responsive (mobile + desktop)

---

**📞 Support**

Si tu rencontres des problèmes, vérifie les logs des Edge Functions dans le Dashboard Supabase.
