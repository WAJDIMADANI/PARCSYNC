# ✅ Résumé : Correction des incidents de contrats

## Problèmes résolus

### 1. Boucle infinie de rechargements ✅
**Cause :** `detect_and_expire_incidents()` appelé dans `fetchIncidents()` qui déclenchait le listener en boucle

**Solution :** Appel RPC uniquement au montage initial du composant

### 2. Comptage incorrect des CDD ✅
**Cause :** Vue SQL `v_incidents_contrats_affichables` avec logique différente du Dashboard (9 CDD au lieu de 0)

**Solution :** Fonction RPC `get_cdd_expires()` avec logique identique au Dashboard

### 3. Comptage incorrect des avenants ✅
**Cause :** Vue SQL générique sans logique spécifique aux avenants

**Solution :** Fonction RPC `get_avenants_expires()` avec logique exacte

## Nouvelles fonctions SQL

### `get_cdd_expires()`
- Lit directement depuis la table `profil`
- Calcule `GREATEST(date_fin, date_fin_avenant1, date_fin_avenant2)`
- Exclut les profils avec CDI actif
- Filtre sur les 30 prochains jours
- Retourne les CDD qui vont expirer

### `get_avenants_expires()`
- Vérifie `modele_contrat LIKE '%Avenant%'`
- Calcule `GREATEST(avenant_1_date_fin, avenant_2_date_fin)`
- Exclut les profils avec CDI actif
- Filtre sur les contrats déjà expirés (`< CURRENT_DATE`)
- Retourne les avenants expirés

## Architecture avant/après

### Avant
```
IncidentsList.tsx
  ↓
v_incidents_contrats_affichables (vue SQL unique)
  ↓
Table incident
  ↓
⚠️ Logique SQL différente du Dashboard
⚠️ 9 CDD incorrects affichés
```

### Après
```
IncidentsList.tsx
  ├─→ get_cdd_expires() (RPC)
  │    └─→ Table profil + contrat
  │         └─→ ✅ Logique identique Dashboard
  │
  └─→ get_avenants_expires() (RPC)
       └─→ Table profil + contrat
            └─→ ✅ Logique exacte avenants
```

## Fichiers modifiés

1. **src/components/IncidentsList.tsx**
   - Correction boucle infinie
   - Utilise `get_cdd_expires()`
   - Utilise `get_avenants_expires()`
   - Ne dépend plus de `v_incidents_contrats_affichables`

2. **create-get-cdd-expires-function.sql**
   - Nouvelle fonction pour les CDD

3. **create-get-avenants-expires-function.sql**
   - Nouvelle fonction pour les avenants

## Actions requises

### 1. Exécuter les 2 fichiers SQL dans Supabase SQL Editor

**Dans l'ordre :**
```bash
1. create-get-cdd-expires-function.sql
2. create-get-avenants-expires-function.sql
```

### 2. Rafraîchir l'application

### 3. Vérifier dans la console
```javascript
📊 CDD expirés depuis RPC: 0  // ✅ Correct
📊 Avenants expirés depuis RPC: X
📊 Compteurs incidents (logique Dashboard):
  - cdd_expires_depuis_rpc: 0
  - avenant_expires_depuis_vue: X
  - total_contrats_expires: X
  - autres_incidents: X
```

## Avantages de la solution

✅ **Cohérence** : Logique identique Dashboard ↔ Incidents
✅ **Maintenabilité** : Code SQL dans des fonctions dédiées
✅ **Performance** : Calcul optimisé avec index
✅ **Fiabilité** : Plus de boucle infinie
✅ **Clarté** : Séparation CDD / avenants

## Notes techniques

- Les profils avec CDI actif sont toujours exclus
- Les CDD vérifient les 30 prochains jours (alerte anticipée)
- Les avenants vérifient les contrats déjà expirés
- Les IDs des incidents sont générés dynamiquement
- Format compatible avec le reste de l'interface
