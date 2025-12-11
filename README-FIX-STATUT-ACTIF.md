# Fix: Erreur "contrat_statut_check" lors de la correction Yousign

## Erreur Rencontrée

```
ERROR: 23514: new row for relation "contrat" violates check constraint "contrat_statut_check"
```

## Cause

La contrainte CHECK sur la colonne `statut` de la table `contrat` n'acceptait pas la valeur `'actif'`.

Statuts autorisés AVANT la correction:
- `'envoye'`
- `'en_attente_signature'`
- `'signe'`
- `'valide'`

Mais la fonction `generate_daily_expired_incidents()` cherche les contrats avec `statut = 'actif'`!

## Solution

**Étape 1: Corriger la contrainte CHECK**

Exécutez `fix-contrat-statut-constraint.sql` en PREMIER:

```sql
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_statut_check;

ALTER TABLE contrat ADD CONSTRAINT contrat_statut_check
  CHECK (statut IN ('envoye', 'en_attente_signature', 'signe', 'valide', 'actif'));
```

**Étape 2: Corriger les contrats**

ENSUITE, exécutez `fix-existing-yousign-contracts.sql`

Cette fois, ça fonctionnera car le statut `'actif'` est maintenant accepté!

## Ordre d'Exécution

1. ✅ `fix-contrat-statut-constraint.sql` (OBLIGATOIRE EN PREMIER)
2. ✅ `fix-existing-yousign-contracts.sql`
3. ✅ Vérification du contrat
4. ✅ Déploiement du webhook

## Vérification

Après avoir corrigé la contrainte, vérifiez:

```sql
-- Voir les statuts autorisés
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'contrat_statut_check';
```

Doit afficher: `CHECK (statut = ANY (ARRAY['envoye', 'en_attente_signature', 'signe', 'valide', 'actif']))`

## Pourquoi 'actif'?

- La fonction SQL `generate_daily_expired_incidents()` utilise `WHERE statut = 'actif'`
- Un contrat signé devrait avoir le statut `'actif'` pour être détecté
- C'est plus logique qu'un statut `'valide'` pour un contrat en cours d'exécution

## Guide Complet

Voir: `DEMARRAGE-RAPIDE-CORRECTION.md`
