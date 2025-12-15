# 🚀 Exécution de la fonction get_cdd_expires

## Contexte

Le problème : `v_incidents_contrats_affichables` retournait 9 CDD alors que le Dashboard en affiche 0.

## Solution

Créer une fonction RPC qui utilise **exactement la même logique que le Dashboard** :
- Calcul de `GREATEST(date_fin, date_fin_avenant1, date_fin_avenant2)`
- Exclusion des profils avec CDI actif
- Filtrage sur les 30 prochains jours

## Étapes d'exécution

### 1. Exécuter le fichier SQL

Dans Supabase SQL Editor, exécutez le contenu de :
```
create-get-cdd-expires-function.sql
```

### 2. Vérifier les modifications du code

`IncidentsList.tsx` a été modifié pour :
- Appeler `get_cdd_expires()` pour les CDD (logique Dashboard)
- Utiliser `v_incidents_contrats_affichables` uniquement pour les avenants
- Fusionner les deux résultats

### 3. Tester

1. Rafraîchir l'application
2. Aller dans "Incidents"
3. Vérifier dans la console :
   ```
   📊 CDD expirés depuis RPC: 0
   📊 Compteurs incidents (logique Dashboard):
     - cdd_expires_depuis_rpc: 0
     - avenant_expires_depuis_vue: X
   ```

## Avant / Après

**Avant :**
- Vue SQL retournait 9 CDD incorrects
- Logique différente du Dashboard
- Confusion pour les utilisateurs

**Après :**
- Fonction RPC avec logique identique au Dashboard
- 0 CDD affichés (comme dans le Dashboard)
- Comptage cohérent partout

## Fichiers modifiés

1. ✅ `create-get-cdd-expires-function.sql` - Nouvelle fonction SQL
2. ✅ `src/components/IncidentsList.tsx` - Utilise la nouvelle fonction

## Notes importantes

- Les CDD sont maintenant comptés directement depuis la table `profil`
- La vue `v_incidents_contrats_affichables` n'est plus utilisée pour les CDD
- Les avenants continuent d'utiliser la vue (ils n'ont pas de problème)
