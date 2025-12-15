# CORRECTION : Affichage des CDD dans les incidents

## Le problème identifié

La fonction `get_cdd_expires()` utilisait `p.matricule` qui n'existe pas dans la table `profil`.
Le bon nom de colonne est `p.matricule_tca`.

## Solution

Exécuter ce script SQL dans Supabase :

**`CORRIGER-TOUT-MAINTENANT.sql`**

Ce script va :
1. Corriger `get_cdd_expires()` pour utiliser `matricule_tca`
2. Corriger `get_avenants_expires()` pour utiliser `matricule_tca`  
3. Tester que BUSIN et ATIK apparaissent bien

## Résultat attendu

Après exécution, vous devriez voir dans le test final :

```
prenom  | nom   | email                     | date_expiration | jours
--------|-------|---------------------------|-----------------|------
Anissa  | BUSIN | anissa-busin@hotmail.com  | 2025-10-17     | -59
Kaoutar | ATIK  | kaoutar.r@hotmail.fr      | 2025-10-24     | -52
```

## Vérification dans l'interface

1. Allez dans **Incidents**
2. Cliquez sur l'onglet **CDD**
3. Vous devriez voir BUSIN et ATIK apparaître

## En cas de problème

Si après le script les CDD n'apparaissent toujours pas, envoyez-moi le résultat du test inclus dans le script.
