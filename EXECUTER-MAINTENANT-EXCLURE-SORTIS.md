# ✅ EXCLURE LES SALARIÉS SORTIS - GUIDE D'EXÉCUTION

## 🎯 Objectif
Les salariés avec `statut='sorti'` ne doivent plus apparaître dans :
- ❌ Les incidents
- ❌ Les notifications
- ❌ Les documents manquants

---

## 📋 Ce qui a été corrigé

### 1️⃣ **Base de données (SQL)** ✅
Fichier : `FIX-EXCLURE-SALARIES-SORTIS-COMPLET.sql`

**Vues modifiées :**
- `v_incidents_ouverts_rh` → Filtre `p.statut != 'sorti'` ajouté
- `v_incidents_contrats_affichables` → Filtre `p.statut != 'sorti'` ajouté
- `v_incidents_contrats_expires` → Filtre `p.statut != 'sorti'` ajouté

**Fonctions RPC modifiées :**
- `get_cdd_expires()` → Filtre `AND p.statut != 'sorti'` ajouté
- `get_cdd_expires_for_incidents()` → Créée avec filtre `AND p.statut != 'sorti'`
- `get_avenants_expires()` → Filtre `AND p.statut != 'sorti'` ajouté
- `get_missing_documents_by_salarie()` → Filtre `AND p.statut != 'sorti'` ajouté
- `generate_expired_contract_incidents()` → Filtre `AND p.statut != 'sorti'` ajouté

**Nouvelles fonctions créées :**
- `close_incidents_for_departed_employees()` → Ferme automatiquement les incidents des sortis
- `archive_notifications_for_departed_employees()` → Archive les notifications des sortis

### 2️⃣ **Frontend (TypeScript)** ✅

**Fichiers modifiés :**

1. **NotificationsList.tsx** (ligne 69)
   ```typescript
   .select(`*, profil:profil_id(prenom, nom, email, statut)`)
   .neq('profil.statut', 'sorti')  // ✅ NOUVEAU
   ```

2. **IncidentsList.tsx** (ligne 128)
   ```typescript
   .select(`*, profil:profil_id(prenom, nom, email, statut)`)
   .neq('profil.statut', 'sorti')  // ✅ NOUVEAU
   ```

3. **RHDashboard.tsx** (ligne 418)
   ```typescript
   .select('type, statut, date_echeance, profil:profil_id(statut)')
   .neq('profil.statut', 'sorti')  // ✅ NOUVEAU
   ```

4. **RHDashboard.tsx** (ligne 498)
   ```typescript
   .select(`..., profil:profil_id(prenom, nom, email, statut)`)
   .neq('profil.statut', 'sorti')  // ✅ NOUVEAU
   ```

---

## 🚀 ÉTAPES D'EXÉCUTION

### Étape 1 : Appliquer le SQL
```sql
-- Copier le contenu de FIX-EXCLURE-SALARIES-SORTIS-COMPLET.sql
-- et l'exécuter dans l'éditeur SQL de Supabase
```

**Résultat attendu :**
```
✅ 3 vues recréées
✅ 7 fonctions RPC modifiées
✅ 2 nouvelles fonctions créées
✅ Incidents des sortis fermés automatiquement
✅ Notifications des sortis archivées automatiquement
```

### Étape 2 : Rebuild du frontend
```bash
npm run build
```

### Étape 3 : Vérification

**Vérifier qu'un salarié sorti n'apparaît plus :**

1. **Dans les incidents :**
   ```sql
   SELECT COUNT(*)
   FROM incident i
   JOIN profil p ON i.profil_id = p.id
   WHERE p.statut = 'sorti'
   AND i.statut IN ('actif', 'en_cours');
   ```
   **Résultat attendu : 0**

2. **Dans les notifications :**
   ```sql
   SELECT COUNT(*)
   FROM notification n
   JOIN profil p ON n.profil_id = p.id
   WHERE p.statut = 'sorti'
   AND n.statut IN ('active', 'email_envoye');
   ```
   **Résultat attendu : 0**

3. **Dans documents manquants :**
   ```sql
   SELECT * FROM get_missing_documents_by_salarie()
   WHERE profil_id IN (
     SELECT id FROM profil WHERE statut = 'sorti'
   );
   ```
   **Résultat attendu : 0 lignes**

---

## 🔍 Test pratique

1. **Marquer un salarié comme sorti :**
   ```sql
   UPDATE profil
   SET statut = 'sorti', date_sortie = CURRENT_DATE
   WHERE id = '<UUID_TEST>';
   ```

2. **Vérifier dans l'interface :**
   - ❌ N'apparaît plus dans "Incidents"
   - ❌ N'apparaît plus dans "Notifications"
   - ❌ N'apparaît plus dans "Documents manquants"
   - ✅ Apparaît uniquement dans l'onglet "Sortants"

3. **Ses incidents existants sont automatiquement :**
   - Statut → `resolu`
   - Date résolution → Date du jour
   - Metadata → `{"closed_reason": "employee_departed"}`

4. **Ses notifications existantes sont automatiquement :**
   - Statut → `archive`

---

## 📊 Impact

### Avant la correction :
- ❌ Salariés sortis visibles dans incidents
- ❌ Salariés sortis visibles dans notifications
- ❌ Salariés sortis visibles dans documents manquants
- ❌ Génération d'incidents pour des sortis

### Après la correction :
- ✅ Salariés sortis complètement exclus
- ✅ Incidents existants automatiquement fermés
- ✅ Notifications existantes automatiquement archivées
- ✅ Plus de génération d'incidents pour les sortis
- ✅ Plus de notifications pour les sortis

---

## 🎉 Résultat final

Les salariés marqués comme "sorti" :
- ✅ N'apparaissent nulle part sauf dans l'onglet "Sortants"
- ✅ Ne reçoivent plus de notifications
- ✅ N'ont plus d'incidents actifs
- ✅ Ne sont plus dans les documents manquants
- ✅ Leurs données sont archivées proprement

---

## 🆘 En cas de problème

**Si des sortis apparaissent encore :**

1. Vérifier que le SQL a bien été exécuté :
   ```sql
   -- Vérifier qu'une fonction a bien le filtre
   SELECT prosrc FROM pg_proc
   WHERE proname = 'get_cdd_expires';

   -- Doit contenir : "p.statut != 'sorti'"
   ```

2. Forcer le nettoyage manuel :
   ```sql
   SELECT close_incidents_for_departed_employees();
   SELECT archive_notifications_for_departed_employees();
   ```

3. Rebuild le frontend :
   ```bash
   npm run build
   ```

4. Vider le cache du navigateur (Ctrl+Shift+R)

---

**✅ PRÊT À EXÉCUTER !**
