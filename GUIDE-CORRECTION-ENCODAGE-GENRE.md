# Guide de correction de l'encodage UTF-8 et standardisation des valeurs de genre

## Problème identifié

Le caractère accentué "é" dans "Féminin" s'affichait comme "F�minin" dans l'interface, indiquant un problème d'encodage UTF-8.

De plus, l'application utilisait des valeurs incohérentes pour le genre :
- Certains composants utilisaient "Masculin" / "Féminin"
- D'autres utilisaient "Homme" / "Femme"

## Solution implémentée

### 1. Migration SQL pour corriger les données

**Fichier créé** : `fix-genre-encoding-and-standardize.sql`

Cette migration :
- Corrige les valeurs mal encodées dans la base de données (F�minin → Femme)
- Standardise toutes les valeurs sur "Homme" / "Femme" / "Autre"
- S'applique à toutes les tables : `salarie`, `vivier`, `candidat`

**Action requise** : Exécutez cette migration SQL sur votre base de données Supabase

```bash
# Connectez-vous à votre base Supabase et exécutez le fichier SQL
psql <votre_connexion_supabase> -f fix-genre-encoding-and-standardize.sql
```

### 2. Constante partagée pour les valeurs de genre

**Fichier créé** : `src/constants/genreOptions.ts`

Ce fichier centralise les valeurs de genre possibles :
- Homme
- Femme
- Autre

Avantages :
- Évite les incohérences dans l'application
- Facilite les modifications futures
- Utilise des valeurs sans accents pour éviter les problèmes d'encodage

### 3. Mise à jour des composants

**Composants mis à jour** :
- `src/components/EmployeeList.tsx` - Remplacé "Masculin"/"Féminin" par constantes
- `src/components/Apply.tsx` - Utilisation des constantes
- `src/components/VivierList.tsx` - Utilisation des constantes + ajout de "Autre"
- `src/components/CandidateList.tsx` - Utilisation des constantes + ajout de "Autre"
- `src/components/ImportSalarieTest.tsx` - Utilisation des constantes

Tous les composants utilisent maintenant la constante `GENRE_OPTIONS` importée depuis `src/constants/genreOptions.ts`.

## Avantages de cette solution

1. **Pas de problèmes d'encodage** : Les valeurs "Homme" / "Femme" ne contiennent pas de caractères accentués
2. **Cohérence** : Toute l'application utilise les mêmes valeurs
3. **Maintenabilité** : Un seul endroit pour modifier les options de genre
4. **Extensibilité** : Facile d'ajouter de nouvelles options à l'avenir

## Vérification après déploiement

1. Vérifiez que la migration SQL s'est bien exécutée :
```sql
SELECT DISTINCT genre, COUNT(*)
FROM salarie
WHERE genre IS NOT NULL
GROUP BY genre;
```

Résultat attendu : Seulement "Homme", "Femme", et "Autre"

2. Testez l'interface :
   - Modifiez un employé et vérifiez que les options de genre s'affichent correctement
   - Créez un nouveau candidat et vérifiez les options de genre
   - Vérifiez que les valeurs existantes s'affichent correctement

## Notes importantes

- Cette modification est **non destructive** : elle ne supprime aucune donnée
- Les anciennes valeurs ("Masculin", "Féminin") sont automatiquement converties
- Le build de l'application a été testé et réussit sans erreurs
