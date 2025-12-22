# 🎯 COMMENCE ICI - Guide pour Novice

## Qu'est-ce qu'on doit faire ?

On doit copier 2 fonctions sur le site de Supabase pour que ton système d'invitation fonctionne avec Brevo.

---

## 🚀 ÉTAPE 1 : Aller sur Supabase

1. **Ouvre ce lien dans ton navigateur :**
   ```
   https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/functions
   ```

2. **Connecte-toi** si on te le demande

---

## 📝 ÉTAPE 2 : Créer la première fonction

### A. Créer la fonction

1. Tu vois un bouton vert **"New Edge Function"** en haut à droite ? Clique dessus
2. Dans "Function name", écris exactement : `send-user-invitation`
3. Clique sur **"Create function"**

### B. Copier le code

1. **Sur ton ordinateur**, ouvre le fichier :
   ```
   supabase/functions/send-user-invitation/index.ts
   ```

2. **Sélectionne TOUT le texte** (Ctrl+A sur Windows, Cmd+A sur Mac)

3. **Copie** (Ctrl+C sur Windows, Cmd+C sur Mac)

4. **Retourne sur le site Supabase** dans ton navigateur

5. Dans l'éditeur de code (la grande zone blanche), **efface tout** puis **colle** ton code (Ctrl+V)

6. Clique sur le bouton vert **"Deploy"** en haut à droite

7. Attends quelques secondes, tu verras "Deployed successfully" ✅

---

## 📝 ÉTAPE 3 : Mettre à jour la deuxième fonction

### A. Trouver la fonction

1. Tu es toujours sur https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/functions

2. Dans la liste des fonctions, tu vois `admin-create-user` ? **Clique dessus**

### B. Remplacer le code

1. **Sur ton ordinateur**, ouvre le fichier :
   ```
   supabase/functions/admin-create-user/index.ts
   ```

2. **Sélectionne TOUT le texte** (Ctrl+A sur Windows, Cmd+A sur Mac)

3. **Copie** (Ctrl+C sur Windows, Cmd+C sur Mac)

4. **Retourne sur le site Supabase** dans ton navigateur

5. Dans l'éditeur de code, **efface TOUT** puis **colle** ton nouveau code (Ctrl+V)

6. Clique sur le bouton vert **"Deploy"** en haut à droite

7. Attends quelques secondes, tu verras "Deployed successfully" ✅

---

## 🎉 ÉTAPE 4 : Tester !

### A. Créer un utilisateur test

1. Va sur ton application : **https://parcsync.madimpact.fr**

2. Connecte-toi (avec admin@test.com par exemple)

3. Dans le menu, va dans **"Gestion des utilisateurs"**

4. Clique sur **"+ Ajouter un utilisateur"**

5. Remplis :
   - **Email** : mets ton email perso pour tester
   - **Nom** : Test
   - **Prénom** : Utilisateur

6. Clique sur **"Créer"**

### B. Vérifier l'email

1. **Va dans ta boîte email** (celle que tu as mise dans le formulaire)

2. Tu devrais recevoir un email de **"TCA"** avec le sujet **"Invitation à rejoindre TCA"**

3. **Ouvre l'email** et clique sur le bouton violet **"Définir mon mot de passe"**

### C. Définir ton mot de passe

1. Une page s'ouvre avec un formulaire

2. Entre ton **nouveau mot de passe** (minimum 8 caractères)

3. **Confirme** le mot de passe

4. Clique sur **"Définir le mot de passe"**

5. **BRAVO !** Tu seras automatiquement connecté et redirigé vers l'application

---

## ❓ J'ai un problème

### Je ne trouve pas les fichiers sur mon ordinateur

Les fichiers sont dans ton projet :

```
📁 ton-projet/
  📁 supabase/
    📁 functions/
      📁 send-user-invitation/
        📄 index.ts  ← Premier fichier à copier
      📁 admin-create-user/
        📄 index.ts  ← Deuxième fichier à copier
```

### L'email n'arrive pas

- Attends 2-3 minutes
- Vérifie tes **SPAMS**
- Sur le Dashboard Supabase, va dans la fonction `send-user-invitation` et clique sur "Logs" pour voir les erreurs

### Le bouton "Deploy" ne marche pas

- Vérifie que tu as bien **collé le code** dans l'éditeur
- Vérifie qu'il n'y a pas de **message d'erreur rouge** en bas de l'écran
- Attends quelques secondes et réessaye

### La page /set-password est blanche

- Vide le cache de ton navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
- Vérifie que ton application est déployée sur https://parcsync.madimpact.fr

---

## 🎯 Récap ultra-rapide

1. ✅ Créer `send-user-invitation` sur Supabase
2. ✅ Copier le code depuis `supabase/functions/send-user-invitation/index.ts`
3. ✅ Deploy
4. ✅ Modifier `admin-create-user` sur Supabase
5. ✅ Copier le code depuis `supabase/functions/admin-create-user/index.ts`
6. ✅ Deploy
7. ✅ Tester en créant un utilisateur

---

**Tu bloques quelque part ? Dis-moi à quelle étape exactement et je t'aide !**
