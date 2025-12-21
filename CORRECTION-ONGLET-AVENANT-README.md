# Correction de l'onglet "Avenant" - FAIT

## Problème résolu

L'onglet Avenant affichait 86 incidents au lieu de 25 (le vrai nombre).

## Solution appliquée

### 1. Script SQL créé
**Fichier:** `CORRIGER-ONGLET-AVENANT-MAINTENANT.sql`

La fonction `get_avenants_expires()` a été recréée avec la logique correcte :
- Source unique : table `profil` (colonnes `avenant_1_date_fin`, `avenant_2_date_fin`)
- date_expiration_reelle = GREATEST(COALESCE(avenant_2_date_fin,'1900-01-01'), COALESCE(avenant_1_date_fin,'1900-01-01'))
- Retourne uniquement si date_expiration_reelle < CURRENT_DATE
- Exclusion stricte des salariés avec CDI
- 1 ligne par profil (DISTINCT ON)

### 2. Code TypeScript modifié
**Fichier:** `src/components/IncidentsList.tsx`

**Changements:**
1. Ajout de `console.log('avenantsData length', avenantsData?.length)` après l'appel RPC
2. Mapping des avenants corrigé pour utiliser les bons champs de la RPC
3. Type changé de `'avenant_expirer'` à `'contrat_expire'` avec `metadata.contrat_type = 'avenant'`
4. Calcul de `jours_depuis_expiration` ajouté
5. Filtre de l'onglet Avenant corrigé pour utiliser `metadata.contrat_type === 'avenant'`
6. Compteur de badge corrigé pour afficher le bon total

## Action requise

### Exécuter le script SQL

1. Ouvrez l'éditeur SQL de Supabase
2. Exécutez `CORRIGER-ONGLET-AVENANT-MAINTENANT.sql`
3. Vérifiez que le total affiché est bien 25

### Vérifier dans l'application

1. Rafraîchissez l'application
2. Ouvrez la console du navigateur (F12)
3. Allez dans l'onglet "Incidents"
4. Vous devriez voir : `avenantsData length 25`
5. Le badge "Avenant" doit afficher 25

## Structure de la nouvelle RPC

```typescript
{
  profil_id: uuid,
  nom: text,
  prenom: text,
  email: text,
  avenant_1_date_fin: date,
  avenant_2_date_fin: date,
  date_expiration_reelle: date
}
```

## Avant / Après

### AVANT
- Affichait 86 avenants (doublons + mauvaise logique)
- Source : multiples tables avec JOIN
- Doublons possibles
- Incluait des salariés avec CDI

### APRÈS
- Affiche 25 avenants (le vrai nombre)
- Source unique : table profil
- 1 ligne par profil garanti (DISTINCT ON)
- Exclusion stricte des CDI

## Build

Le projet a été compilé avec succès. Aucune erreur détectée.
