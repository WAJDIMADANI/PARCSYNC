# FIX : Incidents de contrat expiré obsolètes

## Problème

**Gerson BENOLIEL PENELAS** (et potentiellement d'autres salariés) apparaissent dans l'onglet **Incidents > Avenant** ou **Document expiré** alors qu'ils ont déjà signé un nouveau contrat valide.

### Cas de Gerson :
- Ancien CDD : 12/01/2026 → 20/02/2026 (expiré)
- Nouveau contrat Avenant : 20/02/2026 → 03/07/2026 (actif, signé le 19/02/2026)
- **Problème** : Un incident "contrat_expire" existe toujours pour l'ancien CDD

## Cause

Les incidents de type `contrat_expire` ne sont **pas automatiquement résolus** quand un nouveau contrat est signé pour le même salarié.

## Solution

### 1. Diagnostic (optionnel)

Avant de corriger, vous pouvez exécuter ce script pour voir tous les incidents obsolètes :

```sql
-- Voir le fichier : /tmp/DIAGNOSTIC_INCIDENTS_OBSOLETES.sql
```

Ce script affiche :
- Tous les salariés avec un incident "contrat_expire" actif
- Qui ont un contrat plus récent signé/actif
- Le nombre total d'incidents obsolètes

### 2. Correction complète

Exécutez ce script SQL dans **Supabase SQL Editor** :

```sql
-- Voir le fichier : /tmp/fix_gerson_and_auto_resolve.sql
```

Ce script fait 3 choses :

1. **Crée une fonction automatique** `auto_resolve_expired_contract_incidents()`
   - Résout automatiquement les incidents obsolètes quand un nouveau contrat est signé

2. **Crée un trigger** `trigger_auto_resolve_expired_incidents`
   - S'active sur INSERT/UPDATE de la table `contrat`
   - Appelle la fonction automatiquement

3. **Correction immédiate**
   - Résout tous les incidents obsolètes existants (Gerson et autres)
   - Ajoute une note explicative à chaque incident résolu

### 3. Vérification

Après exécution :
1. Le script affiche la liste des incidents résolus
2. Rafraîchissez la page **Incidents** dans l'application
3. Gerson (et autres) ne devraient plus apparaître dans "Document expiré"

## Comportement futur

Désormais, **automatiquement** :

- Quand un contrat est signé (statut = 'signe' ou 'actif')
- Les incidents "contrat_expire" avec une date d'expiration antérieure au nouveau contrat
- Sont marqués comme "resolu" avec une note explicative
- Un historique est créé pour tracer la résolution

## Logique de résolution

Un incident est résolu si :
```
nouveau_contrat.statut IN ('signe', 'actif')
AND nouveau_contrat.date_fin > CURRENT_DATE  (contrat encore valide)
AND incident.date_expiration_originale < nouveau_contrat.date_debut
```

## Fichiers créés

- `/tmp/DIAGNOSTIC_INCIDENTS_OBSOLETES.sql` : Diagnostic avant correction
- `/tmp/fix_gerson_and_auto_resolve.sql` : Script de correction complet
- `FIX-INCIDENTS-CONTRAT-OBSOLETES.md` : Ce guide

## En résumé

1. Exécutez `/tmp/fix_gerson_and_auto_resolve.sql` dans Supabase
2. Rafraîchissez la page Incidents
3. Les incidents obsolètes disparaissent
4. À l'avenir, cela se fera automatiquement
