# Test Attribution Locataire Externe

## Situation

La contrainte `attribution_vehicule_profil_or_loueur_check` existe déjà.

Cela peut signifier:
1. Les modifications ont déjà été appliquées
2. Ou seulement la contrainte a été créée

## Test à faire MAINTENANT

1. **Recharger l'application** (Ctrl+R ou Cmd+R)

2. **Tester l'attribution:**
   - Module Parc
   - Cliquer sur un véhicule
   - Onglet "Attributions"
   - Cliquer sur "Attribuer"
   - Choisir "Personne externe" ou "Entreprise externe"
   - Sélectionner un locataire externe
   - Remplir la date de début
   - Cliquer "Confirmer l'attribution"

3. **Résultats possibles:**

### ✅ Si ça marche:
Les modifications sont déjà appliquées, tout est bon!

### ❌ Si même erreur:
```
null value in column "profil_id" violates not-null constraint
```

Cela signifie que `profil_id` est toujours NOT NULL.

**Solution:** Exécuter uniquement les ALTER COLUMN:

```sql
-- Rendre profil_id nullable
ALTER TABLE attribution_vehicule
  ALTER COLUMN profil_id DROP NOT NULL;

-- Rendre type_attribution nullable
ALTER TABLE attribution_vehicule
  ALTER COLUMN type_attribution DROP NOT NULL;

-- Mettre à jour la contrainte type_attribution
ALTER TABLE attribution_vehicule
  DROP CONSTRAINT IF EXISTS attribution_vehicule_type_attribution_check;

ALTER TABLE attribution_vehicule
  ADD CONSTRAINT attribution_vehicule_type_attribution_check
  CHECK (type_attribution IS NULL OR type_attribution IN ('principal', 'secondaire'));
```

## Vérification rapide

Pour vérifier la structure actuelle, exécuter dans SQL Editor:

```sql
SELECT
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'attribution_vehicule'
  AND column_name IN ('profil_id', 'type_attribution')
ORDER BY column_name;
```

**Résultat attendu:**
```
profil_id         | YES
type_attribution  | YES
```

Si c'est "NO", il faut exécuter le ALTER COLUMN ci-dessus.

---

**Étape suivante:** Tester l'attribution et me dire si ça marche ou pas.
