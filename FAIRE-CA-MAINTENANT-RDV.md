# À FAIRE MAINTENANT - Corriger les RDV

## 🎯 Situation

Vous voyez **2 RDV** dans la liste :
1. "RDV Visite Médicale DEMAIN"
2. "RDV Visite Médicale AUJOURD'HUI"

Mais la console affiche **`total: 1`**

## ❌ Problème

Un des 2 RDV n'a **pas** le type `rdv_visite_medicale` dans la base de données.

## ✅ Solution en 2 étapes

### Étape 1 : Exécuter ce SQL dans Supabase

Copiez-collez ce code dans le **SQL Editor** de Supabase :

```sql
-- Corriger TOUS les RDV
UPDATE inbox
SET
  type = 'rdv_visite_medicale',
  updated_at = NOW()
WHERE (
  titre ILIKE '%rdv%visite%médicale%'
  OR titre ILIKE '%visite%médicale%'
  OR titre ILIKE '%rdv%'
)
AND reference_type = 'profil'
AND (type IS NULL OR type != 'rdv_visite_medicale');

-- Vérifier le résultat
SELECT
  id,
  type,
  titre,
  statut,
  lu,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as date_creation
FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC;
```

Cliquez sur **RUN** (ou Ctrl+Enter)

### Étape 2 : Recharger la page

Dans votre navigateur, appuyez sur **F5** pour recharger la page "Boîte de Réception"

## 📊 Résultat attendu

Après ces 2 étapes, vous devriez voir dans la console :

```javascript
📅 RDV Visite Médicale détails: {
  total: 2,  // ← 2 au lieu de 1
  lus: 0,
  nonLus: 2,
  liste: [
    { titre: 'RDV Visite Médicale DEMAIN', statut: 'nouveau', lu: false },
    { titre: 'RDV Visite Médicale AUJOURD''HUI', statut: 'nouveau', lu: false }
  ]
}
```

Et dans l'interface :
- **Carte RDV** : Affiche **2**
- **Filtre RDV** : Affiche **les 2 RDV**

## 🔍 Vérification

Pour vérifier que c'est bien corrigé, cherchez dans la console le log :

```javascript
🔍 RDV dans inbox (brut): 2 trouvés
```

Si vous voyez **2 trouvés**, c'est bon !

## 📝 Pourquoi ce problème ?

Les notifications RDV peuvent être créées de différentes manières :
1. Par la fonction automatique `generate_rdv_visite_medicale_inbox_notifications()`
2. Manuellement par un utilisateur
3. Par un trigger

Parfois, le champ `type` n'est pas rempli correctement. La correction SQL ci-dessus trouve **tous** les messages qui parlent de RDV et leur assigne le bon type.

## 🎉 C'est tout !

Après avoir exécuté le SQL et rechargé la page, vous verrez **tous vos RDV** !
