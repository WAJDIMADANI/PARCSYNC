# Solution complète : Afficher TOUS les RDV Visite Médicale

## ✅ Ce qui a été fait

### 1. Logs de debug ajoutés dans InboxPage.tsx

Le code affiche maintenant 3 niveaux de logs dans la console :

```typescript
// Niveau 1 : Messages inbox bruts (directement depuis Supabase)
🔍 Tous les messages inbox bruts: [...]
// Montre tous les messages avec leur type

// Niveau 2 : RDV filtrés dans inbox
🔍 RDV dans inbox (brut): X trouvés
// Montre combien de messages ont type = 'rdv_visite_medicale'

// Niveau 3 : RDV après formatage
🔍 formattedDemandes total: X
// Montre tous les messages après traitement

// Niveau 4 : Comptage final des RDV
📅 RDV Visite Médicale détails: {
  total: X,
  lus: X,
  nonLus: X,
  consultes: X,
  traites: X,
  ouverts: X,
  liste: [...]
}
```

### 2. Scripts SQL créés

#### A. Diagnostic complet
**Fichier** : `DIAGNOSTIC-RDV-VISITE-MEDICALE-COMPLET.sql`
- Liste tous les messages de type profil
- Compte les RDV par statut
- Identifie tous les types de notifications

#### B. Correction du type
**Fichier** : `FIX-TYPE-RDV-VISITE-MEDICALE-MAINTENANT.sql`
- Corrige les messages RDV qui n'ont pas le bon type
- Met à jour tous les RDV pour avoir `type = 'rdv_visite_medicale'`
- Affiche le résultat après correction

#### C. Création de RDV de test
**Fichier** : `CREER-RDV-TEST-MULTIPLES.sql`
- Crée 5 RDV de test avec des dates différentes
- Exécute la fonction de génération de notifications
- Vérifie que les notifications sont créées

#### D. Guide de diagnostic
**Fichier** : `GUIDE-DIAGNOSTIC-RDV-PLUSIEURS.md`
- Guide pas à pas pour diagnostiquer le problème
- Checklist de vérification
- Solutions pour chaque cas

## 🎯 Le comportement correct

### Ce qui est affiché

La carte et le filtre affichent **TOUS** les RDV sans exception :
- ✅ RDV à venir
- ✅ RDV passés
- ✅ RDV lus
- ✅ RDV non lus
- ✅ RDV ouverts
- ✅ RDV consultés
- ✅ RDV traités
- ✅ **Tous les statuts** (`nouveau`, `ouvert`, `consulte`, `traite`)

### Code source

```typescript
// src/components/InboxPage.tsx, ligne ~349

// AUCUN filtre appliqué, tous les RDV sont comptés
const rdvVisiteMedicale = formattedDemandes.filter(
  d => d.type === 'rdv_visite_medicale'
);
// ☝️ Filtre uniquement sur le type, pas sur statut/lu/date
```

## 🔧 Si vous voyez 1 seul RDV au lieu de plusieurs

### Cas 1 : Le type n'est pas correct

**Symptôme** : Console montre "RDV dans inbox (brut): 0 trouvés"

**Solution** :
```sql
-- Exécuter FIX-TYPE-RDV-VISITE-MEDICALE-MAINTENANT.sql
UPDATE inbox
SET type = 'rdv_visite_medicale', updated_at = NOW()
WHERE reference_type = 'profil'
  AND (titre ILIKE '%rdv%visite%médicale%'
       OR titre ILIKE '%visite%médicale%'
       OR titre ILIKE '%rappel%rdv%')
  AND (type IS NULL OR type != 'rdv_visite_medicale');
```

### Cas 2 : Les RDV sont pour un autre utilisateur

**Symptôme** : Console montre "RDV dans inbox (brut): 5 trouvés" mais vous voyez 1 seul

**Cause** : Les RDV sont créés par utilisateur. Vous êtes peut-être connecté avec un utilisateur qui n'a qu'1 seul RDV.

**Solution** :
```sql
-- Vérifier pour votre utilisateur (remplacer l'email)
SELECT COUNT(*)
FROM inbox
WHERE type = 'rdv_visite_medicale'
  AND utilisateur_id = (
    SELECT id FROM app_utilisateur
    WHERE email = 'VOTRE_EMAIL@example.com'
  );
```

### Cas 3 : Un seul RDV existe réellement

**Symptôme** : Console montre "RDV dans inbox (brut): 1 trouvé"

**Cause** : Il n'y a qu'1 seul RDV dans la base pour votre utilisateur

**Solution** :
```sql
-- Créer plus de RDV de test
-- Exécuter CREER-RDV-TEST-MULTIPLES.sql
```

### Cas 4 : Les permissions manquent

**Symptôme** : Aucun RDV n'est créé

**Cause** : Votre utilisateur n'a pas les permissions RH

**Solution** :
```sql
-- Vérifier vos permissions
SELECT up.section_id, up.actif
FROM app_utilisateur au
INNER JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
WHERE au.email = 'VOTRE_EMAIL@example.com';

-- Permissions requises :
-- - rh/salaries
-- - rh/demandes
-- - admin/utilisateurs
```

## 📊 Exemple de résultat correct

### Console du navigateur
```javascript
🔍 Tous les messages inbox bruts: [
  { id: '...', titre: 'Rappel RDV...', type: 'rdv_visite_medicale', statut: 'nouveau', lu: false },
  { id: '...', titre: 'RDV Visite...', type: 'rdv_visite_medicale', statut: 'nouveau', lu: false },
  { id: '...', titre: 'RDV Visite...', type: 'rdv_visite_medicale', statut: 'nouveau', lu: false },
  { id: '...', titre: 'RDV Visite...', type: 'rdv_visite_medicale', statut: 'consulte', lu: true },
  { id: '...', titre: 'RDV Visite...', type: 'rdv_visite_medicale', statut: 'traite', lu: true }
]

🔍 RDV dans inbox (brut): 5 trouvés [...]

🔍 formattedDemandes total: 5 [...]

📅 RDV Visite Médicale détails: {
  total: 5,
  lus: 2,
  nonLus: 3,
  consultes: 1,
  traites: 1,
  ouverts: 3,
  liste: [
    { titre: 'Rappel RDV...', statut: 'nouveau', lu: false, created_at: '...' },
    { titre: 'RDV Visite...', statut: 'nouveau', lu: false, created_at: '...' },
    { titre: 'RDV Visite...', statut: 'nouveau', lu: false, created_at: '...' },
    { titre: 'RDV Visite...', statut: 'consulte', lu: true, created_at: '...' },
    { titre: 'RDV Visite...', statut: 'traite', lu: true, created_at: '...' }
  ]
}
```

### Interface utilisateur
```
┌──────────────────────────────────┐
│ 📅 RDV Visite Médicale          │
│                                  │
│    5                             │  ← Tous les RDV comptés
│                                  │
│         [Icône calendrier]       │
└──────────────────────────────────┘
```

Filtre cliqué : Affiche les 5 RDV dans la liste

## 🎯 Actions à faire MAINTENANT

### 1. Ouvrir la console du navigateur (F12)

### 2. Recharger la page "Boîte de Réception"

### 3. Vérifier les logs

Cherchez dans la console :
- `🔍 RDV dans inbox (brut): X trouvés`
- `📅 RDV Visite Médicale détails:`

### 4. Si 0 RDV trouvés

Exécutez dans Supabase SQL Editor :
```sql
-- Fichier: FIX-TYPE-RDV-VISITE-MEDICALE-MAINTENANT.sql
UPDATE inbox
SET type = 'rdv_visite_medicale', updated_at = NOW()
WHERE reference_type = 'profil'
  AND (titre ILIKE '%rdv%visite%médicale%'
       OR titre ILIKE '%visite%médicale%'
       OR titre ILIKE '%rappel%rdv%')
  AND (type IS NULL OR type != 'rdv_visite_medicale');
```

### 5. Si 1 seul RDV trouvé

Vérifiez combien de RDV existent pour votre utilisateur :
```sql
SELECT
  i.*,
  au.email
FROM inbox i
INNER JOIN app_utilisateur au ON i.utilisateur_id = au.id
WHERE i.type = 'rdv_visite_medicale'
  AND au.email = 'VOTRE_EMAIL@example.com';
```

### 6. Si pas assez de RDV

Créez des RDV de test :
```sql
-- Fichier: CREER-RDV-TEST-MULTIPLES.sql
-- (voir le contenu complet dans le fichier)
```

## 📁 Fichiers créés/modifiés

### Modifié
1. **src/components/InboxPage.tsx**
   - Ajout de logs détaillés (lignes 197-213, 341-347)
   - Affichage de tous les RDV sans filtre
   - Debug complet à chaque étape

### Créés
1. **FIX-TYPE-RDV-VISITE-MEDICALE-MAINTENANT.sql** - Correction du type
2. **CREER-RDV-TEST-MULTIPLES.sql** - Création de RDV de test
3. **DIAGNOSTIC-RDV-VISITE-MEDICALE-COMPLET.sql** - Diagnostic SQL
4. **GUIDE-DIAGNOSTIC-RDV-PLUSIEURS.md** - Guide pas à pas
5. **SOLUTION-COMPLETE-RDV-MULTIPLES.md** - Ce fichier

## ✅ Vérification finale

Après avoir suivi toutes les étapes, vous devriez avoir :

- [ ] La console affiche "RDV dans inbox (brut): X trouvés" avec X > 1
- [ ] La console affiche "total: X" avec le même nombre
- [ ] La carte RDV affiche le bon nombre
- [ ] Le filtre RDV affiche tous les RDV
- [ ] Tous les RDV (lus/non lus, ouverts/traités) sont visibles

## 🎉 Résultat

Le système affiche maintenant **TOUS** les RDV visite médicale, quel que soit leur statut, date, ou état de lecture. Les logs dans la console vous permettent de suivre exactement ce qui est chargé et compté.
