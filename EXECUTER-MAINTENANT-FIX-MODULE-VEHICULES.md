# CORRECTION URGENTE - Module Véhicules

## Problèmes identifiés

1. **Colonnes manquantes dans la table `vehicule`** :
   - `date_debut_contrat`
   - `date_fin_prevue_contrat`
   - `fournisseur`
   - `mode_acquisition`
   - `prix_ht`, `prix_ttc`
   - `mensualite`
   - `duree_contrat_mois`
   - `annee`
   - `date_premiere_mise_en_circulation`
   - `date_mise_en_service`

2. **Colonne manquante dans la table `alerte`** :
   - `is_read`
   - `priorite`

3. **Erreur de relation `demande_standard`** : Requête qui cherche une relation inexistante

## Solution en 2 étapes

### ÉTAPE 1 : Exécuter le script SQL principal

Allez dans votre dashboard Supabase → SQL Editor et exécutez le fichier suivant :
`FIX-VEHICULE-ERREURS-CREATION.sql`

### ÉTAPE 2 : Exécuter les autres migrations nécessaires

Ensuite, exécutez ces scripts dans l'ordre :

1. `FIX-VIEW-V_VEHICLES_LIST.sql` - Corriger la vue des véhicules
2. `add-vehicule-acquisition-fields.sql` - Assurer que tous les champs sont présents
3. `SQL-A-EXECUTER-VEHICULES-COMPLET.sql` - Module complet parc automobile

## Vérification

Après avoir exécuté ces scripts, vérifiez avec :

```sql
-- Vérifier les colonnes de la table vehicule
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicule'
ORDER BY ordinal_position;

-- Vérifier que la vue fonctionne
SELECT COUNT(*) FROM v_vehicles_list;
```

## Test

1. Actualisez votre page dans l'application
2. Essayez de créer un nouveau véhicule
3. Vérifiez que toutes les étapes du formulaire fonctionnent

## Note importante

L'erreur `demande_standard` est probablement causée par une vue ou une fonction qui utilise incorrectement cette table. Si l'erreur persiste après ces corrections, nous devrons identifier exactement quelle vue ou fonction cause ce problème.
