# Guide: Corriger la suppression des modèles de courriers

## Problème
Impossible de supprimer les modèles de courriers (V1 et V2) depuis l'interface.

## Solution en 2 étapes

### Étape 1: Exécuter le script SQL

1. Ouvrez Supabase Dashboard
2. Allez dans **SQL Editor**
3. Copiez le contenu du fichier `FIX-SUPPRESSION-MODELES-COURRIERS.sql`
4. Exécutez le script

Ce script va:
- ✅ Ajouter les permissions de suppression sur le bucket Storage `letter-templates` pour tous les utilisateurs authentifiés
- ✅ Vérifier et corriger les policies RLS sur la table `modele_courrier`
- ✅ Afficher les permissions actuelles pour vérification

**Note:** Le système n'utilise pas de colonne "role" mais un système de permissions via la table `utilisateur_permissions`. Les restrictions d'accès sont gérées au niveau du frontend.

### Étape 2: Tester la suppression

1. Allez dans **Modèles de Courriers** ou **Modèles de Courriers V2**
2. Cliquez sur l'icône 🗑️ (poubelle) d'un modèle
3. Confirmez la suppression
4. Si une erreur apparaît, elle sera affichée en haut de la page avec le message d'erreur exact

## Améliorations appliquées

### 1. Affichage des erreurs
- Un bandeau rouge apparaît en haut de la page si la suppression échoue
- Le message d'erreur exact est affiché pour faciliter le diagnostic

### 2. Meilleure gestion des erreurs
- Logs détaillés dans la console pour debugger
- La suppression du fichier Storage continue même si elle échoue (pour éviter les blocages)
- Messages d'erreur plus clairs

### 3. Permissions Storage améliorées
- Policy DELETE ajoutée pour les admins/super_admins
- Suppression des anciennes policies conflictuelles

## Vérification après correction

Après avoir exécuté le script SQL, vous devriez voir dans la console SQL:

1. **Policies RLS sur modele_courrier** incluant une policy DELETE pour les admins
2. **Policies Storage** incluant une policy DELETE pour le bucket letter-templates

## En cas de problème persistant

Si la suppression échoue toujours:

1. Vérifiez dans la console développeur (F12) les logs qui commencent par `[deleteTemplate]`
2. Notez le message d'erreur affiché dans le bandeau rouge
3. Vérifiez que vous êtes bien authentifié et avez accès à l'interface
4. Vérifiez que le bucket `letter-templates` existe dans Storage > Buckets
5. Vérifiez les policies RLS dans Database > Policies
