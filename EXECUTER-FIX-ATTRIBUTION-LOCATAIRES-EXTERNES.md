# FIX Attribution Locataires Externes - À EXÉCUTER MAINTENANT

## Problème

Impossible d'attribuer un véhicule à un locataire externe:
```
Erreur: null value in column "profil_id" violates not-null constraint
```

## Cause

La table `attribution_vehicule` a été créée avec:
- `profil_id` NOT NULL
- `type_attribution` NOT NULL

Ces contraintes empêchent les attributions aux locataires externes qui n'ont pas de profil salarié.

## Solution

Rendre ces colonnes NULLABLE pour permettre les locataires externes.

## Instructions d'exécution

### Étape 1: Ouvrir Supabase SQL Editor

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Cliquer sur "SQL Editor" dans le menu de gauche

### Étape 2: Exécuter le script SQL

Copier-coller le contenu du fichier `fix-attribution-vehicule-locataires-externes.sql` et exécuter.

### Étape 3: Vérifier

Après l'exécution, vous devriez voir:
```
Success. No rows returned
```

## Structure après correction

### Colonnes modifiées

**profil_id**
- Avant: `uuid NOT NULL`
- Après: `uuid` (nullable)
- Permet: NULL pour locataires externes

**type_attribution**
- Avant: `text NOT NULL CHECK (type_attribution IN ('principal', 'secondaire'))`
- Après: `text CHECK (type_attribution IS NULL OR type_attribution IN ('principal', 'secondaire'))`
- Permet: NULL pour locataires externes

### Nouvelle contrainte

**attribution_vehicule_profil_or_loueur_check**
```sql
CHECK (
  (profil_id IS NOT NULL AND loueur_id IS NULL) OR      -- Salarié TCA sans loueur
  (profil_id IS NOT NULL AND loueur_id IS NOT NULL) OR  -- Salarié avec loueur externe
  (profil_id IS NULL AND loueur_id IS NOT NULL)         -- Locataire externe seul
)
```

Cette contrainte garantit qu'il y a toujours soit un profil salarié, soit un loueur externe.

## Cas d'usage

### 1. Salarié TCA (propriété TCA)
```sql
profil_id: <uuid du salarié>
loueur_id: NULL
type_attribution: 'principal' ou 'secondaire'
```

### 2. Salarié TCA (loueur externe)
```sql
profil_id: <uuid du salarié>
loueur_id: <uuid du loueur>
type_attribution: 'principal' ou 'secondaire'
```

### 3. Locataire externe (personne ou entreprise)
```sql
profil_id: NULL
loueur_id: <uuid du locataire externe>
type_attribution: NULL
```

## Test après correction

1. Aller dans le module Parc
2. Cliquer sur un véhicule
3. Onglet "Attributions" → "Attribuer"
4. Choisir "Personne externe" ou "Entreprise externe"
5. Sélectionner un locataire externe
6. Remplir les dates
7. Cliquer sur "Confirmer l'attribution"
8. ✅ Devrait fonctionner sans erreur

## Vérification

### Requête pour vérifier les contraintes
```sql
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'attribution_vehicule';
```

### Requête pour vérifier les colonnes
```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attribution_vehicule'
  AND column_name IN ('profil_id', 'type_attribution', 'loueur_id')
ORDER BY ordinal_position;
```

Résultat attendu:
- `profil_id`: is_nullable = 'YES'
- `type_attribution`: is_nullable = 'YES'
- `loueur_id`: is_nullable = 'YES'

## Impact

- ✅ Permet l'attribution aux locataires externes
- ✅ Garde la logique pour les salariés TCA
- ✅ Protège contre les incohérences (contrainte CHECK)
- ✅ Aucun impact sur les attributions existantes
- ✅ Pas de migration de données nécessaire

## Rollback

Si besoin de revenir en arrière:
```sql
-- Supprimer la contrainte
ALTER TABLE attribution_vehicule
  DROP CONSTRAINT attribution_vehicule_profil_or_loueur_check;

-- Remettre NOT NULL (seulement si aucune attribution externe n'existe)
ALTER TABLE attribution_vehicule
  ALTER COLUMN profil_id SET NOT NULL;

ALTER TABLE attribution_vehicule
  ALTER COLUMN type_attribution SET NOT NULL;
```

**Attention:** Le rollback n'est possible que s'il n'y a pas d'attributions de locataires externes dans la base.

---

**Fichier SQL:** `fix-attribution-vehicule-locataires-externes.sql`
**Durée d'exécution:** < 1 seconde
**Risque:** Très faible
**Impact:** Activation des locataires externes
