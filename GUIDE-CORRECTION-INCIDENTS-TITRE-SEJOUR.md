# 🔧 Guide de correction: Incidents Titre de séjour invisibles

## 🔍 Problème identifié

Le tableau de bord affiche **12 titres de séjour expirés** mais l'onglet "Gestion des incidents" montre **0 incidents**.

### Cause racine
La colonne dans la table `incident` s'appelle `date_expiration_originale` mais le code TypeScript cherche `date_expiration_effective`.

## ✅ Solution en 3 étapes

### Étape 1: Exécuter le script SQL
Dans **Supabase SQL Editor**, exécute ce fichier:
```
EXECUTER-MAINTENANT-FIX-DATE-EXPIRATION.sql
```

Ce script va:
1. ✅ Renommer `date_expiration_originale` → `date_expiration_effective`
2. ✅ Mettre à jour la vue `v_incidents_contrats_affichables`
3. ✅ Vérifier que les données sont accessibles

### Étape 2: Recharger l'application
1. Recharge la page dans ton navigateur (F5)
2. Va dans **RH → Incidents**
3. Clique sur l'onglet **"Titre de séjour"**

### Étape 3: Vérifier dans la console
Ouvre la console du navigateur (F12) et cherche:
```
Données titre_sejour retournées: Array(12)
Total autres incidents: 12
```

## 📊 Que va faire le script

### Avant:
```
table incident:
  ❌ date_expiration_originale  <-- Nom incorrect
```

### Après:
```
table incident:
  ✅ date_expiration_effective  <-- Nom correct
```

## 🎯 Résultat attendu

Après le script, tu devrais voir:
- ✅ **12 incidents** dans l'onglet "Titre de séjour"
- ✅ Les noms et dates d'expiration affichés
- ✅ Les boutons d'action fonctionnels

## 🆘 Si ça ne marche toujours pas

Exécute ce script diagnostic:
```
VERIFIER-SCHEMA-INCIDENT.sql
```

Et envoie-moi le résultat pour que je puisse t'aider davantage.

## 📝 Changements apportés au code

J'ai aussi corrigé deux problèmes dans `IncidentsList.tsx`:
1. ✅ Supprimé les colonnes inexistantes du mapping
2. ✅ Retiré le join problématique avec `contrat` pour les incidents titre_sejour
