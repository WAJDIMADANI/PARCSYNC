# Test de la Notification pour Wajdi

## Problème

Le contrat de Wajdi n'apparaît pas dans **Notifications > Contrats CDD** car il expire **DEMAIN** (2025-12-11), pas aujourd'hui.

Les notifications sont créées uniquement pour les contrats qui expirent **LE JOUR MÊME**.

## Solution: Tester Maintenant

### Option 1: Exécution Simple (Recommandé)

**Fichier:** `TEST-EXPIRATION-CONTRAT-WAJDI-MAINTENANT.sql`

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Copiez-collez le contenu du fichier
3. Cliquez sur **"Run"**
4. Vérifiez les résultats:
   - ✅ Date_fin changée à aujourd'hui
   - ✅ Incidents créés
   - ✅ Notifications créées
5. **Rafraîchissez la page** de l'application
6. Allez dans **Notifications > Contrats CDD**
7. Cherchez "waj" - **Il devrait apparaître!**

### Option 2: Étape par Étape

#### 1. Changer la date_fin à aujourd'hui

```sql
UPDATE contrat
SET date_fin = CURRENT_DATE
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
```

#### 2. Générer les incidents

```sql
SELECT generate_daily_expired_incidents();
```

#### 3. Vérifier les incidents

```sql
SELECT i.*
FROM incidents i
JOIN contrat c ON i.profil_id = c.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
  AND i.type = 'contrat_expire'
ORDER BY i.created_at DESC;
```

#### 4. Vérifier les notifications

```sql
SELECT n.*
FROM notifications n
JOIN contrat c ON n.profil_id = c.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
  AND n.type = 'contrat_cdd_expire'
ORDER BY n.created_at DESC;
```

## Résultat Attendu

Après l'exécution:

1. **Dans la base de données:**
   - ✅ 1 incident créé avec `type = 'contrat_expire'`
   - ✅ 1 notification créée avec `type = 'contrat_cdd_expire'`

2. **Dans l'application:**
   - ✅ Le contrat de Wajdi apparaît dans **Notifications > Contrats CDD**
   - ✅ Badge "Contrats CDD" passe de 183 à 184
   - ✅ Notification visible avec titre: "Contrat CDD expire"

## Vérification dans l'Application

1. **Rafraîchissez** la page (F5 ou Ctrl+R)
2. Allez dans **Notifications**
3. Cliquez sur **"Contrats CDD"** (badge rouge)
4. Tapez **"waj"** dans la recherche
5. **Résultat:** Wajdi MADANI devrait apparaître!

## Debugging

Si la notification n'apparaît toujours pas:

### 1. Vérifier que l'incident existe

```sql
SELECT COUNT(*) as total_incidents
FROM incidents i
JOIN contrat c ON i.profil_id = c.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
```

**Attendu:** `total_incidents = 1` minimum

### 2. Vérifier que la notification existe

```sql
SELECT COUNT(*) as total_notifications
FROM notifications n
JOIN contrat c ON n.profil_id = c.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
```

**Attendu:** `total_notifications = 1` minimum

### 3. Vérifier le type de notification

```sql
SELECT type, titre, message
FROM notifications n
JOIN contrat c ON n.profil_id = c.profil_id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc'
ORDER BY created_at DESC
LIMIT 1;
```

**Attendu:**
- `type = 'contrat_cdd_expire'`
- `titre = 'Contrat CDD expire'`

### 4. Vérifier le filtre dans l'application

Le composant `NotificationsList.tsx` filtre les notifications par type:

- **Contrats CDD** → `type = 'contrat_cdd_expire'`
- **Visites médicales** → `type = 'visite_medicale'`
- **Permis de conduire** → `type = 'permis_conduire'`

Si le type ne correspond pas, la notification n'apparaît pas dans l'onglet.

## Restaurer la Date Originale

Si vous voulez restaurer la date_fin originale:

```sql
UPDATE contrat
SET date_fin = '2026-07-03'::date
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
```

## Automatisation en Production

En production, cette fonction s'exécute automatiquement tous les jours à minuit via un cron job:

```sql
-- Cron job existant
SELECT cron.schedule(
  'check-expired-contracts',
  '0 0 * * *',  -- Tous les jours à minuit
  'SELECT generate_daily_expired_incidents();'
);
```

Donc vous n'avez rien à faire manuellement en production!
