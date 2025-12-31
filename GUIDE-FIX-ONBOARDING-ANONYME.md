# Guide de correction - Onboarding anonyme

## Problème

Le formulaire d'onboarding affiche l'erreur "permission denied for table documents" car :
- Les candidats utilisent le formulaire **sans être authentifiés**
- Les politiques RLS bloquent les insertions anonymes dans la table `document`
- Les politiques Storage bloquent les uploads anonymes sur le bucket `candidatures`

## Solution en 1 étape

### Exécuter le script SQL

1. Ouvrez votre dashboard Supabase
2. Allez dans **SQL Editor**
3. Copiez et collez le contenu du fichier `FIX-ONBOARDING-ANONYMOUS-COMPLETE.sql`
4. Cliquez sur **Run**

## Ce que le script fait

1. **Bucket candidatures** : Autorise les uploads anonymes
2. **Table document** : Autorise les insertions anonymes
3. **Table profil** : Autorise la création et mise à jour anonyme
4. **Table candidat** : Autorise la mise à jour anonyme

## Vérification

Après avoir exécuté le script :
1. Partagez un lien d'onboarding à un candidat
2. Le candidat remplit le formulaire
3. Le candidat uploade ses documents
4. Le formulaire affiche le message de succès
5. Le candidat apparaît dans l'onglet "Employés" avec le statut "En attente de contrat"
6. Les documents sont visibles dans la fiche du candidat

## Sécurité

Cette configuration est sécurisée car :
- Les uploads anonymes sont limités au bucket `candidatures` uniquement
- Taille maximale : 50MB par fichier
- Types de fichiers autorisés : PDF, images, documents Word
- La suppression et modification nécessitent une authentification
