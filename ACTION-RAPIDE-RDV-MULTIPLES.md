# Action rapide : Voir tous vos RDV

## 🚀 En 3 étapes

### 1️⃣ Ouvrez la console (F12)

Dans votre navigateur, appuyez sur F12 pour ouvrir la console

### 2️⃣ Rechargez la page "Boîte de Réception"

Dans la console, cherchez ces lignes :

```javascript
🔍 RDV dans inbox (brut): X trouvés
```

- **Si X = 0** → Allez à l'étape 3A
- **Si X = 1** → Allez à l'étape 3B
- **Si X > 1** → C'est bon ! Tous vos RDV s'affichent

### 3️⃣ Corrigez si besoin

#### 3A - Si 0 RDV trouvés (le type est incorrect)

Exécutez ce SQL dans Supabase :

```sql
UPDATE inbox
SET type = 'rdv_visite_medicale', updated_at = NOW()
WHERE reference_type = 'profil'
  AND (titre ILIKE '%rdv%' OR titre ILIKE '%visite%médicale%')
  AND (type IS NULL OR type != 'rdv_visite_medicale');

-- Puis vérifiez
SELECT COUNT(*) FROM inbox WHERE type = 'rdv_visite_medicale';
```

Ensuite rechargez la page.

#### 3B - Si 1 seul RDV (vous n'avez qu'1 RDV pour votre utilisateur)

Vérifiez combien vous avez :

```sql
-- Remplacez VOTRE_EMAIL
SELECT
  COUNT(*) as mes_rdv,
  au.email
FROM inbox i
INNER JOIN app_utilisateur au ON i.utilisateur_id = au.id
WHERE i.type = 'rdv_visite_medicale'
  AND au.email = 'VOTRE_EMAIL@example.com'
GROUP BY au.email;
```

Si vous voulez créer plus de RDV de test :

```sql
-- Exécutez: CREER-RDV-TEST-MULTIPLES.sql
-- (voir le fichier pour le script complet)
```

## ✅ Résultat attendu

Dans la console :
```javascript
📅 RDV Visite Médicale détails: {
  total: 5,  // ← Votre nombre de RDV
  lus: 2,
  nonLus: 3,
  liste: [...]
}
```

Dans l'interface :
- **Carte RDV** : Affiche 5 (ou votre nombre)
- **Filtre RDV** : Affiche tous les RDV

## 📚 Documentation complète

Pour plus de détails, voir :
- **GUIDE-DIAGNOSTIC-RDV-PLUSIEURS.md** - Guide complet pas à pas
- **SOLUTION-COMPLETE-RDV-MULTIPLES.md** - Solution détaillée
- **FIX-TYPE-RDV-VISITE-MEDICALE-MAINTENANT.sql** - Script de correction
- **CREER-RDV-TEST-MULTIPLES.sql** - Script de création de tests

## 🎯 Point clé

Le code affiche **TOUS** les RDV sans filtre. Si vous voyez 1 seul RDV, c'est soit :
1. Le type n'est pas correct dans la base → Corriger avec le SQL
2. Vous n'avez qu'1 RDV pour votre utilisateur → Créer plus de RDV
3. Vous n'avez pas les permissions RH → Vérifier les permissions
