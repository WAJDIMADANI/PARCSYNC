# Instructions: Corriger le Contrat de Wajdi

## Problème Actuel

Le contrat de Wajdi a:
- ❌ `type: NULL`
- ❌ `date_fin: NULL`
- ❌ `statut: valide` (devrait être `actif`)

## Solution en 3 Étapes

### Étape 1: Corriger la Contrainte CHECK (OBLIGATOIRE)

**Fichier:** `fix-contrat-statut-constraint.sql`

```sql
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_statut_check;

ALTER TABLE contrat ADD CONSTRAINT contrat_statut_check
  CHECK (statut IN ('envoye', 'en_attente_signature', 'signe', 'valide', 'actif'));
```

**Pourquoi?** La contrainte actuelle bloque le statut `'actif'`

### Étape 2: Diagnostiquer le Contrat (Optionnel mais recommandé)

**Fichier:** `DIAGNOSTIC-CONTRAT-WAJDI-COMPLET.sql`

Exécutez ce script pour voir TOUTES les informations du contrat.

Cela vous dira:
- ✅ Quelles données sont disponibles dans `variables` JSON
- ✅ Si un `modele_id` existe
- ✅ Pourquoi la correction automatique n'a pas fonctionné

### Étape 3A: Correction Rapide (Recommandé pour test)

**Fichier:** `FIX-WAJDI-DIRECT.sql`

Ce script corrige DIRECTEMENT le contrat de Wajdi avec les dates qui étaient dans l'erreur:
- `date_debut`: 2025-10-21
- `date_fin`: 2026-07-03
- `type`: CDD
- `statut`: actif

**Avantage:** Correction rapide et ciblée

### Étape 3B: Correction Globale (Pour tous les contrats)

**Fichier:** `fix-existing-yousign-contracts.sql`

Ce script corrige TOUS les contrats Yousign en une seule fois.

**Avantage:** Corrige tous les contrats d'un coup

## Ordre d'Exécution

```
1. fix-contrat-statut-constraint.sql      (OBLIGATOIRE EN PREMIER)
2. DIAGNOSTIC-CONTRAT-WAJDI-COMPLET.sql   (Optionnel - pour voir les données)
3A. FIX-WAJDI-DIRECT.sql                  (Test rapide - juste Wajdi)
   OU
3B. fix-existing-yousign-contracts.sql    (Correction globale - tous les contrats)
```

## Après Correction

Vérifiez avec:

```sql
SELECT type, date_debut, date_fin, statut
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
```

**Résultat attendu:**
```
type: CDD (ou cdd)
date_debut: 2025-10-21
date_fin: 2026-07-03
statut: actif
```

## Test de Détection

Une fois corrigé, testez la détection automatique:

```sql
-- Voir si le contrat serait détecté pour expiration
SELECT
  c.id,
  c.type,
  c.date_fin,
  c.statut,
  CASE
    WHEN c.type = 'CDD' AND c.date_fin = CURRENT_DATE AND c.statut = 'actif'
    THEN '✅ SERAIT DÉTECTÉ aujourd''hui'
    WHEN c.type = 'CDD' AND c.date_fin > CURRENT_DATE AND c.statut = 'actif'
    THEN '✅ SERA DÉTECTÉ le ' || c.date_fin::text
    ELSE '❌ Ne sera pas détecté'
  END as detection_status
FROM contrat c
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
```

## Fichiers Créés

- ✅ `fix-contrat-statut-constraint.sql` - Corrige la contrainte CHECK
- ✅ `DIAGNOSTIC-CONTRAT-WAJDI-COMPLET.sql` - Diagnostic complet
- ✅ `FIX-WAJDI-DIRECT.sql` - Correction directe de Wajdi
- ✅ `fix-existing-yousign-contracts.sql` - Correction globale
- ✅ `INSTRUCTIONS-CORRECTION-WAJDI.md` - Ce fichier
