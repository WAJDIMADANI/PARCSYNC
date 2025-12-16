# Correction : CDI marqués comme CDD

## Problème identifié

**Tous les CDI s'affichaient comme "Expiré"** car ils étaient marqués comme 'cdd' dans la base de données.

### Cause racine
Dans `ImportSalariesBulk.tsx` ligne 949-963 :

```javascript
// Avant (INCORRECT)
} else {
  // Par défaut, si pas de date_fin et pas d'indication claire,
  // on considère que c'est un CDD temporaire
  contractType = 'cdd';  // ❌ MAUVAIS PAR DÉFAUT
}
```

**Résultat** : Tous les contrats sans mention explicite de "CDI" ou "CDD" dans `modele_contrat` étaient marqués comme 'cdd', même s'ils n'avaient pas de date de fin.

### Impact
- CDI sans date_fin → marqués 'cdd'
- getActualContractStatus() voyait type='cdd' → cherchait date_fin
- Comme date_fin est NULL pour les CDI, ils apparaissaient "Expiré"

---

## Solutions appliquées

### 1. Fix du code d'import (ImportSalariesBulk.tsx)

```javascript
// Après (CORRECT)
} else {
  // ✅ FIX: Si pas de date_fin et pas d'indication claire,
  // c'est un CDI (contrat sans terme)
  contractType = 'cdi';
  console.log(`📋 Ligne ${emp.rowNumber}: Contrat sans date_fin détecté → CDI par défaut`);
}
```

**Logique** : Un contrat **sans date de fin** = CDI par définition

### 2. Migration SQL pour corriger la base

**Fichier** : `FIX-CDI-MARKED-AS-CDD.sql`

```sql
-- Corriger tous les contrats marqués 'cdd' sans date_fin → 'cdi'
UPDATE contrat
SET type = 'cdi'
WHERE type = 'cdd'
  AND date_fin IS NULL;
```

### 3. Logs de debug ajoutés (EmployeeList.tsx)

```javascript
console.log('🔍 Full contract object:', activeContract);
console.log('📝 Contract type from:', {
  'from type': activeContract.type,
  'from variables.type_contrat': activeContract.variables?.type_contrat,
  'from modele_id': activeContract.modele_id,
  'all variables': activeContract.variables
});
```

---

## À faire maintenant

### Étape 1: Exécuter la migration SQL

1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier-coller le contenu de `FIX-CDI-MARKED-AS-CDD.sql`
3. Exécuter la requête
4. Vérifier les résultats :
   - Nombre de contrats corrigés
   - Répartition CDI/CDD après correction

### Étape 2: Vérifier dans l'interface

1. Recharger la page (F5)
2. Ouvrir la console (F12)
3. Regarder les logs de debug :
   - `contractType` devrait maintenant montrer 'cdi' pour les CDI
   - `isCDI` devrait être `true` pour les CDI
   - Les CDI ne devraient plus afficher "Expiré"

### Étape 3: Retirer les logs de debug (optionnel)

Une fois le problème confirmé résolu, vous pouvez retirer les `console.log` ajoutés dans `EmployeeList.tsx` lignes 334-351.

---

## Vérification rapide

Après avoir exécuté la migration, vérifiez :

```sql
-- Voir la répartition des types de contrats
SELECT
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN date_fin IS NULL THEN 1 END) as sans_date_fin,
  COUNT(CASE WHEN date_fin IS NOT NULL THEN 1 END) as avec_date_fin
FROM contrat
GROUP BY type
ORDER BY type;
```

**Résultat attendu** :
- CDI : tous avec `date_fin IS NULL`
- CDD : tous avec `date_fin IS NOT NULL`
- Avenant : peuvent avoir ou non date_fin

---

## Prévention

Les futurs imports utiliseront maintenant la logique correcte :
- **Avec date_fin** = CDD
- **Sans date_fin** = CDI

Plus de CDI marqués comme CDD par erreur !
