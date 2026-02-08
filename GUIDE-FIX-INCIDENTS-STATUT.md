# FIX URGENT - Erreur changement de statut des incidents

## Problème identifié

Quand vous cliquez sur le statut "en cours" dans l'onglet "Gestion des incidents", vous obtenez cette erreur :

```
Error changing status: Could not find the function public.change_incident_status
```

## Cause

Les fonctions PostgreSQL nécessaires pour gérer les incidents n'ont jamais été créées dans la base de données :
- `change_incident_status` - pour changer le statut d'un incident
- `resolve_incident` - pour résoudre un incident et mettre à jour les dates

## Solution simple

### Étape 1 : Ouvrir Supabase SQL Editor
1. Allez sur https://supabase.com
2. Connectez-vous à votre projet
3. Dans le menu de gauche, cliquez sur **SQL Editor**

### Étape 2 : Exécuter le script
1. Ouvrez le fichier `EXECUTER-MAINTENANT-fix-incident-functions.sql`
2. Copiez tout son contenu
3. Collez-le dans le SQL Editor de Supabase
4. Cliquez sur **Run** (ou Ctrl+Enter)

### Étape 3 : Vérifier
Vous devriez voir en résultat :

| routine_name | routine_type |
|--------------|--------------|
| change_incident_status | FUNCTION |
| resolve_incident | FUNCTION |

### Étape 4 : Tester
1. Retournez dans votre application
2. Allez dans "Gestion des incidents"
3. Cliquez sur un statut pour le changer
4. Ça devrait fonctionner !

## Ce que font ces fonctions

### change_incident_status
- Permet de changer le statut d'un incident entre :
  - `actif` - incident ouvert
  - `en_cours` - traitement en cours
  - `ignore` - incident ignoré

### resolve_incident
- Marque l'incident comme résolu
- Met à jour automatiquement la date d'expiration du document concerné
- Ferme les notifications associées

## Impact
- ✅ Aucune modification du code frontend
- ✅ Aucune modification des autres fonctionnalités
- ✅ Solution isolée qui ne touche que la gestion des incidents
- ✅ Pas de risque de régression
