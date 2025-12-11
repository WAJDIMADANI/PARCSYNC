# Correction des Contrats Yousign

## Problème Identifié

Les contrats signés via Yousign n'ont pas les colonnes `type`, `date_debut` et `date_fin` renseignées, ce qui empêche la fonction `generate_daily_expired_incidents()` de détecter les contrats expirés.

**Exemple:**
```json
{
  "id": "4ce63c31-c775-4e50-98a4-d27966fccecc",
  "type": null,           // ❌ NULL
  "date_fin": null,       // ❌ NULL
  "statut": "valide"      // ❌ Devrait être "actif"
}
```

## Solution Implémentée

### 1. Webhook Yousign Amélioré ✅

Le webhook `yousign-webhook` a été modifié pour:

- **Récupérer automatiquement le type de contrat** depuis:
  - `modeles_contrats.type_contrat`
  - `variables.type_contrat`
  - Par défaut: `'CDI'`

- **Récupérer la date de fin** depuis:
  - Pour CDD: `variables.date_fin`
  - Pour Avenant 1: `variables.date_fin` ou `profil.avenant_1_date_fin`
  - Pour Avenant 2: `variables.date_fin` ou `profil.avenant_2_date_fin`

- **Récupérer la date de début** depuis:
  - `variables.date_debut`
  - Par défaut: date actuelle

- **Changer le statut** de `"signe"` à `"actif"` pour correspondre à la fonction de détection

### 2. Script de Correction Rétroactif ✅

Le fichier `fix-existing-yousign-contracts.sql` corrige tous les contrats existants.

## Déploiement

### Étape 1: Déployer le Webhook Modifié

```bash
# Depuis le dossier du projet
cd supabase/functions/yousign-webhook

# Déployer via Supabase CLI (si disponible)
supabase functions deploy yousign-webhook --no-verify-jwt
```

**OU** copiez manuellement le contenu de `supabase/functions/yousign-webhook/index.ts` dans l'éditeur Supabase.

### Étape 2: Corriger les Contrats Existants

Dans l'éditeur SQL de Supabase, exécutez:

```sql
-- Copiez le contenu de fix-existing-yousign-contracts.sql
```

### Étape 3: Vérifier la Correction

Testez avec le contrat de Wajdi:

```sql
SELECT
  id,
  type,
  date_fin,
  statut,
  CASE
    WHEN type = 'CDD' THEN '✅ Type OK'
    ELSE '❌ Type NON OK'
  END as check_type,
  CASE
    WHEN date_fin IS NOT NULL THEN '✅ Date OK'
    ELSE '❌ Date NON OK'
  END as check_date,
  CASE
    WHEN statut = 'actif' THEN '✅ Statut OK'
    ELSE '❌ Statut NON OK'
  END as check_statut
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
```

**Résultat attendu:**
```
✅ Type OK
✅ Date OK
✅ Statut OK
```

### Étape 4: Tester la Détection d'Incidents

```sql
SELECT * FROM generate_daily_expired_incidents();
```

## Changements Clés

| Avant | Après |
|-------|-------|
| `statut = "signe"` | `statut = "actif"` |
| `type = NULL` | `type = "CDD"` (ou selon modèle) |
| `date_fin = NULL` | `date_fin = "2025-01-15"` (depuis variables) |
| Pas de détection | ✅ Détection automatique |

## Impact

- ✅ Tous les nouveaux contrats Yousign auront les bonnes données
- ✅ Les contrats existants peuvent être corrigés avec le script SQL
- ✅ La détection d'expiration fonctionnera correctement
- ✅ Les incidents seront créés automatiquement pour les CDD expirés
- ✅ Aucune modification manuelle nécessaire à l'avenir

## Notes Importantes

1. **Le webhook ne touche pas** aux contrats qui ont déjà `type`, `date_debut`, `date_fin` renseignés
2. **Le statut "actif"** est maintenant utilisé au lieu de "signe" pour la cohérence avec la détection
3. **Les avenants** sont automatiquement convertis en type "CDD" pour le suivi d'expiration
4. **La date de début** est définie à la date actuelle si non spécifiée

## Vérifications Post-Déploiement

```sql
-- 1. Compter les contrats corrigés
SELECT
  COUNT(*) as total_yousign,
  COUNT(type) as with_type,
  COUNT(date_fin) as with_date_fin,
  SUM(CASE WHEN statut = 'actif' THEN 1 ELSE 0 END) as actif_count
FROM contrat
WHERE yousign_signature_request_id IS NOT NULL;

-- 2. Lister les contrats CDD avec date_fin
SELECT
  id,
  type,
  date_debut,
  date_fin,
  statut,
  (date_fin - CURRENT_DATE) as jours_restants
FROM contrat
WHERE type = 'CDD'
  AND date_fin IS NOT NULL
ORDER BY date_fin;
```
