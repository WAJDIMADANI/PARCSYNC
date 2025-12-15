# 🚀 Exécution de la fonction get_avenants_expires

## Contexte

Après avoir corrigé les CDD, on applique la même logique pour les avenants :
- Utiliser une fonction RPC au lieu de la vue SQL
- Appliquer la logique exacte basée sur `modele_contrat LIKE '%Avenant%'`
- Calculer GREATEST des dates d'avenants
- Exclure les profils avec CDI actif

## Solution

Nouvelle fonction `get_avenants_expires()` avec la logique exacte :
```sql
WHERE modele_contrat LIKE '%Avenant%'
  AND (avenant_1_date_fin IS NOT NULL OR avenant_2_date_fin IS NOT NULL)
  AND GREATEST(
    COALESCE(avenant_1_date_fin, '1900-01-01'::date),
    COALESCE(avenant_2_date_fin, '1900-01-01'::date)
  ) < CURRENT_DATE
```

## Étapes d'exécution

### 1. Exécuter les deux fichiers SQL dans l'ordre

Dans Supabase SQL Editor :

**a) D'abord les CDD :**
```
create-get-cdd-expires-function.sql
```

**b) Ensuite les avenants :**
```
create-get-avenants-expires-function.sql
```

### 2. Vérifier les modifications du code

`IncidentsList.tsx` utilise maintenant :
- ✅ `get_cdd_expires()` pour les CDD
- ✅ `get_avenants_expires()` pour les avenants
- ❌ Plus de vue `v_incidents_contrats_affichables`

### 3. Tester

1. Rafraîchir l'application
2. Aller dans "Incidents"
3. Vérifier dans la console :
   ```
   📊 CDD expirés depuis RPC: 0
   📊 Avenants expirés depuis RPC: X
   📊 Compteurs incidents (logique Dashboard):
     - cdd_expires_depuis_rpc: 0
     - avenant_expires_depuis_vue: X
   ```

## Avant / Après

**Avant :**
- Vue SQL unique pour CDD et avenants
- Logique SQL différente du Dashboard
- 9 CDD incorrects affichés

**Après :**
- 2 fonctions RPC séparées
- Logique identique au Dashboard
- Comptage cohérent partout
- 0 CDD (correct)
- Avenants calculés avec GREATEST des dates

## Fichiers créés/modifiés

1. ✅ `create-get-cdd-expires-function.sql` - Fonction CDD
2. ✅ `create-get-avenants-expires-function.sql` - Fonction avenants
3. ✅ `src/components/IncidentsList.tsx` - Utilise les 2 RPC
4. ✅ `EXECUTER-FUNCTION-CDD-EXPIRES.md` - Guide CDD
5. ✅ `EXECUTER-AVENANTS-EXPIRES.md` - Ce guide

## Notes importantes

- Les deux fonctions excluent les profils avec CDI actif
- Les CDD vérifient les 30 prochains jours
- Les avenants vérifient les contrats déjà expirés (< CURRENT_DATE)
- La vue `v_incidents_contrats_affichables` n'est plus utilisée du tout
