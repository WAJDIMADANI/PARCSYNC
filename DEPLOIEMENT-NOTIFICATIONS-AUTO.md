# Guide de Déploiement - Notifications Automatiques Yousign

## Correction Appliquée

Le nom de la table `modele_contrat` a été corrigé en `modeles_contrats` (pluriel) dans tous les fichiers :
- Fonction SQL : `create-auto-notification-for-contracts.sql`
- Script de tests : `test-webhook-notification-all-types.sql`
- Webhook Yousign : `supabase/functions/yousign-webhook/index.ts`
- Documentation : `WEBHOOK-NOTIFICATIONS-AUTO.md`

## Déploiement en 3 Étapes

### Étape 1 : Migrations SQL

Exécutez ces deux migrations dans l'ordre, via le SQL Editor de Supabase :

1. **Extension des types** (1 minute)
   ```bash
   # Ouvrir le SQL Editor
   # Copier/coller le contenu de : update-notification-incident-types.sql
   # Exécuter
   ```

   Résultat attendu :
   ```
   NOTICE: Migration terminée avec succès!
   NOTICE: Notifications existantes: X
   NOTICE: Incidents existants: Y
   NOTICE: Les types avenant_1 et avenant_2 sont maintenant acceptés.
   ```

2. **Fonction de génération** (1 minute)
   ```bash
   # Dans le SQL Editor
   # Copier/coller le contenu de : create-auto-notification-for-contracts.sql
   # Exécuter
   ```

   Vérification :
   ```sql
   -- Vérifier que la fonction existe
   SELECT proname, pronargs
   FROM pg_proc
   WHERE proname = 'create_notification_or_incident_for_contract';
   -- Devrait retourner 1 ligne
   ```

### Étape 2 : Déploiement du Webhook

Via Supabase CLI :

```bash
cd /chemin/vers/votre/projet

# Déployer le webhook mis à jour
supabase functions deploy yousign-webhook

# Vérifier le déploiement
supabase functions list
```

Ou via l'outil MCP Supabase (si disponible) :
- Utiliser `mcp__supabase__deploy_edge_function`
- Nom : `yousign-webhook`
- Fichiers : tout le contenu de `supabase/functions/yousign-webhook/`

Vérification dans le Dashboard :
1. Aller sur Supabase Dashboard → Edge Functions
2. Vérifier que `yousign-webhook` est listé
3. Vérifier la date de dernière modification (doit être récente)

### Étape 3 : Test de Validation

#### Option A : Test SQL Direct

```sql
-- 1. Créer un contrat de test CDD
DO $$
DECLARE
  test_contract_id UUID;
  test_profil_id UUID;
  cdd_modele_id UUID;
  result JSON;
BEGIN
  -- Récupérer un profil de test
  SELECT id INTO test_profil_id FROM profil LIMIT 1;

  -- Récupérer un modèle CDD
  SELECT id INTO cdd_modele_id FROM modeles_contrats
  WHERE type_contrat = 'CDD' LIMIT 1;

  -- Créer un contrat de test
  INSERT INTO contrat (profil_id, modele_id, statut, variables)
  VALUES (
    test_profil_id,
    cdd_modele_id,
    'signe',
    jsonb_build_object(
      'type_contrat', 'CDD',
      'date_fin', (CURRENT_DATE + INTERVAL '45 days')::TEXT
    )
  )
  RETURNING id INTO test_contract_id;

  RAISE NOTICE 'Contrat de test créé: %', test_contract_id;

  -- Tester la fonction
  SELECT create_notification_or_incident_for_contract(test_contract_id)
  INTO result;

  RAISE NOTICE 'Résultat: %', result::TEXT;

  -- Nettoyer
  DELETE FROM notification
  WHERE profil_id = test_profil_id
  AND metadata->>'contract_id' = test_contract_id::TEXT;

  DELETE FROM contrat WHERE id = test_contract_id;
END $$;
```

Résultat attendu :
```
NOTICE: Contrat de test créé: <uuid>
NOTICE: Résultat: {"success":true,"type_created":"notification","notification_type":"contrat_cdd",...}
```

#### Option B : Test via Webhook (avec curl)

1. Créer un contrat dans votre base avec statut "en_attente_signature"
2. Noter son UUID
3. Envoyer un webhook de test :

```bash
curl -X POST https://votre-projet.supabase.co/functions/v1/yousign-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "signature_request.done",
    "data": {
      "signature_request": {
        "external_id": "UUID-DU-CONTRAT",
        "status": "done"
      }
    }
  }'
```

4. Vérifier les logs du webhook dans Supabase Dashboard → Edge Functions → yousign-webhook → Logs

Logs attendus :
```
=== Tentative de création automatique de notification/incident ===
Contract ID: <uuid>
Détails du contrat récupérés:
  - Modèle type: CDD
  - Variables type: CDD
  - Variables date_fin: 2025-XX-XX
✓ Éligible: CDD avec date_fin dans variables
Appel de la fonction SQL create_notification_or_incident_for_contract...
Résultat de la création: {
  "success": true,
  "type_created": "notification",
  "notification_type": "contrat_cdd",
  ...
}
✓ Succès: Notification contrat_cdd créée pour le 2025-XX-XX
=== Fin de la création automatique ===
```

5. Vérifier dans la base que la notification a été créée :

```sql
SELECT
  n.id,
  p.nom || ' ' || p.prenom as employe,
  n.type,
  n.date_notification,
  n.metadata->>'source_date' as source,
  n.metadata->>'date_fin' as date_fin
FROM notification n
JOIN profil p ON n.profil_id = p.id
WHERE n.metadata->>'origine' = 'webhook_yousign'
ORDER BY n.created_at DESC
LIMIT 5;
```

## Vérifications Finales

### 1. Vérifier les contraintes

```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%type_check';
```

Devrait inclure `'avenant_1'` et `'avenant_2'` dans les clauses.

### 2. Vérifier la fonction

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'create_notification_or_incident_for_contract';
```

Devrait retourner 1 ligne.

### 3. Vérifier le webhook

Dans Supabase Dashboard → Edge Functions :
- Voir `yousign-webhook` dans la liste
- Date de modification récente
- Statut : Deployed

### 4. Test complet de bout en bout

1. Créer un contrat CDD dans l'interface RH
2. L'envoyer à signature via Yousign
3. Signer le contrat (ou simuler avec curl)
4. Vérifier dans l'onglet Notifications qu'une nouvelle notification apparaît automatiquement

## En Cas de Problème

### Erreur "Function not found"

```sql
-- Réexécuter la migration
-- Copier/coller create-auto-notification-for-contracts.sql dans SQL Editor
```

### Erreur "Table modele_contrat does not exist"

C'est corrigé maintenant, mais si le problème persiste :
1. Vérifier que la table s'appelle bien `modeles_contrats` (pluriel)
2. Réexécuter tous les scripts SQL mis à jour
3. Redéployer le webhook

### Webhook ne répond pas

1. Vérifier que le webhook est déployé : `supabase functions list`
2. Vérifier les logs : Dashboard → Edge Functions → yousign-webhook → Logs
3. Vérifier les variables d'environnement (SUPABASE_URL, SERVICE_ROLE_KEY)

### Pas de notification créée

1. Vérifier les logs du webhook (doit voir "Éligible: ...")
2. Vérifier que le contrat a bien un `modele_id` qui pointe vers un modèle avec `type_contrat = 'CDD'` ou `'Avenant'`
3. Vérifier que `variables.date_fin` existe dans le contrat

## Résumé

Une fois ces 3 étapes terminées, votre système :

✅ Accepte les types `avenant_1` et `avenant_2` dans les tables
✅ Dispose d'une fonction SQL intelligente de génération
✅ A un webhook Yousign mis à jour qui appelle automatiquement la fonction
✅ Crée des notifications/incidents pour tous les contrats CDD et avenants signés

Le système est prêt pour la production.
