# Génération Automatique de Notifications et Incidents pour Contrats Yousign

## Vue d'Ensemble

Ce système génère automatiquement des notifications ou incidents lorsqu'un contrat est signé via Yousign, pour trois types de contrats :
- **CDD** (Contrat à Durée Déterminée)
- **Avenant 1**
- **Avenant 2**

Le système analyse intelligemment les dates d'expiration et crée soit une notification préventive (contrat encore valide), soit un incident (contrat déjà expiré).

## 🎯 Fonctionnalités Clés

### 1. Détection Automatique du Type de Contrat
Le système identifie automatiquement le type de contrat en analysant :
- Le champ `modele_contrat.type_contrat` (CDD ou Avenant)
- Le champ `contrat.variables.type_contrat` (pour distinguer Avenant 1 de Avenant 2)

### 2. Gestion Intelligente des Dates Multiples pour Avenants
Pour les avenants, le système consulte **DEUX sources** de dates :
- `contrat.variables.date_fin` (date dans le contrat JSON)
- `profil.avenant_1_date_fin` ou `profil.avenant_2_date_fin` (dates dans le profil)

**La date la plus récente est automatiquement sélectionnée** grâce à la fonction SQL `GREATEST()`.

#### Tableau des Sources de Dates

| Type de Contrat | Source 1 | Source 2 | Logique de Fusion |
|-----------------|----------|----------|-------------------|
| CDD | `variables.date_fin` | Aucune | Utilise uniquement source 1 |
| Avenant 1 | `variables.date_fin` | `profil.avenant_1_date_fin` | GREATEST(source1, source2) |
| Avenant 2 | `variables.date_fin` | `profil.avenant_2_date_fin` | GREATEST(source1, source2) |

#### Exemples de Fusion de Dates

**Exemple 1 : Date uniquement dans variables**
```
variables.date_fin = 2025-03-15
profil.avenant_1_date_fin = NULL
→ Date utilisée : 2025-03-15
→ Source : "contract_variables"
```

**Exemple 2 : Date uniquement dans profil**
```
variables.date_fin = NULL
profil.avenant_1_date_fin = 2025-04-20
→ Date utilisée : 2025-04-20
→ Source : "profil"
```

**Exemple 3 : Dates dans les deux sources (profil plus récente)**
```
variables.date_fin = 2025-03-15
profil.avenant_1_date_fin = 2025-05-10
→ Date utilisée : 2025-05-10 (la plus récente)
→ Source : "both_merged"
```

**Exemple 4 : Dates dans les deux sources (variables plus récente)**
```
variables.date_fin = 2025-06-30
profil.avenant_2_date_fin = 2025-04-15
→ Date utilisée : 2025-06-30 (la plus récente)
→ Source : "both_merged"
```

### 3. Trois Scénarios de Création Automatique

Le système calcule le nombre de jours jusqu'à l'expiration et crée :

#### Scénario A : Contrat se termine dans plus de 30 jours
```
→ Crée une NOTIFICATION
→ Date de notification : date_fin - 30 jours
→ Statut : "active"
→ Les RH seront alertés 30 jours avant l'expiration
```

**Exemple :**
- Date du jour : 01/01/2025
- Date de fin du contrat : 15/03/2025 (74 jours)
- Notification créée pour le : 13/02/2025 (J-30)

#### Scénario B : Contrat se termine dans 1 à 30 jours
```
→ Crée une NOTIFICATION URGENTE
→ Date de notification : aujourd'hui
→ Statut : "active"
→ Metadata.urgent : true
→ Les RH voient l'alerte immédiatement
```

**Exemple :**
- Date du jour : 01/01/2025
- Date de fin du contrat : 20/01/2025 (19 jours)
- Notification créée immédiatement avec flag urgent

#### Scénario C : Contrat déjà expiré
```
→ Crée un INCIDENT
→ Statut : "actif"
→ Metadata.jours_depuis_expiration : nombre de jours
→ Les RH doivent agir immédiatement
```

**Exemple :**
- Date du jour : 01/01/2025
- Date de fin du contrat : 25/12/2024 (expiré depuis 7 jours)
- Incident créé avec jours_depuis_expiration = 7

## 📋 Architecture du Système

### Composants

```
┌─────────────────────┐
│   Yousign Webhook   │
│ (signature_request  │
│      .done)         │
└──────────┬──────────┘
           │
           │ 1. Mise à jour contrat.statut = "signe"
           │
           ▼
┌─────────────────────────────────────────┐
│  Récupération données contrat           │
│  - modele.type_contrat                  │
│  - variables.type_contrat               │
│  - variables.date_fin                   │
│  - profil.avenant_1_date_fin            │
│  - profil.avenant_2_date_fin            │
└──────────┬──────────────────────────────┘
           │
           │ 2. Vérification éligibilité
           │
           ▼
┌─────────────────────────────────────────┐
│  Appel RPC Supabase                     │
│  create_notification_or_incident_       │
│  for_contract(contract_id)              │
└──────────┬──────────────────────────────┘
           │
           │ 3. Fonction SQL
           │
           ▼
┌─────────────────────────────────────────┐
│  Détection type + Fusion dates          │
│  - CDD → variables.date_fin             │
│  - Avenant 1 → GREATEST(var, profil)    │
│  - Avenant 2 → GREATEST(var, profil)    │
└──────────┬──────────────────────────────┘
           │
           │ 4. Calcul jours avant expiration
           │
           ▼
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐   ┌─────────┐
│NOTIF-   │   │INCIDENT │
│ICATION  │   │         │
└─────────┘   └─────────┘
```

### Flux de Données

1. **Yousign** envoie un webhook `signature_request.done`
2. **Webhook** met à jour le contrat à statut "signe"
3. **Webhook** récupère les données complètes du contrat avec relations
4. **Webhook** vérifie l'éligibilité (CDD ou Avenant avec date)
5. **Webhook** appelle la fonction SQL via RPC
6. **Fonction SQL** détecte le type et fusionne les dates
7. **Fonction SQL** crée notification ou incident
8. **Fonction SQL** retourne le résultat JSON
9. **Webhook** log le résultat et l'inclut dans la réponse

## 🚀 Guide de Déploiement

### Prérequis

- Accès à la base de données Supabase
- Droits d'exécution SQL
- Accès au dashboard Supabase pour déployer les Edge Functions

### Étape 1 : Extension des Types (SQL)

Exécutez le fichier `update-notification-incident-types.sql` :

```sql
-- Via le SQL Editor de Supabase
-- Copier/coller le contenu du fichier
```

Ce script :
- ✅ Supprime les anciennes contraintes CHECK
- ✅ Recrée les contraintes avec 'avenant_1' et 'avenant_2'
- ✅ Est idempotent (peut être exécuté plusieurs fois)
- ✅ Conserve toutes les données existantes

**Vérification :**
```sql
-- Vérifier que les nouvelles contraintes sont en place
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname LIKE '%type_check';
```

### Étape 2 : Fonction SQL de Génération (SQL)

Exécutez le fichier `create-auto-notification-for-contracts.sql` :

```sql
-- Via le SQL Editor de Supabase
-- Copier/coller le contenu du fichier
```

Ce script :
- ✅ Crée la fonction `create_notification_or_incident_for_contract`
- ✅ Gère les trois types de contrats
- ✅ Implémente la fusion intelligente des dates
- ✅ Inclut la détection de doublons
- ✅ Ajoute des métadonnées détaillées

**Vérification :**
```sql
-- Vérifier que la fonction existe
SELECT proname, pronargs
FROM pg_proc
WHERE proname = 'create_notification_or_incident_for_contract';

-- Test manuel (remplacer par un vrai UUID)
SELECT create_notification_or_incident_for_contract('uuid-d-un-contrat-test');
```

### Étape 3 : Déploiement du Webhook Yousign

#### Via Supabase CLI (recommandé)

```bash
# Se positionner dans le dossier du projet
cd /chemin/vers/votre/projet

# Déployer la fonction
supabase functions deploy yousign-webhook

# Vérifier le déploiement
supabase functions list
```

#### Via l'outil MCP Supabase

```typescript
// Le webhook est déjà modifié dans le code
// Il suffit de le déployer via l'outil MCP
```

**Vérification :**
1. Aller dans Supabase Dashboard → Edge Functions
2. Vérifier que `yousign-webhook` apparaît dans la liste
3. Vérifier la date de dernière modification
4. Tester avec un payload de test (voir section Tests)

### Étape 4 : Vérification Post-Déploiement

```sql
-- 1. Vérifier les contraintes
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%type_check';

-- 2. Vérifier la fonction
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'create_notification_or_incident_for_contract';

-- 3. Tester avec un contrat réel (adapter l'UUID)
SELECT create_notification_or_incident_for_contract('uuid-contrat-test');

-- 4. Vérifier qu'aucune donnée n'a été perdue
SELECT COUNT(*) FROM notification;
SELECT COUNT(*) FROM incident;
```

## 🧪 Tests et Validation

### Tests Automatisés

Le fichier `test-webhook-notification-all-types.sql` contient 10 scénarios de test :

1. **Test 1** : CDD dans 60 jours → notification à J-30
2. **Test 2** : CDD dans 15 jours → notification immédiate urgente
3. **Test 3** : CDD expiré depuis hier → incident
4. **Test 4** : Avenant 1 (date variables uniquement) dans 45 jours
5. **Test 5** : Avenant 1 (date profil uniquement) dans 20 jours
6. **Test 6** : Avenant 1 (deux sources, profil gagne)
7. **Test 7** : Avenant 2 (date variables uniquement) dans 10 jours
8. **Test 8** : Avenant 2 (deux sources, variables gagne)
9. **Test 9** : Avenant 2 expiré depuis 5 jours → incident
10. **Test 10** : Anti-doublon (appel multiple même contrat)

**Exécuter les tests :**
```sql
-- Copier/coller chaque bloc DO $$ du fichier de test
-- Ou exécuter le fichier complet
```

### Test Manuel avec Payload Yousign

#### Créer un payload de test

```json
{
  "event_name": "signature_request.done",
  "data": {
    "signature_request": {
      "id": "sr_test_123",
      "external_id": "UUID-DE-VOTRE-CONTRAT-TEST",
      "status": "done"
    }
  }
}
```

#### Envoyer le webhook avec curl

```bash
# URL du webhook (récupérer depuis Supabase Dashboard)
WEBHOOK_URL="https://votre-projet.supabase.co/functions/v1/yousign-webhook"

# Envoyer le test
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "signature_request.done",
    "data": {
      "signature_request": {
        "external_id": "uuid-contrat-test",
        "status": "done"
      }
    }
  }'
```

#### Logs Attendus

Cherchez dans les logs du webhook :
```
=== Tentative de création automatique de notification/incident ===
Détails du contrat récupérés:
  - Modèle type: CDD (ou Avenant)
  - Variables type: CDD (ou Avenant 1, Avenant 2)
  - Variables date_fin: 2025-03-15
  - Profil avenant_1_date_fin: 2025-04-20
✓ Éligible: CDD avec date_fin dans variables
Résultat de la création: {
  "success": true,
  "type_created": "notification",
  "notification_type": "contrat_cdd",
  "id": "uuid-notification",
  "date_fin_utilisee": "2025-03-15",
  "source_date": "contract_variables",
  "days_until_expiry": 74,
  "message": "Notification contrat_cdd créée pour le 2025-02-13"
}
✓ Succès: Notification contrat_cdd créée pour le 2025-02-13
  - Type créé: notification
  - Notification type: contrat_cdd
  - Source date: contract_variables
```

### Requêtes de Vérification

#### Voir toutes les notifications créées

```sql
SELECT
  n.id,
  p.nom || ' ' || p.prenom as employe,
  n.type,
  n.date_notification,
  n.statut,
  n.metadata->>'source_date' as source,
  n.metadata->>'date_fin' as date_fin,
  n.metadata->>'urgent' as urgent,
  n.created_at
FROM notification n
JOIN profil p ON n.profil_id = p.id
WHERE n.metadata->>'origine' = 'webhook_yousign'
ORDER BY n.created_at DESC;
```

#### Voir tous les incidents créés

```sql
SELECT
  i.id,
  p.nom || ' ' || p.prenom as employe,
  i.type,
  i.statut,
  i.metadata->>'date_fin' as date_fin,
  i.metadata->>'jours_depuis_expiration' as jours_expiré,
  i.created_at
FROM incident i
JOIN profil p ON i.profil_id = p.id
WHERE i.metadata->>'origine' = 'webhook_yousign'
ORDER BY i.created_at DESC;
```

#### Statistiques par type et source

```sql
SELECT
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE metadata->>'source_date' = 'contract_variables') as source_variables,
  COUNT(*) FILTER (WHERE metadata->>'source_date' = 'profil') as source_profil,
  COUNT(*) FILTER (WHERE metadata->>'source_date' = 'both_merged') as source_fusionnée
FROM notification
WHERE metadata->>'origine' = 'webhook_yousign'
GROUP BY type
ORDER BY type;
```

#### Vérifier l'absence de doublons

```sql
SELECT
  profil_id,
  type,
  COUNT(*) as occurrences
FROM (
  SELECT profil_id, type FROM notification
  WHERE metadata->>'origine' = 'webhook_yousign'
  UNION ALL
  SELECT profil_id, type FROM incident
  WHERE metadata->>'origine' = 'webhook_yousign'
) combined
GROUP BY profil_id, type
HAVING COUNT(*) > 1;
-- Devrait retourner 0 lignes
```

## 📊 Interface Frontend

### Affichage dans NotificationsList

L'interface affiche automatiquement les notifications avec des onglets :
- **CDD** : Fin de contrat CDD à renouveler
- **Avenant 1** : Fin du premier avenant
- **Avenant 2** : Fin du deuxième avenant
- **Autres** : Titre de séjour, visite médicale, etc.

Les badges et couleurs s'adaptent automatiquement au type :
- 🔵 **CDD** : Badge bleu "Fin CDD"
- 🟡 **Avenant 1** : Badge jaune "Fin Avenant 1"
- 🟠 **Avenant 2** : Badge orange "Fin Avenant 2"

### Affichage dans IncidentsList

Les incidents apparaissent avec :
- Type de document/contrat concerné
- Nombre de jours depuis expiration
- Statut actif/résolu
- Actions possibles (résoudre, voir détails)

## ❓ FAQ

### Q1 : Pourquoi deux sources de dates pour les avenants ?

**R :** Le système doit gérer deux façons de stocker les dates :
1. **Dans le contrat** (`variables.date_fin`) : Date saisie lors de la création du contrat
2. **Dans le profil** (`avenant_X_date_fin`) : Date stockée au niveau du profil de l'employé

Prendre la plus récente garantit qu'on ne rate jamais une échéance, même si les dates sont mises à jour dans des endroits différents.

### Q2 : Que se passe-t-il si aucune date n'est trouvée ?

**R :** La fonction retourne une erreur :
```json
{
  "success": false,
  "error": "Aucune date_fin trouvée dans les sources disponibles",
  "notification_type": "avenant_1",
  "source_date": "none"
}
```
Le webhook ne bloque pas, il log l'erreur et continue.

### Q3 : Peut-on créer plusieurs notifications pour le même contrat ?

**R :** Non, le système vérifie les doublons. Si une notification ou incident existe déjà pour ce `profil_id` et ce `type`, la fonction refuse de créer un doublon :
```json
{
  "success": false,
  "error": "Une notification ou incident existe déjà pour ce profil et ce type"
}
```

### Q4 : Comment savoir quelle source de date a été utilisée ?

**R :** Les métadonnées contiennent toutes les informations :
```json
{
  "origine": "webhook_yousign",
  "source_date": "both_merged",  // ou "contract_variables" ou "profil"
  "date_fin": "2025-05-10",
  "date_fin_variables": "2025-03-15",
  "date_fin_profil": "2025-05-10"
}
```

### Q5 : Le système gère-t-il les CDI ?

**R :** Non, uniquement les CDD et avenants. Les CDI n'ont pas de date de fin donc pas besoin de notifications d'expiration.

### Q6 : Que se passe-t-il si le webhook échoue ?

**R :** Le webhook retourne toujours HTTP 200 à Yousign (pour éviter les retries). L'erreur est loggée mais le contrat est quand même marqué comme "signé". Les RH peuvent créer manuellement une notification si nécessaire.

### Q7 : Les notifications existantes sont-elles affectées ?

**R :** Non, le système crée uniquement des notifications pour les **nouveaux** contrats signés après déploiement. Les données existantes ne sont pas modifiées.

### Q8 : Comment tester sans envoyer de vrais emails Yousign ?

**R :** Utilisez les scripts SQL de test qui appellent directement la fonction `create_notification_or_incident_for_contract()` avec des contrats de test.

## 🔧 Dépannage

### Erreur : "Function not found"

**Cause :** La fonction SQL n'est pas déployée.

**Solution :**
```sql
-- Vérifier l'existence
SELECT proname FROM pg_proc
WHERE proname = 'create_notification_or_incident_for_contract';

-- Si vide, réexécuter create-auto-notification-for-contracts.sql
```

### Erreur : "Type non supporté"

**Cause :** Le modèle de contrat n'a pas le bon type.

**Solution :**
```sql
-- Vérifier le type du modèle
SELECT id, nom, type_contrat
FROM modele_contrat
WHERE id = 'uuid-du-modele';

-- Le type_contrat doit être 'CDD' ou 'Avenant'
```

### Aucune notification créée malgré le webhook

**Cause :** Le contrat n'est pas éligible (pas de date_fin).

**Solution :**
```sql
-- Vérifier les données du contrat
SELECT
  c.id,
  m.type_contrat as modele_type,
  c.variables->>'type_contrat' as variables_type,
  c.variables->>'date_fin' as variables_date,
  p.avenant_1_date_fin,
  p.avenant_2_date_fin
FROM contrat c
JOIN modele_contrat m ON c.modele_id = m.id
JOIN profil p ON c.profil_id = p.id
WHERE c.id = 'uuid-du-contrat';
```

### Les logs du webhook ne s'affichent pas

**Cause :** Délai de propagation des logs.

**Solution :**
1. Attendre 1-2 minutes
2. Rafraîchir la page des logs dans Supabase Dashboard
3. Filtrer par "yousign-webhook"

## 📝 Métadonnées Stockées

Chaque notification/incident créé contient des métadonnées riches :

```json
{
  "origine": "webhook_yousign",
  "contract_id": "uuid-du-contrat",
  "date_creation": "2025-01-15T10:30:00Z",
  "date_fin": "2025-05-10",
  "source_date": "both_merged",
  "date_fin_variables": "2025-03-15",
  "date_fin_profil": "2025-05-10",
  "urgent": true,
  "jours_depuis_expiration": 5
}
```

Ces métadonnées permettent :
- ✅ Traçabilité complète
- ✅ Audit des décisions automatiques
- ✅ Débogage facilité
- ✅ Statistiques détaillées

## 🎉 Résumé

Le système est maintenant opérationnel et :

✅ Génère automatiquement notifications/incidents pour CDD, Avenant 1 et Avenant 2
✅ Fusionne intelligemment les dates multiples pour les avenants
✅ Prévient les doublons
✅ Gère les trois scénarios (J-30, urgent, expiré)
✅ Fournit des logs détaillés
✅ S'intègre parfaitement à l'interface existante
✅ Ne nécessite aucune intervention manuelle des RH

Les RH voient maintenant automatiquement toutes les échéances de contrats dans leurs onglets de notifications et peuvent agir en conséquence.
