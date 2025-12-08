# Guide Rapide - Diagnostic des Notifications et Incidents

## Le Problème

Vous ne voyez plus les notifications et incidents qui apparaissaient avant dans les onglets "Notifications" et "Gestion des incidents".

## Solution en 3 Étapes

### Étape 1: Diagnostic

Exécutez le fichier **`DIAGNOSTIC-NOTIFICATIONS-INCIDENTS.sql`** dans l'éditeur SQL de Supabase.

Ce script va vous montrer :
- ✅ Les documents qui arrivent à échéance dans les 30 prochains jours
- ✅ Les contrats CDD qui arrivent à échéance dans les 15 prochains jours
- ✅ Les documents déjà expirés
- ✅ Les notifications existantes
- ✅ Les incidents existants
- ✅ Un résumé complet

### Étape 2: Régénération

Si le diagnostic montre qu'il y a des documents expirés ou arrivant à échéance mais **PAS** de notifications/incidents correspondants, exécutez le fichier **`REGENERER-NOTIFICATIONS-INCIDENTS.sql`**.

Ce script va :
1. Générer les notifications manquantes
2. Générer les incidents manquants
3. **BACKFILL** : Créer rétroactivement les incidents pour TOUS les documents déjà expirés (pas seulement ceux d'aujourd'hui)

### Étape 3: Vérification

Retournez dans l'application et actualisez les pages :
- Onglet **Notifications** : Vous devriez voir les documents arrivant à échéance
- Onglet **Gestion des incidents** : Vous devriez voir les documents expirés

## Comment Ça Marche ?

### Système de Notifications

Les notifications sont générées automatiquement pour :
- **Titres de séjour** : 30 jours avant l'expiration
- **Visites médicales** : 30 jours avant l'expiration
- **Permis de conduire** : 30 jours avant l'expiration
- **Contrats CDD** : 15 jours avant la fin

Fonction SQL : `generate_expiration_notifications()`

### Système d'Incidents

Les incidents sont créés automatiquement pour :
- **Titres de séjour** : Le jour de l'expiration
- **Visites médicales** : Le jour de l'expiration
- **Permis de conduire** : Le jour de l'expiration
- **Contrats CDD** : Le jour de la fin du contrat

Fonction SQL : `generate_daily_expired_incidents()`

### Automatisation

Ces fonctions devraient être exécutées automatiquement tous les jours via un cron job. Si vous ne voyez pas les notifications/incidents, c'est probablement parce que :

1. Le cron job n'est pas configuré
2. Le cron job ne s'exécute pas correctement
3. Les fonctions n'ont pas été exécutées manuellement

## Configuration du Cron Job (Recommandé)

Pour automatiser la génération quotidienne, exécutez ces commandes SQL dans Supabase :

```sql
-- Activer l'extension pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Générer les notifications tous les jours à 6h00
SELECT cron.schedule(
  'generate-notifications',
  '0 6 * * *',
  'SELECT generate_expiration_notifications();'
);

-- Générer les incidents tous les jours à 6h15
SELECT cron.schedule(
  'generate-incidents',
  '15 6 * * *',
  'SELECT generate_daily_expired_incidents();'
);

-- Vérifier que les cron jobs sont bien créés
SELECT * FROM cron.job;
```

## En Cas de Problème

Si après avoir exécuté `REGENERER-NOTIFICATIONS-INCIDENTS.sql` vous ne voyez toujours rien :

1. **Vérifiez les dates** : Les documents ont-ils vraiment des dates d'expiration dans la table `profil` ?
   - `titre_sejour_fin_validite`
   - `date_fin_visite_medicale`
   - `permis_conduire_expiration`

2. **Vérifiez les contrats** : Y a-t-il des contrats CDD avec `date_fin` dans la table `contrat` ?

3. **Vérifiez le statut** : Les salariés sont-ils en statut `actif` ?

4. **Actualisez l'interface** : Appuyez sur F5 dans le navigateur pour forcer le rechargement

## Notes Importantes

- Les notifications sont pour les documents **à venir** (arrivant à échéance)
- Les incidents sont pour les documents **déjà expirés**
- Un document peut avoir à la fois une notification ET un incident si :
  1. Une notification a été créée 30 jours avant
  2. Le document a expiré (incident créé le jour J)
