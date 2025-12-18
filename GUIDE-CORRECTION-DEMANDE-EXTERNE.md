# Guide de Correction - Demande Externe

## Problèmes Résolus

### 1. Design Responsive
La page `/demande-externe` est maintenant complètement responsive et s'adapte aux écrans mobiles.

#### Améliorations apportées :
- Titre responsive : `text-2xl` sur mobile, `text-3xl` sur tablette, `text-4xl` sur desktop
- Padding adaptatif : `py-4` sur mobile, `py-8` sur tablette, `py-12` sur desktop
- Bouton "Rechercher" : Passe en pleine largeur sur mobile, retour à la largeur auto sur desktop
- Formulaire : Tous les champs sont optimisés pour mobile
- Carte d'information : Grid responsive qui s'adapte à la taille d'écran
- Textes : Tailles adaptatives avec breakpoints `sm:` et `md:`

### 2. Problème RLS (Row Level Security)

#### Fichier SQL créé : `FIX-DEMANDE-EXTERNE-RLS-MAINTENANT.sql`

Ce fichier corrige l'erreur "new row violates row-level security policy for table demandes_externes".

#### Ce que fait le script :
1. Crée la table `demandes_externes` si elle n'existe pas
2. Supprime toutes les policies RLS existantes (pour repartir à zéro)
3. Crée des policies correctes qui permettent l'accès anonyme
4. Configure les policies pour toutes les tables nécessaires :
   - `demandes_externes` : Insertion anonyme autorisée
   - `profil` : Lecture anonyme pour recherche par matricule
   - `poles` : Lecture anonyme pour lister les pôles actifs
   - `app_utilisateur` : Lecture anonyme pour notifications
   - `inbox` : Insertion anonyme pour créer des notifications
5. Configure le bucket storage `demandes-externes`

## Comment Appliquer les Corrections

### Étape 1 : Exécuter le Script SQL

1. Ouvrez votre dashboard Supabase : https://supabase.com/dashboard
2. Allez dans **SQL Editor**
3. Copiez le contenu du fichier `FIX-DEMANDE-EXTERNE-RLS-MAINTENANT.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur **Run** (ou Ctrl+Enter)

### Étape 2 : Vérifier

1. Rechargez votre application
2. Accédez à `/demande-externe`
3. Testez sur mobile ET desktop
4. Entrez un matricule valide (ex: 1353)
5. Remplissez le formulaire
6. Envoyez la demande

## Résultat Attendu

- ✅ La page s'affiche sans demander de connexion
- ✅ Le design est parfait sur mobile
- ✅ Le bouton "Rechercher" est pleine largeur sur mobile
- ✅ Les informations utilisateur s'affichent correctement
- ✅ Le formulaire se soumet sans erreur RLS
- ✅ Les fichiers peuvent être uploadés
- ✅ Les notifications sont créées pour le pôle concerné

## Notes Importantes

- Le script SQL est idempotent (peut être exécuté plusieurs fois sans problème)
- Les policies utilisent `WITH CHECK (true)` pour permettre l'accès anonyme complet
- Le bucket storage est privé mais permet l'upload anonyme
- Les utilisateurs authentifiés peuvent lire toutes les demandes
