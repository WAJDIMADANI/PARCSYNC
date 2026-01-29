# CORRECTION : Erreur vue v_vehicles_list

## Problèmes résolus

**Erreur 1 :** `cannot change name of view column "immat_norm" to "marque"`

Cette erreur se produit parce que PostgreSQL ne permet pas de changer l'ordre des colonnes dans une vue avec `CREATE OR REPLACE VIEW`.

**Erreur 2 :** `column v.locataire_type does not exist`

Les colonnes `locataire_type`, `loueur_type`, etc. n'existent pas encore dans la table `vehicule`.

## Solution en 1 étape

### Exécuter le fichier de correction

Dans le SQL Editor de Supabase, copiez et exécutez le contenu de :

**`FIX-VIEW-V_VEHICLES_LIST.sql`**

Ce fichier corrige TOUT automatiquement :
1. ✅ Ajoute les colonnes manquantes à la table `vehicule` :
   - `locataire_type`, `locataire_nom_libre`
   - `proprietaire_carte_grise`
   - `loueur_type`, `loueur_chauffeur_id`, `loueur_nom_externe`
2. ✅ Ajoute toutes les contraintes CHECK nécessaires
3. ✅ Crée les foreign keys et index
4. ✅ Supprime la vue existante v_vehicles_list
5. ✅ Recrée la vue avec la structure complète et correcte
6. ✅ Corrige la référence `l.nom_entreprise` → `l.nom`
7. ✅ Ajoute les colonnes calculées `locataire_affiche` et `loueur_affiche`
8. ✅ Ajoute les informations sur les chauffeurs actifs
9. ✅ Vérifie que tout fonctionne

## Vérification automatique

Le script inclut une vérification automatique qui affiche :
- ✅ Les colonnes ajoutées à la table `vehicule`
- ✅ Le nombre total de véhicules dans la vue
- ✅ 5 exemples de véhicules avec les nouvelles colonnes

Vous verrez des messages comme :
```
✓ Colonnes locataire_type, loueur_type, etc. ajoutées à la table vehicule
✓ Vue v_vehicles_list recréée avec succès !
✓ Colonnes locataire_affiche et loueur_affiche ajoutées
✓ Correction l.nom_entreprise → l.nom appliquée
✓ Contraintes et index créés
```

## Test manuel (optionnel)

Si vous voulez tester la vue :

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
