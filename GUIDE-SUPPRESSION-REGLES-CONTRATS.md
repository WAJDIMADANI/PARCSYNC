# Guide : Suppression des règles de création de contrats

## Ce qui a été fait

Toutes les règles empêchant la création de plusieurs contrats pour un même salarié ont été supprimées.

## Modifications effectuées

### 1. Script SQL créé
**Fichier:** `SUPPRIMER-REGLES-CREATION-CONTRATS.sql`

Ce script supprime :
- La contrainte unique `ux_contrat_one_base_per_group` qui empêchait d'avoir plusieurs contrats de base par salarié
- Toute autre contrainte unique sur la colonne `profil_id`
- Tous les index uniques liés à `profil_id`

### 2. Code TypeScript modifié
**Fichier:** `src/utils/errorTranslator.ts`

La validation côté client qui affichait le message d'erreur "Contrat déjà existant" a été supprimée.

## Comment appliquer les changements

### Étape 1 : Exécuter le script SQL
1. Allez dans l'éditeur SQL de Supabase
2. Copiez et exécutez le contenu de `SUPPRIMER-REGLES-CREATION-CONTRATS.sql`
3. Vérifiez que le message de succès s'affiche

### Étape 2 : Redéployer l'application
Le code TypeScript a déjà été modifié. L'application va se recompiler automatiquement.

## Résultat

Après l'exécution du script SQL, vous pourrez :
- Créer autant de contrats que vous voulez pour un même salarié
- Créer plusieurs CDI, CDD ou avenants sans restriction
- Ne plus voir le message d'erreur "Contrat déjà existant"

## Important

### Gestion des contrats multiples
Maintenant que plusieurs contrats sont autorisés pour un même salarié, vous devez gérer manuellement :
- Quel contrat est actif
- Les dates de validité
- Les chevauchements de contrats

### Recommandations
- Vérifiez toujours les contrats existants avant d'en créer un nouveau
- Assurez-vous de ne pas créer de doublons par erreur
- Mettez à jour le statut des anciens contrats (expire, clôturé, etc.)
- Gardez une trace claire de l'historique des contrats

## Vérification

Pour vérifier que les contraintes ont bien été supprimées, exécutez :

```sql
-- Vérifier les contraintes restantes
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND contype = 'u';
```

Si aucune contrainte unique sur `profil_id` n'apparaît, c'est bon.

## En cas de problème

Si vous voulez restaurer la contrainte d'unicité (un seul contrat de base par salarié), vous pouvez exécuter :

```sql
-- Restaurer la contrainte (OPTIONNEL)
ALTER TABLE contrat ADD CONSTRAINT ux_contrat_one_base_per_group
  UNIQUE (profil_id, type_document)
  WHERE (statut NOT IN ('expire', 'refuse', 'cloture'));
```

Mais attention : cette contrainte empêchera de créer plusieurs contrats actifs pour un même salarié.
