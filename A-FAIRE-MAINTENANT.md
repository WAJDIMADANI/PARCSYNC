# POURQUOI LES NOTIFICATIONS N'APPARAISSENT PAS

## Problème

Vous avez modifié la date de fin de titre de séjour d'un salarié (< 30 jours), mais aucune notification n'apparaît dans l'onglet Notifications.

## Explication

Les notifications NE sont PAS créées automatiquement quand vous modifiez une date. 

Le système utilise une fonction `generate_expiration_notifications()` qui scanne les profils et crée les notifications, mais cette fonction doit être **exécutée manuellement** ou **planifiée avec un CRON**.

## Solution immédiate (30 secondes)

### Ouvrez Supabase SQL Editor et exécutez :

```sql
SELECT generate_expiration_notifications();
```

Cliquez **RUN**

Résultat attendu : `Success. No rows returned`

Puis **rafraîchir l'app** → les notifications devraient apparaître !

---

## Solution permanente : Activer le CRON

Pour que les notifications soient générées automatiquement chaque jour à 6h du matin :

```sql
-- 1. Activer l'extension pg_cron (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Planifier l'exécution quotidienne à 6h
SELECT cron.schedule(
  'generate-notifications-daily',
  '0 6 * * *',
  'SELECT generate_expiration_notifications();'
);
```

---

## Diagnostic complet (optionnel)

Si vous voulez vérifier l'état actuel, exécutez **DIAGNOSTIC-NOTIFICATIONS-CDD.sql**

Ce script vous montrera :
- Si la table notification existe
- Combien de notifications par type
- Les dernières notifications créées
- Si les fonctions et triggers existent
