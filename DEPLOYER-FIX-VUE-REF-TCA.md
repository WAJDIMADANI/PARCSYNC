# Déploiement: Fix Vue v_vehicles_list_ui

## Problème détecté

L'erreur suivante apparaît:
```
ERROR: 42703: column v.deleted_at does not exist
LINE 129: WHERE v.deleted_at IS NULL;
```

**Cause:** La vue `v_vehicles_list_ui` utilise une colonne `deleted_at` qui n'existe pas dans la table `vehicule`.

## Solution

Recréer la vue `v_vehicles_list_ui` sans la clause `WHERE deleted_at IS NULL` et en incluant explicitement `ref_tca`.

## Étapes de déploiement

### 1. Vérification préalable (optionnel)

Exécuter `VERIFICATION-VUES-REF-TCA.sql` pour voir l'état actuel:
- Quelles vues existent
- Quelles colonnes elles contiennent
- Si ref_tca est accessible

### 2. Correction de la vue

Exécuter `FIX-VUE-VEHICLES-LIST-UI-REF-TCA.sql`:

```sql
-- Ce script va:
-- 1. Supprimer l'ancienne vue (DROP VIEW IF EXISTS)
-- 2. Recréer la vue sans deleted_at
-- 3. Inclure explicitement ref_tca
-- 4. Tester que la vue fonctionne
```

### 3. Vérification post-déploiement

Après avoir exécuté le script, vérifier:

```sql
-- Test 1: La vue existe et contient ref_tca
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'v_vehicles_list_ui'
  AND column_name = 'ref_tca';

-- Test 2: On peut SELECT depuis la vue
SELECT id, immatriculation, ref_tca
FROM v_vehicles_list_ui
LIMIT 5;

-- Test 3: VehicleListNew.tsx peut fetch les données
-- Dans l'application, aller sur la page des véhicules
-- Vérifier qu'il n'y a plus d'erreur
```

## Impact

### Avant le fix
- ❌ Erreur "column deleted_at does not exist"
- ❌ VehicleListNew.tsx ne peut pas charger les véhicules
- ❌ Page des véhicules ne s'affiche pas

### Après le fix
- ✅ Vue fonctionne sans erreur
- ✅ ref_tca est accessible
- ✅ VehicleListNew.tsx charge les véhicules
- ✅ Page des véhicules s'affiche correctement

## Fichiers concernés

**SQL à exécuter:**
1. `FIX-VUE-VEHICLES-LIST-UI-REF-TCA.sql` ← **EXÉCUTER CELUI-CI**

**Scripts de vérification (optionnels):**
2. `VERIFICATION-VUES-REF-TCA.sql` - Vérifier l'état des vues
3. `VERIFICATION-REF-TCA.sql` - Vérifier la colonne ref_tca

**Documentation:**
4. `RECAP-REF-TCA-IMPLEMENTATION.md` - Vue d'ensemble
5. `ANALYSE-COMPLETE-REF-TCA.md` - Analyse détaillée

## Code TypeScript (aucun changement requis)

Le code TypeScript est déjà correct:
- ✅ VehicleListNew.tsx utilise `v_vehicles_list_ui`
- ✅ VehicleDetailModal.tsx affiche `vehicle.reference_tca`
- ✅ AttributionHistoryModal.tsx filtre sur `vehicule_id` (UUID)

Aucune modification de code n'est nécessaire, seule la vue SQL doit être corrigée.

## Commande rapide

Pour exécuter le fix immédiatement dans Supabase:

1. Aller dans SQL Editor
2. Copier le contenu de `FIX-VUE-VEHICLES-LIST-UI-REF-TCA.sql`
3. Exécuter
4. Vérifier le message de succès
5. Recharger la page des véhicules dans l'application

## Résultat attendu

```
✅ DROP VIEW (si existait)
✅ CREATE VIEW (nouvelle version)
✅ SELECT test (5 lignes avec ref_tca)

Exemple de résultat:
id                                   | immatriculation | ref_tca
-------------------------------------|-----------------|--------
dff46d75-83c7-4c36-8690-015781200f45 | EE207HJEE      | null
9a8bc51b-0989-4364-a1ae-6a0bfc24397d | EE207HM        | null
...
```

Note: `ref_tca` peut être `null` si non renseigné, c'est normal.

## En cas d'erreur

Si une erreur persiste après le fix:

1. Vérifier que la table `vehicule` a bien la colonne `ref_tca`:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'vehicule' AND column_name = 'ref_tca';
   ```

2. Si la colonne n'existe pas, l'ajouter:
   ```sql
   ALTER TABLE vehicule ADD COLUMN IF NOT EXISTS ref_tca text;
   ```

3. Réexécuter `FIX-VUE-VEHICLES-LIST-UI-REF-TCA.sql`

## Conclusion

**Action requise:** Exécuter `FIX-VUE-VEHICLES-LIST-UI-REF-TCA.sql`

**Durée:** < 1 minute

**Impact:** Corrige l'erreur et permet l'affichage des véhicules

**Code TypeScript:** Aucun changement requis ✅
