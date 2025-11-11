# Instructions : Permettre l'upload anonyme du certificat médical

## Problème
Le candidat qui reçoit un lien pour uploader son certificat médical doit se connecter, ce qui n'est pas souhaité. La page doit fonctionner comme `/apply` et `/onboarding` sans authentification.

## Solution
Exécuter la migration SQL pour permettre l'accès anonyme.

## Étapes à suivre

### 1. Aller dans Supabase
1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor** (dans le menu de gauche)

### 2. Exécuter la migration
Copiez-collez le contenu du fichier `allow-anonymous-medical-certificate-upload.sql` et exécutez-le.

### 3. Vérifier que ça fonctionne
1. Envoyez un email de demande de certificat médical depuis l'interface RH
2. Le candidat recevra un email avec un lien comme :
   `https://votre-app.com/upload-medical-certificate?contract=xxx-xxx-xxx`
3. En cliquant sur ce lien, le candidat doit voir directement la page d'upload sans écran de connexion
4. Le candidat peut uploader son certificat médical (PDF ou image)

## Que fait cette migration ?

Elle crée les policies RLS pour permettre aux utilisateurs anonymes de :
- ✅ Voir les contrats (SELECT)
- ✅ Voir les profils (SELECT) - pour afficher le nom du candidat
- ✅ Créer des documents (INSERT)
- ✅ Mettre à jour les contrats (UPDATE) - pour lier le certificat
- ✅ Uploader des fichiers dans le bucket 'documents'

## Sécurité
- L'accès est limité aux opérations strictement nécessaires
- Le bucket documents a une limite de 10 Mo
- Seuls les PDF et images sont acceptés
- Les utilisateurs anonymes ne peuvent pas supprimer ou modifier les documents existants

## Important
Cette migration est **OBLIGATOIRE** pour que l'upload anonyme du certificat médical fonctionne correctement !
