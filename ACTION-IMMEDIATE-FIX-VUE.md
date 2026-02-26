# À EXÉCUTER MAINTENANT: Fix Vue v_vehicles_list_ui

## Problèmes identifiés

1. ❌ `CREATE OR REPLACE VIEW` échoue (erreur 42P16) → changement de structure
2. ❌ `vehicule.deleted_at` n'existe pas → erreur 42703
3. ❌ JOIN sur `locataire_externe` au lieu de `loueur`

## Solution

**Fichier:** `FIX-VUE-VEHICLES-FINAL.sql`

Ce fichier:
- ✅ Supprime la vue existante (`DROP VIEW`)
- ✅ Recrée la vue sans `deleted_at`
- ✅ Corrige les JOIN vers `loueur` au lieu de `locataire_externe`
- ✅ Inclut explicitement `ref_tca`
- ✅ Teste que tout fonctionne

## Commande rapide

### Dans Supabase SQL Editor:

1. Ouvrir le fichier `FIX-VUE-VEHICLES-FINAL.sql`
2. Copier tout le contenu
3. Coller dans SQL Editor
4. Cliquer sur "Run"
5. Vérifier les messages de succès

### Résultat attendu:

```
✅ DROP VIEW (si existait)
✅ CREATE VIEW
✅ "Vue créée avec succès!"
✅ SELECT avec 5 lignes incluant ref_tca
✅ 3 colonnes trouvées (ref_tca, locataire_affiche, chauffeurs_actifs)
```

## Vérification après exécution

Dans l'application:
1. Aller sur la page "Parc auto"
2. La liste des véhicules devrait s'afficher sans erreur
3. Ouvrir un véhicule
4. Le champ "Référence TCA" devrait être visible dans l'en-tête

## En cas d'erreur

Si la table `loueur` n'existe pas, vérifier avec:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('loueur', 'locataire_externe');
```

**Si seule `locataire_externe` existe:**
Remplacer tous les `JOIN loueur` par `JOIN locataire_externe` dans le script.

**Si aucune des deux n'existe:**
Les sous-requêtes qui utilisent ces tables retourneront NULL, ce qui est acceptable. Le véhicule affichera "Non attribué" ou le `locataire_nom_libre`.

## Impact

### Avant
- ❌ Erreur "column deleted_at does not exist"
- ❌ Page véhicules ne charge pas
- ❌ ref_tca non accessible

### Après
- ✅ Vue fonctionne
- ✅ Page véhicules charge
- ✅ ref_tca accessible et éditable
- ✅ Attributions fonctionnent

## Durée estimée

⏱️ Moins de 1 minute

## Prochaine étape

Après avoir exécuté ce script:
1. Recharger la page des véhicules dans l'application
2. Vérifier qu'il n'y a plus d'erreur
3. Tester l'édition d'un champ "Référence TCA"
4. Vérifier l'historique des attributions
