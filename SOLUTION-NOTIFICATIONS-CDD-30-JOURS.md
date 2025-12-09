# Solution: Afficher les notifications CDD arrivant à échéance dans 30 jours

## Problème identifié

Les contrats CDD arrivant à échéance ne s'affichent pas dans l'onglet "Notifications" car :
1. La fonction `generate_expiration_notifications()` était configurée pour détecter les CDD à **15 jours** au lieu de **30 jours**
2. La fonction n'a peut-être jamais été exécutée ou n'est pas programmée pour s'exécuter automatiquement

## Solution implémentée

### 1. Modification de la fonction

La fonction a été mise à jour pour détecter les contrats CDD se terminant dans les **30 prochains jours** au lieu de 15 jours.

### 2. Scripts SQL créés

Trois scripts SQL ont été créés :

#### A. `DIAGNOSTIC-NOTIFICATIONS-CDD.sql` (Facultatif - Diagnostic)
Ce script permet de diagnostiquer l'état actuel :
- Liste tous les contrats CDD existants
- Liste toutes les notifications CDD existantes
- Vérifie si la fonction existe
- Vérifie si pg_cron est installé
- Affiche un résumé

**Utilisation:** Exécutez ce script dans l'éditeur SQL de Supabase si vous voulez comprendre l'état actuel avant de corriger.

#### B. `GENERER-NOTIFICATIONS-CDD-30-JOURS.sql` (PRINCIPAL)
**C'EST LE SCRIPT À EXÉCUTER POUR CORRIGER LE PROBLÈME**

Ce script fait tout en une seule exécution :
1. Met à jour la fonction pour détecter les CDD à 30 jours
2. Exécute la fonction pour générer les notifications
3. Affiche un résumé des notifications créées

#### C. `create-generate-notifications-function.sql` (Mis à jour)
Le fichier source a été mis à jour avec la correction.

---

## Instructions d'exécution (SIMPLE)

### Étape 1: Ouvrir Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor** (Éditeur SQL)

### Étape 2: Exécuter le script principal

1. Ouvrez le fichier `GENERER-NOTIFICATIONS-CDD-30-JOURS.sql`
2. **Copiez TOUT le contenu du fichier**
3. **Collez-le dans l'éditeur SQL de Supabase**
4. Cliquez sur **Run** (Exécuter)

### Étape 3: Vérifier le résultat

Après l'exécution, vous devriez voir :
- Un message confirmant la mise à jour de la fonction
- Un résumé des notifications créées
- Le nombre de contrats CDD concernés

### Étape 4: Vérifier dans l'application

1. Retournez dans votre application
2. Allez dans l'onglet **Notifications**
3. Cliquez sur l'onglet **Contrats CDD**
4. Vous devriez maintenant voir les contrats CDD arrivant à échéance dans les 30 prochains jours

---

## Automatisation future

### Option 1: pg_cron (Recommandé si disponible)

Si votre plan Supabase inclut `pg_cron`, exécutez aussi le script `setup-cron-job.sql` pour programmer l'exécution automatique quotidienne à 6h du matin.

```sql
-- Vérifier si pg_cron est disponible
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- Si disponible, activer et programmer
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'generate-notifications-daily',
  '0 6 * * *',
  $$ SELECT generate_expiration_notifications(); $$
);
```

### Option 2: Exécution manuelle périodique

Si `pg_cron` n'est pas disponible, vous devrez exécuter manuellement cette commande régulièrement :

```sql
SELECT generate_expiration_notifications();
```

**Recommandation:** Exécutez cette commande au moins une fois par semaine pour maintenir les notifications à jour.

---

## Que fait exactement cette correction ?

### Avant (15 jours)
- La fonction détectait uniquement les contrats CDD se terminant dans les **15 prochains jours**
- Exemple: Si un CDD se termine le 15 janvier et nous sommes le 25 décembre, il n'apparaissait PAS

### Après (30 jours)
- La fonction détecte maintenant les contrats CDD se terminant dans les **30 prochains jours**
- Exemple: Si un CDD se termine le 15 janvier et nous sommes le 25 décembre, il APPARAÎT maintenant

### Détection de doublons
La fonction vérifie automatiquement qu'une notification n'existe pas déjà avant de la créer, donc vous pouvez l'exécuter plusieurs fois sans créer de doublons.

---

## Résolution de problèmes

### Les notifications n'apparaissent toujours pas

1. **Vérifier qu'il existe bien des contrats CDD**
   - Allez dans la table `contrat`
   - Vérifiez qu'il existe des contrats avec `type = 'CDD'`, `statut = 'actif'`, et une `date_fin` dans les 30 prochains jours

2. **Vérifier que la fonction s'est exécutée sans erreur**
   - Regardez les messages dans l'éditeur SQL après l'exécution
   - Si erreur, copiez le message d'erreur

3. **Exécuter le script de diagnostic**
   - Utilisez `DIAGNOSTIC-NOTIFICATIONS-CDD.sql` pour voir l'état complet

4. **Vérifier les politiques RLS**
   - Les politiques RLS sur la table `notification` permettent la lecture pour tous les utilisateurs authentifiés

### Les notifications sont créées mais le compteur reste à 0

Vérifiez que le profil associé au contrat a bien un email valide dans la table `profil`.

---

## Support

Si le problème persiste après avoir suivi ces étapes, exécutez le script de diagnostic et partagez les résultats.
