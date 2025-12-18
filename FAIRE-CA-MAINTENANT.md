# 🚨 FAIRE ÇA MAINTENANT - EN 3 MINUTES

## ❌ Problème Actuel
```
new row violates row-level security policy for table "demandes_externes"
```

## ✅ Solution Simple

### ÉTAPE 1 : Aller sur Supabase
1. Ouvrez votre navigateur
2. Allez sur : **https://supabase.com/dashboard**
3. Connectez-vous si nécessaire
4. Sélectionnez votre projet

### ÉTAPE 2 : Ouvrir SQL Editor
1. Dans le menu de gauche, cherchez **"SQL Editor"**
2. Cliquez dessus
3. Vous devriez voir un éditeur de code vide

### ÉTAPE 3 : Copier le Script
1. Ouvrez le fichier : **`FIX-RLS-DEMANDE-SUPER-PUISSANT.sql`**
2. Appuyez sur **Ctrl+A** (sélectionner tout)
3. Appuyez sur **Ctrl+C** (copier)

### ÉTAPE 4 : Coller et Exécuter
1. Retournez dans Supabase SQL Editor
2. Cliquez dans la zone d'édition
3. Appuyez sur **Ctrl+V** (coller)
4. En haut à droite, cliquez sur le bouton **"RUN"** (ou Ctrl+Enter)
5. Attendez 3-5 secondes

### ÉTAPE 5 : Vérifier
Vous devriez voir :
- ✅ Un message de succès
- ✅ Une liste de policies créées
- ✅ Le bucket demandes-externes

### ÉTAPE 6 : Tester
1. Retournez sur votre application
2. Appuyez sur **Ctrl+F5** (recharger en vidant le cache)
3. Allez sur `/demande-externe`
4. Entrez le matricule **1353**
5. Cliquez sur **Rechercher**
6. Remplissez le formulaire
7. Cliquez sur **Envoyer la demande**

---

## 🎯 Ça Devrait Marcher Maintenant !

Si ça ne marche toujours pas :
1. Vérifiez qu'il n'y a PAS d'erreur rouge dans Supabase après avoir exécuté le script
2. Essayez dans une fenêtre de navigation privée
3. Ouvrez la console du navigateur (F12) et envoyez-moi l'erreur

---

## 📁 Fichier à Utiliser
**`FIX-RLS-DEMANDE-SUPER-PUISSANT.sql`** ← Ce fichier contient le script complet

---

## 🤔 Pourquoi Ce Problème ?

La page `/demande-externe` est accessible **sans connexion** (comme l'onboarding).

Mais par défaut, Supabase bloque les utilisateurs non connectés (pour la sécurité).

Ce script autorise les utilisateurs non connectés à :
- ✅ Chercher leur matricule
- ✅ Voir les pôles
- ✅ Créer UNE demande
- ✅ Uploader des fichiers

Mais ils ne peuvent PAS :
- ❌ Voir les demandes des autres
- ❌ Modifier/supprimer des demandes
- ❌ Accéder au reste de l'application

---

## 🆘 Besoin d'Aide ?

Prenez une capture d'écran :
1. De l'éditeur SQL après avoir cliqué RUN
2. De l'erreur dans votre application (s'il y en a encore)
3. De la console du navigateur (F12 → onglet Console)

Et envoyez-les moi !
