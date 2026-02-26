# Commencer ici: Fix Vue Véhicules

## Problème

La page véhicules ne charge pas:
```
Error: column v.deleted_at does not exist
```

## Solution en 3 étapes

### Étape 1: Ouvrir Supabase

1. Aller dans Supabase
2. Ouvrir "SQL Editor"

### Étape 2: Exécuter le script

1. Ouvrir le fichier: `FIX-VUE-VEHICLES-FINAL.sql`
2. Copier tout le contenu
3. Coller dans SQL Editor
4. Cliquer sur "Run"

### Étape 3: Vérifier

1. Recharger la page véhicules dans l'application
2. La liste devrait s'afficher
3. Ouvrir un véhicule
4. Le champ "Référence TCA" devrait être visible

## C'est tout!

**Durée:** 2 minutes

**Risque:** Aucun (juste une vue SQL)

**Code à modifier:** Aucun

---

## Besoin d'aide?

### Guide détaillé
Lire: `ACTION-IMMEDIATE-FIX-VUE.md`

### Tests de vérification
Exécuter: `VERIFIER-APRES-FIX-VUE.sql`

### Documentation complète
Lire: `INDEX-FIX-VUE-REF-TCA.md`

---

## Résultat

Avant:
- ❌ Erreur deleted_at
- ❌ Page véhicules ne charge pas

Après:
- ✅ Page véhicules fonctionne
- ✅ ref_tca accessible
- ✅ Tout fonctionne normalement
