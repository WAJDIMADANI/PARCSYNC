# 🚀 Guide Simple - Déploiement des Invitations

## Étape 1 : Aller sur le Dashboard Supabase

1. Ouvre ton navigateur
2. Va sur : https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/functions
3. Connecte-toi si nécessaire

## Étape 2 : Déployer la fonction `send-user-invitation`

### A. Créer la fonction

1. Clique sur le bouton **"New Edge Function"** (en haut à droite)
2. Dans "Function name", écris : `send-user-invitation`
3. Clique sur **"Create function"**

### B. Copier le code

1. Ouvre le fichier : `supabase/functions/send-user-invitation/index.ts` (sur ton ordinateur)
2. **Copie TOUT le contenu** (Ctrl+A puis Ctrl+C)
3. Retourne sur le Dashboard Supabase
4. **Colle le code** dans l'éditeur (efface ce qui était là avant)
5. Clique sur **"Deploy"** (bouton vert en haut à droite)
6. Attends que ça se termine (tu verras "Deployed successfully")

## Étape 3 : Mettre à jour la fonction `admin-create-user`

### A. Ouvrir la fonction

1. Sur le Dashboard Supabase (https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/functions)
2. Clique sur **"admin-create-user"** dans la liste des fonctions

### B. Remplacer le code

1. Ouvre le fichier : `supabase/functions/admin-create-user/index.ts` (sur ton ordinateur)
2. **Copie TOUT le contenu** (Ctrl+A puis Ctrl+C)
3. Retourne sur le Dashboard Supabase
4. **Colle le code** dans l'éditeur (efface tout ce qui était là avant)
5. Clique sur **"Deploy"** (bouton vert en haut à droite)
6. Attends que ça se termine

## Étape 4 : Tester ! 🎉

1. Va sur ton application : https://parcsync.madimpact.fr
2. Connecte-toi avec ton compte admin
3. Va dans **"Gestion des utilisateurs"**
4. Clique sur **"+ Ajouter un utilisateur"**
5. Remplis les informations :
   - Email : ton email de test
   - Nom : Test
   - Prénom : Utilisateur
6. Clique sur **"Créer"**

## Étape 5 : Vérifier l'email

1. Va dans ta boîte email
2. Tu devrais recevoir un email de **TCA** (noreply@madimpact.fr)
3. Le sujet est : **"Invitation à rejoindre TCA"**
4. Clique sur le bouton **"Définir mon mot de passe"**

## Étape 6 : Définir le mot de passe

1. Tu arrives sur une page de définition de mot de passe
2. Saisis ton nouveau mot de passe (minimum 8 caractères)
3. Confirme le mot de passe
4. Clique sur **"Définir le mot de passe"**
5. Tu seras redirigé et connecté automatiquement !

---

## 🆘 En cas de problème

### L'email n'arrive pas ?
- Vérifie les **Logs** de la fonction `send-user-invitation` sur le Dashboard Supabase
- Vérifie tes spams
- Attends 2-3 minutes

### Le lien ne fonctionne pas ?
- Vérifie que tu as bien cliqué sur **"Save changes"** dans la configuration URL de Supabase (voir screenshot que tu m'as envoyé)
- Le lien expire après 24h

### La page est blanche ?
- Vérifie que ton application est bien déployée sur https://parcsync.madimpact.fr
- Essaye de vider le cache du navigateur (Ctrl+Shift+R)

---

## 📱 Où trouver les fichiers à copier ?

Les fichiers sont dans ton projet :

```
ton-projet/
├── supabase/
│   └── functions/
│       ├── send-user-invitation/
│       │   └── index.ts          ← À copier dans le Dashboard
│       └── admin-create-user/
│           └── index.ts          ← À copier dans le Dashboard
```

---

**Besoin d'aide ?** Suis les étapes une par une et dis-moi où tu bloques !
