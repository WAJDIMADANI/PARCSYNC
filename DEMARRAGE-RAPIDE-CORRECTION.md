# Démarrage Rapide - Correction Contrats Yousign

## 🎯 Objectif

Corriger tous les contrats signés via Yousign pour qu'ils soient détectés par le système d'expiration automatique.

## 📋 Étapes (5 minutes)

### 1️⃣ Exécuter le Script de Correction

Allez dans **Supabase Dashboard** → **SQL Editor** → Nouveau Query

Copiez-collez le contenu de **`fix-existing-yousign-contracts.sql`**

Cliquez sur **Run**

**Résultat attendu:**
```
Contrats corrigés: XX
CDD: XX
CDI: XX
Avec date_fin: XX
Statut actif: XX
```

### 2️⃣ Vérifier le Contrat de Wajdi

```sql
SELECT
  id,
  type,
  date_fin,
  statut,
  CASE WHEN type = 'CDD' THEN '✅' ELSE '❌' END as type_ok,
  CASE WHEN date_fin IS NOT NULL THEN '✅' ELSE '❌' END as date_ok,
  CASE WHEN statut = 'actif' THEN '✅' ELSE '❌' END as statut_ok
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
```

**Vous devez voir:** Tous les ✅

### 3️⃣ Tester la Détection

```sql
SELECT * FROM generate_daily_expired_incidents();
```

Si la date de fin du contrat est dans moins de 30 jours, un incident sera créé!

### 4️⃣ Déployer le Webhook Corrigé

**Option A: Via CLI (recommandé)**
```bash
cd supabase/functions
supabase functions deploy yousign-webhook --no-verify-jwt
```

**Option B: Copie manuelle**
1. Ouvrez **Supabase Dashboard** → **Edge Functions**
2. Sélectionnez **yousign-webhook**
3. Remplacez le code par le contenu de `supabase/functions/yousign-webhook/index.ts`
4. Cliquez sur **Deploy**

### 5️⃣ Vérification Finale

Testez avec un nouveau contrat Yousign (ou simulez avec les logs):

Les prochains contrats signés auront automatiquement:
- ✅ `type` renseigné
- ✅ `date_debut` renseignée
- ✅ `date_fin` renseignée (si CDD)
- ✅ `statut = "actif"`

## 🔍 Scripts de Test

### Test Complet
```bash
# Exécutez dans SQL Editor
\i test-correction-wajdi.sql
```

### Vérification Manuelle Rapide
```sql
-- Voir tous les contrats CDD avec expiration
SELECT
  p.prenom,
  p.nom,
  c.type,
  c.date_fin,
  c.statut,
  (c.date_fin - CURRENT_DATE) as jours_restants
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE c.type = 'CDD'
  AND c.date_fin IS NOT NULL
ORDER BY c.date_fin;
```

## ✅ Checklist Finale

- [ ] Script SQL exécuté
- [ ] Contrat de Wajdi corrigé (type, date_fin, statut)
- [ ] Fonction de détection testée
- [ ] Webhook déployé
- [ ] Test avec un nouveau contrat

## 🚨 En Cas de Problème

### "Type still NULL"
→ Vérifiez que le modèle du contrat a un `type_contrat` défini

### "Date_fin still NULL"
→ Vérifiez que `variables.date_fin` existe dans le contrat

### "Statut not actif"
→ Réexécutez: `UPDATE contrat SET statut = 'actif' WHERE statut = 'signe';`

### "Webhook fails"
→ Vérifiez les logs dans **Edge Functions** → **yousign-webhook** → **Logs**

## 📚 Documentation Complète

Voir: **CORRECTION-CONTRATS-YOUSIGN.md**

## 🎉 C'est Tout!

Maintenant tous vos contrats Yousign seront automatiquement détectés pour l'expiration!
