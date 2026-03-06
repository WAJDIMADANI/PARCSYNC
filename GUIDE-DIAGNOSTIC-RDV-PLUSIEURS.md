# Guide de diagnostic : Plusieurs RDV ne s'affichent pas

## 🎯 Problème

Vous voyez **1 seul RDV** dans la carte et le filtre, alors que vous avez **plusieurs notifications RDV** dans la base de données.

## 🔍 Étapes de diagnostic

### 1. Vérifier la console du navigateur

Après avoir rechargé la page "Boîte de Réception", vérifiez ces logs dans la console (F12) :

```javascript
🔍 Tous les messages inbox bruts: [...]
// ☝️ Liste TOUS les messages dans inbox avec leur type

🔍 RDV dans inbox (brut): X trouvés
// ☝️ Nombre de messages avec type = 'rdv_visite_medicale'

🔍 formattedDemandes total: X
// ☝️ Nombre de messages après formatage

📅 RDV Visite Médicale détails: {
  total: X,
  lus: X,
  nonLus: X,
  ...
}
// ☝️ Détails des RDV comptés
```

### 2. Identifier le problème

#### Cas A : "RDV dans inbox (brut): 0 trouvés"
**Problème** : Aucun RDV n'a le type `rdv_visite_medicale` dans la base
**Solution** : Exécuter le script de correction ci-dessous

#### Cas B : "RDV dans inbox (brut): 5 trouvés" mais "total: 1"
**Problème** : Les RDV sont perdus lors du formatage
**Solution** : Vérifier les permissions de l'utilisateur connecté

#### Cas C : "RDV dans inbox (brut): 1 trouvé"
**Problème** : Un seul RDV existe réellement dans la base
**Solution** : Créer plus de RDV ou vérifier pourquoi ils ne sont pas créés

## 🛠️ Solutions

### Solution 1 : Corriger le type des notifications

Si certains RDV n'ont pas le bon type, exécutez ce script SQL :

```sql
-- Dans le SQL Editor de Supabase
-- Exécuter: FIX-TYPE-RDV-VISITE-MEDICALE-MAINTENANT.sql

-- Corriger tous les messages RDV qui n'ont pas le bon type
UPDATE inbox
SET
  type = 'rdv_visite_medicale',
  updated_at = NOW()
WHERE reference_type = 'profil'
  AND (
    titre ILIKE '%rdv%visite%médicale%'
    OR titre ILIKE '%visite%médicale%'
    OR titre ILIKE '%rappel%rdv%'
  )
  AND (type IS NULL OR type != 'rdv_visite_medicale');

-- Vérifier le résultat
SELECT
  COUNT(*) as total_rdv
FROM inbox
WHERE type = 'rdv_visite_medicale';
```

### Solution 2 : Vérifier les permissions utilisateur

Les RDV sont créés **uniquement pour les utilisateurs avec permissions RH** :

```sql
-- Vérifier vos permissions
SELECT
  au.id,
  au.email,
  au.nom,
  au.prenom,
  up.section_id,
  up.actif
FROM app_utilisateur au
INNER JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
WHERE au.email = 'VOTRE_EMAIL@example.com';

-- Les permissions requises sont :
-- - rh/salaries
-- - rh/demandes
-- - admin/utilisateurs
```

Si vous n'avez pas ces permissions, les notifications RDV ne seront pas créées pour vous.

### Solution 3 : Créer des RDV de test

Pour créer plusieurs RDV de test et vérifier que tout fonctionne :

```sql
-- Dans le SQL Editor de Supabase
-- Exécuter: CREER-RDV-TEST-MULTIPLES.sql

-- Ce script va :
-- 1. Assigner des dates de RDV à 5 salariés différents
-- 2. Exécuter la fonction de génération de notifications
-- 3. Créer plusieurs notifications RDV
```

### Solution 4 : Vérifier que les RDV sont pour le bon utilisateur

Les notifications RDV sont créées **par utilisateur**. Si vous êtes connecté avec un utilisateur, vérifiez que les RDV lui sont bien assignés :

```sql
-- Vérifier vos RDV
SELECT
  i.id,
  i.titre,
  i.type,
  i.statut,
  i.lu,
  TO_CHAR(i.created_at, 'DD/MM/YYYY HH24:MI') as date_creation,
  i.utilisateur_id,
  au.email
FROM inbox i
INNER JOIN app_utilisateur au ON i.utilisateur_id = au.id
WHERE i.type = 'rdv_visite_medicale'
  AND au.email = 'VOTRE_EMAIL@example.com'
ORDER BY i.created_at DESC;
```

## 📊 Checklist de vérification

- [ ] J'ai vérifié la console du navigateur
- [ ] J'ai compté les "RDV dans inbox (brut)"
- [ ] J'ai vérifié que le type est bien `rdv_visite_medicale`
- [ ] J'ai vérifié que mon utilisateur a les permissions RH
- [ ] J'ai vérifié que les RDV sont assignés à mon utilisateur
- [ ] J'ai exécuté le script de correction si nécessaire
- [ ] J'ai rechargé la page après les corrections

## 🎯 Résultat attendu

Après avoir suivi ces étapes, vous devriez voir :

### Dans la console du navigateur
```javascript
🔍 RDV dans inbox (brut): 5 trouvés
// ☝️ Tous vos RDV sont chargés

📅 RDV Visite Médicale détails: {
  total: 5,
  lus: 2,
  nonLus: 3,
  ouverts: 3,
  consultes: 1,
  traites: 1,
  liste: [...]
}
// ☝️ Tous vos RDV sont comptés correctement
```

### Dans l'interface
- **Carte RDV** : Affiche 5
- **Filtre RDV** : Affiche les 5 RDV quand cliqué

## 🚨 Si le problème persiste

Si après toutes ces vérifications vous voyez toujours 1 seul RDV :

1. **Vérifier la base de données directement** :
```sql
SELECT COUNT(*) FROM inbox WHERE type = 'rdv_visite_medicale';
```

2. **Vérifier que vous êtes connecté avec le bon compte** :
   - Les RDV sont créés par utilisateur
   - Changez d'utilisateur pour vérifier

3. **Créer manuellement une notification de test** :
```sql
-- Remplacer VOTRE_USER_ID par votre ID d'utilisateur
INSERT INTO inbox (
  utilisateur_id,
  type,
  titre,
  description,
  contenu,
  reference_type,
  statut,
  lu,
  created_at,
  updated_at
) VALUES (
  'VOTRE_USER_ID',
  'rdv_visite_medicale',
  'RDV TEST',
  'Test de notification RDV',
  'Ceci est un test',
  'profil',
  'nouveau',
  false,
  NOW(),
  NOW()
);
```

4. **Vérifier les fichiers modifiés** :
   - `src/components/InboxPage.tsx` : Contient les logs de debug
   - Logs détaillés à chaque étape du chargement

## 📁 Fichiers créés

1. **FIX-TYPE-RDV-VISITE-MEDICALE-MAINTENANT.sql** - Corrige le type des notifications
2. **CREER-RDV-TEST-MULTIPLES.sql** - Crée plusieurs RDV de test
3. **DIAGNOSTIC-RDV-VISITE-MEDICALE-COMPLET.sql** - Script de diagnostic complet
4. **GUIDE-DIAGNOSTIC-RDV-PLUSIEURS.md** - Ce guide

## ✅ Confirmation

Une fois le problème résolu, vous devriez voir dans la console :

```javascript
📅 RDV Visite Médicale détails: {
  total: 5,  // ← Nombre correct de RDV
  liste: [
    { titre: 'Rappel RDV...', statut: 'nouveau', lu: false, ... },
    { titre: 'RDV Visite...', statut: 'nouveau', lu: false, ... },
    { titre: 'RDV Visite...', statut: 'nouveau', lu: false, ... },
    { titre: 'RDV Visite...', statut: 'nouveau', lu: false, ... },
    { titre: 'RDV Visite...', statut: 'nouveau', lu: false, ... }
  ]
}
```

Et dans l'interface :
- Carte : **5** RDV
- Filtre : Affiche **tous les 5 RDV**
