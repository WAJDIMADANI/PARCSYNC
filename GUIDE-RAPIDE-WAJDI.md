# Guide Rapide: Afficher Wajdi dans les Notifications

## Problème Identifié

Le contrat de Wajdi expire **AUJOURD'HUI** (11/12/2025) avec **0 jour restant**, mais il n'apparaît PAS dans les notifications.

### Cause

La fonction `generate_expiration_notifications()` utilise:
```sql
WHERE date_fin > CURRENT_DATE
```

Cela **exclut** les contrats qui expirent AUJOURD'HUI (où `date_fin = CURRENT_DATE`).

## Solution Rapide (2 minutes)

### Étape 1: Diagnostic (Optionnel)

**Supabase Dashboard → SQL Editor**

Exécutez: `POURQUOI-WAJDI-ABSENT-NOTIFICATIONS.sql`

Cela vous montrera exactement pourquoi Wajdi n'apparaît pas.

### Étape 2: Correction

**SQL Editor → Nouveau fichier**

Copiez-collez: `CORRIGER-NOTIFICATIONS-AUJOURDHUI.sql`

Cliquez sur **Run**

Ce script:
1. ✅ Corrige la fonction pour inclure les contrats qui expirent aujourd'hui
2. ✅ Exécute la fonction corrigée
3. ✅ Crée la notification pour Wajdi
4. ✅ Affiche la vérification

### Étape 3: Vérifier

1. **Rafraîchissez** l'application (F5)
2. **Notifications > Contrats CDD**
3. Cherchez **"wajdi"** ou **"15901"**
4. ✅ Wajdi MADANI apparaît!

## Détails Techniques

### Avant la Correction
```sql
-- Condition originale (EXCLUT aujourd'hui)
WHERE date_fin > CURRENT_DATE
  AND date_fin <= CURRENT_DATE + INTERVAL '30 days'
```

Si `date_fin = 11/12/2025` et `CURRENT_DATE = 11/12/2025`:
- `date_fin > CURRENT_DATE` → **FAUX** (11/12 n'est pas > 11/12)
- **Résultat:** Contrat NON détecté

### Après la Correction
```sql
-- Condition corrigée (INCLUT aujourd'hui)
WHERE date_fin >= CURRENT_DATE
  AND date_fin <= CURRENT_DATE + INTERVAL '30 days'
```

Si `date_fin = 11/12/2025` et `CURRENT_DATE = 11/12/2025`:
- `date_fin >= CURRENT_DATE` → **VRAI** (11/12 >= 11/12)
- **Résultat:** Contrat détecté ✅

## En Production

Une fois corrigé, le système détectera automatiquement:
- ✅ Contrats qui expirent **AUJOURD'HUI**
- ✅ Contrats qui expirent dans les **30 prochains jours**

Tous les types de contrats:
- ✅ Import masse
- ✅ Yousign (comme Wajdi)
- ✅ Manuel

## Dépannage

### La notification n'apparaît toujours pas

1. **Vérifiez le statut du contrat**
   - Il doit être `statut = 'actif'`
   - Pas `'signe'` ou `'valide'`

2. **Vérifiez les filtres de l'interface**
   - Onglet "Active" vs "Toutes"
   - Filtre de recherche

3. **Rafraîchissez la page**
   - Appuyez sur F5
   - Ou rechargez complètement

4. **Vérifiez dans la base de données**
   ```sql
   SELECT * FROM notification n
   JOIN contrat c ON c.profil_id = n.profil_id
   WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
   ```

### Le contrat est déjà passé (date_fin < CURRENT_DATE)

Si le contrat est déjà expiré depuis hier ou avant, la fonction ne générera pas de notification.

Dans ce cas, utilisez:
```sql
-- Créer manuellement la notification pour un contrat déjà expiré
INSERT INTO notification (
  type, titre, message, profil_id, date_echeance, statut
)
SELECT
  'contrat_cdd',
  'Contrat CDD expiré',
  format('Le contrat CDD de %s %s expire le %s', p.prenom, p.nom, to_char(c.date_fin, 'DD/MM/YYYY')),
  c.profil_id,
  c.date_fin,
  'active'
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE c.id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
```

## Fichiers Disponibles

### Diagnostic
- `POURQUOI-WAJDI-ABSENT-NOTIFICATIONS.sql` - Comprendre le problème

### Correction
- `CORRIGER-NOTIFICATIONS-AUJOURDHUI.sql` - Corriger la fonction et créer la notification

### Documentation
- `GUIDE-RAPIDE-WAJDI.md` - Ce fichier
- `SOLUTION-NOTIFICATIONS-CDD-30-JOURS.md` - Documentation complète

## Résumé

**Problème:** `date_fin > CURRENT_DATE` exclut les contrats qui expirent aujourd'hui

**Solution:** Changer en `date_fin >= CURRENT_DATE`

**Action:** Exécutez `CORRIGER-NOTIFICATIONS-AUJOURDHUI.sql` et rafraîchissez l'application
