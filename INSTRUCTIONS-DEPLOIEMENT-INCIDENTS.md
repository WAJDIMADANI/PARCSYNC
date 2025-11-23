# Instructions de déploiement du système d'incidents

## Vue d'ensemble

Ce système crée et gère automatiquement des incidents pour tous les documents expirés (titres de séjour, visites médicales, permis de conduire, contrats CDD). Il inclut:

- Création automatique d'incidents pour documents expirés
- Suivi avec statuts (actif, en_cours, résolu, ignoré)
- Résolution automatique avec mise à jour des dates dans les profils
- Historique complet auditable
- Emails de rappel automatiques (RH, managers, employés)
- Interface de gestion complète

## Étape 1: Créer les tables et fonctions SQL

### 1.1 Créer le système d'incidents

Exécuter dans Supabase SQL Editor:

```sql
-- Exécuter le fichier: create-incidents-system.sql
```

Ce script crée:
- Table `incident` pour les incidents
- Table `incident_historique` pour l'audit
- Colonne `incident_id` dans la table `notification` pour le lien
- Fonctions triggers automatiques
- Index de performance
- Politiques RLS

### 1.2 Créer les fonctions de génération

Exécuter dans Supabase SQL Editor:

```sql
-- 1. Fonction de backfill (documents déjà expirés)
-- Exécuter: backfill-expired-documents-incidents.sql

-- 2. Fonction de génération quotidienne
-- Exécuter: create-daily-incident-generation.sql

-- 3. Fonction de résolution
-- Exécuter: create-resolve-incident-function.sql
```

### 1.3 Exécuter le backfill (une seule fois)

```sql
-- Créer des incidents pour tous les documents déjà expirés
SELECT backfill_existing_expired_documents();

-- Vérifier le résultat
SELECT * FROM incident ORDER BY date_creation_incident DESC LIMIT 10;
```

Le résultat JSON affichera combien d'incidents ont été créés par type.

## Étape 2: Déployer la Edge Function pour les emails

### 2.1 Déployer send-incident-reminders

La fonction est déjà dans `supabase/functions/send-incident-reminders/index.ts`.

Pour déployer, utiliser l'outil de déploiement Supabase intégré dans l'interface.

OU utiliser la CLI Supabase (si installée):

```bash
supabase functions deploy send-incident-reminders
```

### 2.2 Tester la fonction manuellement

Dans Supabase SQL Editor:

```sql
SELECT
  net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-incident-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_ANON_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
```

Remplacer YOUR_PROJECT_ID et YOUR_ANON_KEY par vos valeurs.

## Étape 3: Configurer les jobs CRON

### 3.1 Activer pg_cron

Dans Supabase Dashboard:
1. Aller dans Database > Extensions
2. Activer "pg_cron"

### 3.2 Créer les jobs automatiques

Exécuter dans Supabase SQL Editor:

```sql
-- Exécuter le fichier: setup-incident-cron-jobs.sql
```

Ce script configure:
- Job quotidien à 6h00: génération des nouveaux incidents
- Job quotidien à 9h00: envoi des emails de rappel

### 3.3 Vérifier les jobs

```sql
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname IN ('generate-daily-incidents', 'send-incident-reminders');
```

Les deux jobs doivent apparaître avec `active = true`.

## Étape 4: Vérification et tests

### 4.1 Vérifier les incidents créés

```sql
-- Compter les incidents par statut
SELECT statut, COUNT(*) as nombre
FROM incident
GROUP BY statut;

-- Compter les incidents par type
SELECT type, COUNT(*) as nombre
FROM incident
GROUP BY type;

-- Voir les incidents les plus récents
SELECT
  i.*,
  p.prenom,
  p.nom
FROM incident i
JOIN profil p ON i.profil_id = p.id
ORDER BY i.created_at DESC
LIMIT 10;
```

### 4.2 Vérifier l'historique

```sql
SELECT
  ih.*,
  i.type
FROM incident_historique ih
JOIN incident i ON ih.incident_id = i.id
ORDER BY ih.created_at DESC
LIMIT 10;
```

### 4.3 Tester la résolution d'un incident

```sql
-- Trouver un incident actif
SELECT id, type, date_expiration_originale
FROM incident
WHERE statut = 'actif'
LIMIT 1;

-- Résoudre l'incident (remplacer l'ID et la date)
SELECT resolve_incident(
  'INCIDENT_ID_ICI',
  '2025-12-31',
  'Test de résolution - document renouvelé',
  auth.uid()
);

-- Vérifier que le profil a été mis à jour
SELECT titre_sejour_fin_validite, date_fin_visite_medicale, permis_conduire_expiration
FROM profil
WHERE id = 'PROFIL_ID_ICI';
```

### 4.4 Tester le changement de statut

```sql
-- Marquer un incident comme "en cours"
SELECT change_incident_status(
  'INCIDENT_ID_ICI',
  'en_cours',
  'Traitement démarré - contact avec l''employé',
  auth.uid()
);
```

## Étape 5: Interface utilisateur

L'interface est déjà intégrée! Les nouvelles pages sont:

1. **Gestion des incidents** (`/rh/incidents`)
   - Onglets: Actifs, En cours, Résolus, Ignorés
   - Actions: Marquer en cours, Résoudre, Ignorer
   - Filtres par type et recherche

2. **Historique des incidents** (`/rh/incidents-historique`)
   - Vue complète de tous les changements
   - Statistiques: total, résolus, temps moyen de résolution
   - Export CSV
   - Filtres avancés

3. **Dashboard RH mis à jour**
   - Carte "Incidents" cliquable
   - Statistiques en temps réel

## Étape 6: Configuration des emails (optionnel)

Pour activer les vrais emails (actuellement simulés):

### Option 1: Utiliser Resend

1. Créer un compte sur https://resend.com
2. Obtenir une API key
3. Configurer dans Supabase:
   - Settings > Secrets
   - Ajouter `RESEND_API_KEY`

4. Modifier la Edge Function `send-incident-reminders` pour utiliser Resend:

```typescript
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'rh@votreentreprise.com',
    to: recipient.email,
    subject: subject,
    html: body
  })
});
```

### Option 2: Utiliser SMTP personnalisé

Configurer vos propres paramètres SMTP dans la Edge Function.

## Maintenance et monitoring

### Vérifier les jobs CRON

```sql
-- Voir l'historique des exécutions
SELECT * FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job
  WHERE jobname IN ('generate-daily-incidents', 'send-incident-reminders')
)
ORDER BY start_time DESC
LIMIT 20;
```

### Vérifier les incidents non résolus

```sql
-- Incidents actifs depuis plus de 14 jours
SELECT
  i.*,
  p.prenom,
  p.nom,
  CURRENT_DATE - i.date_creation_incident as jours_depuis_creation
FROM incident i
JOIN profil p ON i.profil_id = p.id
WHERE i.statut IN ('actif', 'en_cours')
  AND CURRENT_DATE - i.date_creation_incident > 14
ORDER BY jours_depuis_creation DESC;
```

### Stats globales

```sql
-- Vue d'ensemble du système
SELECT
  COUNT(*) FILTER (WHERE statut = 'actif') as actifs,
  COUNT(*) FILTER (WHERE statut = 'en_cours') as en_cours,
  COUNT(*) FILTER (WHERE statut = 'resolu') as resolus,
  COUNT(*) FILTER (WHERE statut = 'ignore') as ignores,
  COUNT(*) as total
FROM incident;

-- Temps moyen de résolution
SELECT
  AVG(date_resolution::date - date_creation_incident::date) as jours_moyen_resolution
FROM incident
WHERE statut = 'resolu'
  AND date_resolution IS NOT NULL;
```

## Dépannage

### Problème: Les incidents ne se créent pas automatiquement

1. Vérifier que pg_cron est activé
2. Vérifier que le job est actif: `SELECT * FROM cron.job WHERE jobname = 'generate-daily-incidents';`
3. Exécuter manuellement: `SELECT generate_daily_expired_incidents();`
4. Vérifier les logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;`

### Problème: Les emails ne partent pas

1. Vérifier que la Edge Function est déployée
2. Tester manuellement la fonction
3. Vérifier les logs dans Supabase Dashboard > Edge Functions > Logs
4. Vérifier que les profils ont des adresses email

### Problème: La résolution ne met pas à jour le profil

1. Vérifier que l'incident existe: `SELECT * FROM incident WHERE id = 'ID_ICI';`
2. Vérifier les permissions RLS
3. Exécuter manuellement resolve_incident et vérifier le résultat JSON
4. Vérifier l'historique: `SELECT * FROM incident_historique WHERE incident_id = 'ID_ICI';`

## Ordre d'exécution recommandé

1. ✅ `create-incidents-system.sql`
2. ✅ `backfill-expired-documents-incidents.sql`
3. ✅ `create-daily-incident-generation.sql`
4. ✅ `create-resolve-incident-function.sql`
5. ✅ Exécuter `SELECT backfill_existing_expired_documents();`
6. ✅ Déployer Edge Function `send-incident-reminders`
7. ✅ Activer pg_cron extension
8. ✅ `setup-incident-cron-jobs.sql`
9. ✅ Tester avec quelques incidents
10. ✅ Vérifier dans l'interface web

## Support

Si vous rencontrez des problèmes:
1. Vérifier les logs Supabase
2. Vérifier les tables avec les requêtes SQL ci-dessus
3. Tester les fonctions manuellement
4. Vérifier que toutes les migrations ont été exécutées dans l'ordre
