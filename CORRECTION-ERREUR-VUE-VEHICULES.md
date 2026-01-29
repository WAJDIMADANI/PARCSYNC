# CORRECTION : Erreur vue v_vehicles_list

## Problème résolu

**Erreur :** `cannot change name of view column "immat_norm" to "marque"`

Cette erreur se produit parce que PostgreSQL ne permet pas de changer l'ordre des colonnes dans une vue avec `CREATE OR REPLACE VIEW`. Il faut d'abord supprimer la vue existante.

## Solution en 1 étape

### Exécuter le fichier de correction

Dans le SQL Editor de Supabase, copiez et exécutez le contenu de :

**`FIX-VIEW-V_VEHICLES_LIST.sql`**

Ce fichier :
1. ✅ Supprime la vue existante v_vehicles_list
2. ✅ La recrée avec la structure complète et correcte
3. ✅ Corrige la référence `l.nom_entreprise` → `l.nom`
4. ✅ Ajoute les colonnes calculées `locataire_affiche` et `loueur_affiche`
5. ✅ Ajoute les informations sur les chauffeurs actifs
6. ✅ Vérifie que tout fonctionne

## Vérification

Après avoir exécuté le SQL, vérifiez que la vue fonctionne :

```sql
SELECT
  immatriculation,
  marque,
  modele,
  locataire_affiche,
  loueur_affiche,
  nb_chauffeurs_actifs
FROM v_vehicles_list
LIMIT 10;
```

Vous devriez voir la liste des véhicules avec les colonnes calculées.

## Fichiers corrigés

Les fichiers suivants ont été mis à jour avec la correction :
- ✅ `FIX-VIEW-V_VEHICLES_LIST.sql` - **Exécuter celui-ci**
- ✅ `EXECUTER-MAINTENANT-LOCATAIRE-PROPRIETAIRE-LOUEUR.sql` - Système complet
- ✅ `add-locataire-proprietaire-loueur-system.sql`
- ✅ `add-vehicle-extended-fields.sql`

## Résumé

La correction est prête. Exécutez simplement le fichier `FIX-VIEW-V_VEHICLES_LIST.sql` dans votre dashboard Supabase pour résoudre l'erreur.

Le frontend est déjà compilé et prêt à utiliser la vue corrigée.
