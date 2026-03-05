# 🔧 FIX IMMÉDIAT : Erreur "assigned_to does not exist"

## ❌ Problème

Quand vous modifiez les dates d'expiration dans le modal salarié, vous obtenez cette erreur :

```
Erreur de sauvegarde: column "assigned_to" does not exist
```

## ✅ Solution Rapide

### Étape 1 : Exécuter le Fix SQL

Dans **Supabase Dashboard** → **SQL Editor** :

```sql
-- Copiez-collez le contenu du fichier :
FIX-ERREUR-ASSIGNED-TO-DATES-EXPIRATION.sql
```

### Étape 2 : Cliquer sur Run

Attendez le message :
```
✅ Fonction update_incident_expiration_date_only recréée avec succès
✅ Correction appliquée : plus d'erreur "assigned_to does not exist"
```

### Étape 3 : Tester

1. Ouvrez un profil salarié
2. Modifiez une date (ex: Date RDV, Titre de séjour, etc.)
3. Cliquez sur **Enregistrer**
4. ✅ Ça marche !

---

## 🔍 Cause du Problème

La fonction `update_incident_expiration_date_only` essayait d'accéder à une colonne `assigned_to` qui n'existe pas dans la table `incident`.

## 🛠️ Ce Que Fait le Fix

1. Supprime l'ancienne fonction problématique
2. Recrée la fonction **sans référence à `assigned_to`**
3. Utilise les bons noms de colonnes
4. Gère correctement les types de données

---

## 📋 Test Rapide

```sql
-- Tester la fonction manuellement
SELECT update_incident_expiration_date_only(
  (SELECT id FROM profil LIMIT 1)::uuid,
  'titre_sejour',
  '2024-12-31'::date,
  'Test de la fonction'
);
```

**Résultat attendu :**
```json
{
  "success": true,
  "incident_id": "...",
  "updated": true,
  "message": "Date d'expiration mise à jour avec succès"
}
```

---

## ✅ Après le Fix

Vous pourrez modifier toutes les dates dans le modal salarié sans erreur :

- ✅ Date RDV Visite Médicale
- ✅ Heure RDV
- ✅ Date fin Titre de Séjour
- ✅ Date fin Visite Médicale
- ✅ Dates avenants

---

## 🆘 Si Ça Ne Marche Toujours Pas

Vérifiez que la fonction existe :

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'update_incident_expiration_date_only';
```

Vous devriez voir :
```
routine_name                        | routine_type
-----------------------------------|-------------
update_incident_expiration_date_only | FUNCTION
```

---

**🚀 Problème résolu en 1 minute !**
