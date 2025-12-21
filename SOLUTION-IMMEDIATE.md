# SOLUTION IMMÉDIATE - Supprimer l'erreur "ux_contrat_one_base_per_group"

## Le problème

Vous voyez cette erreur : **"duplicate key value violates unique constraint ux_contrat_one_base_per_group"**

Cette contrainte empêche de créer plusieurs contrats pour un même salarié.

## LA SOLUTION EN 2 MINUTES

### Étape 1 : Ouvrir l'éditeur SQL de Supabase

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Cliquez sur "SQL Editor" dans le menu de gauche

### Étape 2 : Exécuter cette commande

Copiez-collez cette ligne et cliquez sur "Run" :

```sql
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS ux_contrat_one_base_per_group CASCADE;
```

C'est tout ! Rafraîchissez votre application et réessayez.

## Vérification

Pour vérifier que ça a marché, exécutez :

```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
AND conname = 'ux_contrat_one_base_per_group';
```

Si le résultat est vide, c'est réussi.

## Script complet (optionnel)

Si vous voulez être sûr de tout supprimer, utilisez le fichier : **`FIX-URGENT-SUPPRIMER-CONTRAINTE.sql`**

Ce script supprime :
- La contrainte principale
- Tous les index similaires
- Toutes les autres contraintes uniques sur profil_id

## Après

Une fois la contrainte supprimée, vous pourrez :
- Créer autant de contrats que vous voulez pour chaque salarié
- Plus jamais voir ce message d'erreur
- Créer plusieurs CDI, CDD, avenants sans limitation

## Fichiers disponibles

1. **FIX-URGENT-SUPPRIMER-CONTRAINTE.sql** ← LE PLUS COMPLET (RECOMMANDÉ)
2. **EXECUTER-MAINTENANT-SUPPRIMER-CONTRAINTE.sql** ← RAPIDE
3. **SUPPRIMER-REGLES-CREATION-CONTRATS.sql** ← DÉTAILLÉ

Utilisez celui que vous voulez, ils font tous le même travail.
