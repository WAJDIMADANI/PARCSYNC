# 🔑 Guide Simple - Création d'utilisateur avec Mot de Passe

## Ce qui a changé

Maintenant, quand tu crées un utilisateur, tu définis **directement son mot de passe**. Plus besoin d'email d'invitation !

---

## 📋 CE QUE TU DOIS FAIRE (2 étapes)

### **ÉTAPE 1 : Mettre à jour la fonction Edge**

1. Va sur : https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/functions

2. Clique sur **`admin-create-user`** dans la liste

3. **Copie** le contenu du fichier : `supabase/functions/admin-create-user/index.ts`
   - Ouvre le fichier sur ton PC
   - Sélectionne tout (Ctrl+A)
   - Copie (Ctrl+C)

4. **Colle** dans l'éditeur Supabase
   - Efface tout ce qui est là
   - Colle ton nouveau code (Ctrl+V)

5. Clique sur **"Deploy"** (bouton vert)

6. Attends que ça se termine (tu verras "Deployed successfully")

---

### **ÉTAPE 2 : Tester !**

1. Va sur : **https://parcsync.madimpact.fr**

2. Connecte-toi avec ton compte admin

3. Va dans **"Gestion des utilisateurs"**

4. Clique sur **"+ Ajouter un utilisateur"**

5. Remplis le formulaire :
   - **Prénom** : Test
   - **Nom** : Utilisateur
   - **Email** : ton email de test
   - **Mot de passe** : TestPassword123 (minimum 8 caractères)
   - **Pôle** : (optionnel)

6. Clique sur **"Créer"**

7. **TERMINÉ !** L'utilisateur peut maintenant se connecter immédiatement avec :
   - Email : ton email de test
   - Mot de passe : TestPassword123

---

## ✅ Avantages de cette solution

- **Pas besoin d'email** : Fonctionne même si Brevo a un problème
- **Immédiat** : L'utilisateur peut se connecter tout de suite
- **Simple** : Pas de lien qui expire, pas de complications
- **Fiable** : Ça marche à tous les coups

---

## 🎉 Comment tester que ça marche

1. Crée un utilisateur avec ton email

2. **Déconnecte-toi**

3. Va sur la page de connexion

4. Entre :
   - Email : l'email que tu as utilisé
   - Mot de passe : le mot de passe que tu as défini

5. **Ça marche !** Tu es connecté

---

## 💡 Remarques importantes

- Le mot de passe doit faire **minimum 8 caractères**
- L'utilisateur peut **changer son mot de passe** plus tard via "Mot de passe oublié" s'il veut
- Si l'email existe déjà, l'utilisateur sera mis à jour (nom, prénom, pôle) mais le mot de passe ne change pas

---

## 🆘 En cas de problème

### "Invalid email" ou "Missing password"
- Vérifie que tous les champs sont remplis
- Le mot de passe doit faire minimum 8 caractères

### "Failed to create user"
- Vérifie que l'email n'existe pas déjà
- Regarde les logs de la fonction sur Supabase

### "Forbidden (not admin)"
- Vérifie que tu es connecté avec un compte admin
- Les comptes sans pôle sont automatiquement admin

---

**Besoin d'aide ? Dis-moi où tu bloques !**
