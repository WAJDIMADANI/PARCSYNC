# Résumé - Correction incidents contrats expirés obsolètes

## Problème identifié

Des profils avec un **CDI signé/actif** apparaissent encore dans **Incidents > Contrats expirés** à cause de leurs anciens CDD/avenants expirés.

**Exemple :** Didier RENARD a un CDI signé le 01/01/2025, mais des incidents actifs existent sur ses avenants expirés en décembre 2024.

## Solution en 1 étape

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier-coller **`FIX-INCIDENTS-CONTRAT-OBSOLETES.sql`**
3. Cliquer sur **Run**

## Ce qui est corrigé

- `get_cdd_expires()` - Exclut CDD couverts par CDI
- `get_avenants_expires()` - Exclut avenants couverts par CDI
- Résolution automatique des incidents obsolètes existants
- Trigger auto-résolution lors création CDI (prévention future)

## Résultat

### Avant
- Didier RENARD avec CDI apparaît dans "Contrats expirés"
- Compteur : 25 incidents (gonflé artificiellement)

### Après
- Didier RENARD n'apparaît plus
- Compteur : 10 incidents (uniquement vrais cas sans CDI)
- Incidents obsolètes marqués `resolu`

## Fichiers créés

1. **FIX-INCIDENTS-CONTRAT-OBSOLETES.sql** ⭐ (à exécuter)
2. **EXECUTER-MAINTENANT-FIX-INCIDENTS-OBSOLETES.md** (guide détaillé)
3. **DIAGNOSTIC-COMPLET-INCIDENTS-OBSOLETES.sql** (diagnostic)
