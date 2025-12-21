# Test de la correction Dashboard RH - Carte Incidents

## Objectif du test

Vérifier que la carte "Incidents" du Tableau de bord RH affiche maintenant le **nombre correct** d'incidents, en excluant les incidents legacy et en étant cohérent avec la page Incidents.

## Avant le test

Assurez-vous que :
- Le projet est compilé : `npm run build` ✅
- L'application est démarrée
- Vous êtes connecté avec un compte ayant accès au Dashboard RH

## Test 1 : Vérifier le nombre total

### Étape 1 : Ouvrir le Dashboard RH

1. Naviguer vers le Tableau de bord RH
2. Localiser la carte **"Incidents"** (icône triangle orange)
3. Noter le nombre total affiché

**Exemple :**
```
Incidents
[X]
Y ce mois
```

Noter la valeur de **X** : _______

### Étape 2 : Ouvrir la page Incidents

1. Cliquer sur la carte "Incidents" (ou naviguer vers la page Incidents)
2. Compter les incidents dans chaque onglet :

**Onglet Documents :**
- Titre de séjour : _______
- Visite médicale : _______
- Permis de conduire : _______
- **Total Documents** : _______

**Onglet Contrats CDD :**
- Nombre de CDD expirés : _______

**Onglet Avenants :**
- Nombre d'avenants expirés : _______

**Total page Incidents :**
```
Total = Documents + CDD + Avenants = _______
```

### Étape 3 : Vérifier la cohérence

```
Total Dashboard = _______
Total page Incidents = _______

✓ Les deux nombres doivent être IDENTIQUES
```

Si les nombres sont différents, la correction n'a pas été appliquée correctement.

## Test 2 : Vérifier l'exclusion des legacy

### Requête SQL (optionnelle)

Exécuter dans le SQL Editor de Supabase :

```sql
-- Compter les incidents legacy (doublons)
SELECT
  type,
  COUNT(*) as count
FROM public.incident
WHERE type IN ('contrat_expirer', 'avenant_expirer')
GROUP BY type;
```

**Résultat attendu :**
```
type              | count
contrat_expirer   | 199
avenant_expirer   | 61
```

Ces incidents existent toujours dans la base mais **ne doivent PAS** être comptés dans le dashboard.

### Vérification

Si le nombre total du Dashboard = Total page Incidents, alors :

✅ **Les incidents legacy sont bien exclus**

Car la page Incidents utilise les RPC et n'inclut pas les legacy.

## Test 3 : Vérifier la répartition par type

Sur le Dashboard RH, dans la section détaillée de la carte Incidents, vérifier la répartition par type.

**Types attendus (seulement si > 0) :**
- Titre de séjour
- Visite médicale
- Permis de conduire
- Contrat CDD expiré
- Avenant expiré

**Types qui NE DOIVENT PAS apparaître :**
- ❌ contrat_expirer
- ❌ avenant_expirer
- ❌ Tout autre type inconnu

## Test 4 : Vérifier "ce mois"

### Dashboard RH

Noter le nombre d'incidents "ce mois" : _______

### Page Incidents

Compter manuellement les incidents créés ce mois (vérifier les dates).

Les deux nombres doivent être cohérents (avec une marge d'erreur selon les dates exactes de création).

## Test 5 : Vérifier les incidents récents

Sur le Dashboard RH, dans les détails de la carte Incidents, vérifier la liste des "Incidents récents".

**Vérifications :**
- ✅ Les incidents sont triés du plus récent au plus ancien
- ✅ Maximum 5 incidents affichés
- ✅ Pas d'incidents de type legacy ('contrat_expirer', 'avenant_expirer')

## Résultats attendus

### Avant la correction

```
Dashboard : ~260 incidents
Page Incidents : ~10-30 incidents (nombre réel)
❌ INCOHÉRENT
```

### Après la correction

```
Dashboard : X incidents
Page Incidents : X incidents
✅ COHÉRENT
```

Où X = nombre réel d'incidents (sans les 260 legacy).

## Résolution de problèmes

### Problème : Les nombres ne correspondent pas

**Causes possibles :**
1. La correction n'a pas été appliquée
   - Solution : Vérifier que le fichier `src/components/RHDashboard.tsx` a bien été modifié
   - Solution : Recompiler le projet avec `npm run build`

2. Le cache du navigateur
   - Solution : Vider le cache ou ouvrir en mode navigation privée
   - Solution : Faire un hard refresh (Ctrl+Shift+R ou Cmd+Shift+R)

3. Les RPC ne fonctionnent pas
   - Solution : Vérifier que `get_contrats_expires()` et `get_avenants_expires()` existent
   - Solution : Tester les RPC manuellement dans le SQL Editor

### Problème : Types legacy encore visibles

**Cause :** Le code n'exclut pas correctement les types legacy

**Solution :**
1. Vérifier la fonction `fetchIncidentsStats()` dans `RHDashboard.tsx`
2. Rechercher `LEGACY_TYPES` et confirmer qu'ils sont bien exclus
3. Vérifier que seuls les types valides sont comptés

### Problème : Erreur console JavaScript

**Solution :**
1. Ouvrir la console développeur (F12)
2. Rechercher les erreurs dans l'onglet "Console"
3. Vérifier notamment les erreurs liées à :
   - `fetchIncidentsStats`
   - `get_contrats_expires`
   - `get_avenants_expires`

## Checklist de validation

- [ ] Total Dashboard = Total page Incidents
- [ ] Incidents legacy exclus (vérification SQL)
- [ ] Répartition par type correcte (pas de types legacy)
- [ ] Incidents récents affichés (max 5, triés par date)
- [ ] "Ce mois" cohérent entre Dashboard et page Incidents
- [ ] Aucune erreur dans la console développeur

## Succès du test

Si tous les points de la checklist sont validés :

✅ **La correction est appliquée avec succès !**

La carte "Incidents" du Dashboard RH affiche maintenant le nombre correct d'incidents, en excluant les incidents legacy et en parfaite cohérence avec la page Incidents.

## Support

En cas de problème, consulter :
- `CORRECTION-DASHBOARD-RH-INCIDENTS.md` - Documentation complète
- `RESUME-CORRECTION-DASHBOARD-INCIDENTS.txt` - Résumé rapide
- Console développeur (F12) - Erreurs JavaScript
- Logs Supabase - Erreurs serveur/RPC
