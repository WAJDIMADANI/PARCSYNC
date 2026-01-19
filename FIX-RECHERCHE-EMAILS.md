# ✅ Correction de la recherche d'emails

## 🔧 Ce qui a été corrigé

### Problème
Quand vous tapiez un matricule, aucun salarié ne s'affichait dans les résultats.

### Causes possibles
1. Le matricule était peut-être un nombre et pas une string
2. Le dropdown ne gérait pas bien les cas vides
3. Pas d'indication de chargement

### Solutions appliquées

1. **Conversion du matricule en string** :
   - Le matricule est maintenant converti avec `String(p.matricule)` pour gérer tous les types
   - La recherche fonctionne maintenant que le matricule soit un nombre ou une string

2. **Amélioration de l'affichage** :
   ```
   Dupont Jean
   Matricule: 1234                    jean@example.com
   ```
   Le matricule est sur une ligne séparée pour mieux le voir

3. **Indicateurs visuels** :
   - Compteur : "(42 salariés disponibles)" à côté du label
   - Loader pendant le chargement
   - Message si aucun salarié disponible
   - Message "Aucun salarié trouvé pour X" si pas de résultat

4. **Meilleure gestion du dropdown** :
   - Se ferme automatiquement après sélection
   - Se ferme quand on clique ailleurs (blur)
   - Ne s'affiche pas pendant le chargement

## 🧪 Comment tester

### Test 1 : Recherche par matricule
1. Allez dans **RH > Emails**
2. Vérifiez qu'il y a "(**X** salariés disponibles)" affiché
3. Tapez un matricule existant (ex: "1234")
4. Vous devriez voir le salarié s'afficher avec :
   - Nom et prénom en gras
   - "Matricule: 1234" en petit
   - Email à droite

### Test 2 : Recherche par nom
1. Tapez un nom (ex: "Dupont")
2. Tous les Dupont devraient s'afficher
3. Cliquez sur l'un d'eux
4. Il apparaît en badge bleu sous la barre de recherche

### Test 3 : Recherche par prénom
1. Tapez un prénom (ex: "Jean")
2. Tous les Jean devraient s'afficher
3. Maximum 10 résultats affichés

### Test 4 : Aucun résultat
1. Tapez "zzzzz" (qui n'existe pas)
2. Vous devriez voir : "Aucun salarié trouvé pour 'zzzzz'"

### Test 5 : Aucun salarié chargé
Si vous voyez le message en orange :
```
Aucun salarié disponible. Vérifiez que les salariés ont une adresse email.
```
Cela signifie que :
- Soit il n'y a pas de salariés actifs avec `is_staff = true`
- Soit les salariés n'ont pas d'adresse email renseignée
- Soit `date_sortie` est remplie (salarié sorti)

## 🔍 Debug si ça ne marche toujours pas

### Vérifier dans la console navigateur
1. Ouvrez la console (F12)
2. Allez dans l'onglet Emails
3. Regardez s'il y a des erreurs
4. Vérifiez que les profils se chargent

### Vérifier dans Supabase
```sql
-- Compter les salariés éligibles
SELECT COUNT(*)
FROM profil
WHERE is_staff = true
  AND date_sortie IS NULL
  AND email IS NOT NULL;

-- Voir les matricules
SELECT matricule, nom, prenom, email
FROM profil
WHERE is_staff = true
  AND date_sortie IS NULL
  AND email IS NOT NULL
LIMIT 5;
```

Si le COUNT est 0, alors :
- Vérifiez que `is_staff = true` pour vos salariés
- Vérifiez que `date_sortie IS NULL`
- Vérifiez que `email` est renseigné

### Corriger les données si nécessaire
```sql
-- Activer is_staff pour tous les profils sans date de sortie
UPDATE profil
SET is_staff = true
WHERE date_sortie IS NULL;

-- Exemple : ajouter un email test si manquant
UPDATE profil
SET email = LOWER(prenom || '.' || nom || '@mad-impact.com')
WHERE email IS NULL;
```

## 📊 Format des données attendu

Le composant charge les profils avec cette requête :
```typescript
.from('profil')
.select('id, matricule, nom, prenom, email, is_staff, date_sortie')
.eq('is_staff', true)
.is('date_sortie', null)
.not('email', 'is', null)
.order('nom', { ascending: true })
```

Champs requis :
- `id` : UUID
- `matricule` : string ou number
- `nom` : string
- `prenom` : string
- `email` : string (pas null)
- `is_staff` : true
- `date_sortie` : null

## ✨ Améliorations apportées

| Avant | Après |
|-------|-------|
| Pas de feedback si aucun résultat | "Aucun salarié trouvé pour X" |
| Pas de compteur | "(42 salariés disponibles)" |
| Pas de loader | Spinner pendant chargement |
| Matricule nombre = bug | Conversion en string automatique |
| Dropdown simple | Matricule sur ligne séparée |
| Pas de message si vide | "Aucun salarié disponible..." |

## 🎯 Résultat final

Maintenant quand vous tapez un matricule, nom ou prénom :
- ✅ Résultats instantanés
- ✅ Affichage clair avec matricule visible
- ✅ Messages d'erreur explicites
- ✅ Compteur de salariés disponibles
- ✅ Loader pendant chargement

Testez et dites-moi si ça fonctionne maintenant !
