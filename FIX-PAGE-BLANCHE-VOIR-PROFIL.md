# Correction - Page blanche lors du clic sur "Voir le profil"

## Problème

Quand vous cliquez sur le bloc "Documents manquants" puis sur "Voir le profil" pour un salarié, vous obtenez une page blanche.

## Cause identifiée

Le modal du profil salarié s'affichait avant que l'état `isModalOpen` ne soit correctement initialisé, ce qui pouvait causer des erreurs de rendu et une page blanche.

## Corrections apportées

### 1. Condition d'affichage du modal renforcée

**Fichier**: `src/components/EmployeeList.tsx` (ligne ~1072)

**Avant**:
```typescript
{selectedEmployee && (
  <EmployeeDetailModal...
```

**Après**:
```typescript
{selectedEmployee && isModalOpen && (
  <EmployeeDetailModal...
```

Maintenant, le modal ne s'affiche que si :
- Un employé est sélectionné (`selectedEmployee`)
- **ET** le modal est explicitement ouvert (`isModalOpen`)

### 2. Ajout de logs de debug

Des messages de console ont été ajoutés pour faciliter le diagnostic si le problème persiste :
- Log quand on recherche un profil
- Log quand le profil est trouvé
- Erreur claire si le profil n'est pas trouvé dans la liste

## Comment tester

1. Allez sur la page "Documents manquants"
2. Cliquez sur "Voir le profil" pour un salarié
3. Le profil devrait s'ouvrir correctement dans un modal

## Si le problème persiste

Ouvrez la console du navigateur (F12) et vérifiez les messages :
- ✅ "Profil trouvé" = Le profil a été chargé correctement
- ❌ "Profil non trouvé" = Le profil n'existe pas ou l'ID est incorrect

Dans ce cas, vérifiez :
1. Que le salarié a bien le statut "actif"
2. Que la fonction SQL `get_missing_documents_by_salarie()` retourne le bon ID
3. Que l'ID correspond bien à un profil existant

## Build

L'application compile correctement avec ces modifications.
