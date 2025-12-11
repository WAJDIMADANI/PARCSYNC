# Résumé - Système de gestion des contrats expirés

## Objectif
Afficher automatiquement tous les contrats expirés (CDD + avenants) dans l'onglet Incidents de ParcSync.

## Ce qui a été fait

### 1. Backend (SQL)
✅ **Fichier:** `create-expired-contracts-incidents-system.sql`

- Ajout de la colonne `contrat_id` à la table `incident`
- Ajout du type `contrat_expire` dans les contraintes CHECK
- Ajout du statut `expire` dans les contraintes CHECK
- Création de la fonction `generate_expired_contract_incidents()` qui:
  - Génère automatiquement les incidents pour tous les CDD expirés
  - Génère automatiquement les incidents pour tous les avenants expirés
  - Protection anti-doublons (ne crée pas d'incident en double)
  - Retourne des statistiques (contrats expirés, incidents créés, incidents existants)
- Création de la fonction `update_expired_contract_statuses()` pour passer les incidents en statut "expire"
- Création d'une vue `v_incidents_contrats_expires` pour faciliter les requêtes
- **Génération immédiate des 53 incidents** (22 CDD + 31 avenants)
- Configuration du job quotidien (pg_cron si disponible)

### 2. Frontend (TypeScript)
✅ **Fichier:** `src/components/IncidentsList.tsx`

- Ajout du type `contrat_expire` dans l'interface `Incident`
- Ajout de la propriété `contrat_id` et `contrat` dans l'interface
- Modification de la requête pour récupérer les données du contrat lié
- Adaptation de `getTypeLabel()` pour distinguer:
  - "Contrat CDD" (pour les CDD expirés)
  - "Avenant au contrat" (pour les avenants expirés)
- Ajout de l'icône Calendar pour le type `contrat_expire`
- Ajout du filtre "Contrats expirés (CDD + Avenants)" dans le dropdown

### 3. Documentation
✅ **Fichier:** `GUIDE-DEPLOIEMENT-CONTRATS-EXPIRES.md`

Guide complet avec:
- Instructions de déploiement pas à pas
- Requêtes SQL de vérification
- Tests manuels
- Configuration du système automatique
- Dépannage
- Monitoring

## Déploiement

### Étape 1: Exécuter le SQL
```sql
-- Copier et exécuter dans Supabase SQL Editor
-- Fichier: create-expired-contracts-incidents-system.sql
```

### Étape 2: Rebuild le frontend
```bash
npm run build
```

### Étape 3: Vérifier
- Aller dans **Incidents** > **Expirés**
- Vous devriez voir **53 incidents** (22 CDD + 31 avenants)

## Résultat attendu

Dans l'onglet **Incidents** → **Expirés**, vous verrez:

```
Badge rouge "EXPIRÉ"
┌─────────────────────────────────────────────────────────────┐
│ 📅 Jean Dupont                              [EXPIRÉ]        │
│    jean.dupont@email.com | Contrat CDD                      │
│    Expiré le: 15/08/2024                                    │
│    [Contrat expiré - Nécessite une action]                  │
│                                                              │
│    [👤] [✉️ Rappel] [▶️ En cours] [✓ Résoudre] [✕ Ignorer] │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📅 Marie Martin                             [EXPIRÉ]        │
│    marie.martin@email.com | Avenant au contrat             │
│    Expiré le: 22/09/2024                                    │
│    [Contrat expiré - Nécessite une action]                  │
│                                                              │
│    [👤] [✉️ Rappel] [▶️ En cours] [✓ Résoudre] [✕ Ignorer] │
└─────────────────────────────────────────────────────────────┘
```

## Vérification rapide

```sql
-- Doit retourner 53 incidents
SELECT COUNT(*) FROM incident WHERE type = 'contrat_expire';

-- Répartition CDD vs Avenants
SELECT
  lower(c.type) AS type_contrat,
  COUNT(*) AS nb_incidents
FROM incident i
INNER JOIN contrat c ON i.contrat_id = c.id
WHERE i.type = 'contrat_expire'
GROUP BY lower(c.type);
```

**Résultat attendu:**
```
type_contrat | nb_incidents
-------------+--------------
cdd          |           22
avenant      |           31
```

## Fonctionnalités

### Actions disponibles pour chaque incident:
- **👤 Voir le profil** - Ouvre la fiche du salarié
- **✉️ Rappel** - Envoie un email de rappel au salarié
- **▶️ En cours** - Marque l'incident comme étant traité
- **✓ Résoudre** - Résout l'incident (demande une nouvelle date de validité)
- **✕ Ignorer** - Ignore l'incident

### Filtres:
- Par statut: Actifs, En cours, Résolus, Ignorés, **Expirés**
- Par type: Tous, Titre de séjour, Visite médicale, Permis de conduire, Contrat CDD, **Contrats expirés (CDD + Avenants)**
- Par recherche: Nom ou email du salarié

## Automatisation

Le système crée automatiquement un incident pour chaque nouveau contrat qui arrive à expiration.

### Comment ça marche:
1. Chaque jour à 1h du matin (si pg_cron est activé)
2. OU via une edge function appelée par un scheduler externe
3. La fonction `generate_expired_contract_incidents()` est exécutée
4. Elle vérifie tous les contrats où `type IN ('cdd', 'avenant')` et `date_fin < aujourd'hui`
5. Elle crée un incident pour chaque contrat expiré qui n'en a pas encore
6. Protection anti-doublons: un incident ne peut pas être créé deux fois pour le même contrat

## Support

Pour toute question ou problème:
1. Consulter `GUIDE-DEPLOIEMENT-CONTRATS-EXPIRES.md`
2. Vérifier les logs dans Supabase
3. Exécuter les requêtes SQL de diagnostic
