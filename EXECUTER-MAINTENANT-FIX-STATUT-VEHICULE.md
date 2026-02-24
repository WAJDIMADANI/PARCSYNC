# Fix Urgent - Erreur changement statut véhicule

## Problème

Quand vous changez le statut d'un véhicule, vous obtenez l'erreur :
```
Key (modifie_par)=(4f087575-4771-4469-a876-7ae6199af546) is not present in table "app_utilisateur"
```

**Cause :** L'utilisateur existe dans `auth.users` mais pas dans `app_utilisateur`. Le trigger qui enregistre l'historique des statuts ne peut pas créer l'enregistrement.

## Solution en 1 étape

### Exécuter le script SQL

1. Allez dans **Supabase Dashboard** → **SQL Editor**
2. Copiez-collez le contenu du fichier : `FIX-HISTORIQUE-STATUT-VEHICULE-FK.sql`
3. Cliquez sur **Run**

C'est tout !

## Ce que fait le script

### 1. Crée une fonction helper
```sql
get_app_user_id() -- Retourne l'ID app_utilisateur depuis auth.uid()
```

### 2. Recrée le trigger intelligent
Le trigger `track_vehicule_statut_changes` :
- Utilise `get_app_user_id()` au lieu de `auth.uid()` directement
- Crée automatiquement l'utilisateur dans `app_utilisateur` s'il n'existe pas
- Enregistre l'historique du changement de statut

### 3. Synchronise les utilisateurs existants
Crée automatiquement les entrées manquantes dans `app_utilisateur` pour tous les utilisateurs `auth.users`

### 4. Corrige les politiques RLS
Met à jour les politiques pour permettre l'insertion via le trigger

## Vérification

Après avoir exécuté le script, le résultat affiche :
- Liste des utilisateurs synchronisés
- État du trigger

### Test
1. Ouvrez un véhicule
2. Changez son statut (ex: Actif → En maintenance)
3. Cliquez sur "Sauvegarder"
4. ✅ Pas d'erreur !
5. Allez dans l'onglet "Historique" du véhicule
6. ✅ Le changement de statut est enregistré

## Avantages de cette solution

✅ **Automatique** : Les utilisateurs manquants sont créés automatiquement
✅ **Robuste** : Le trigger gère tous les cas de figure
✅ **Sécurisé** : Utilise les politiques RLS appropriées
✅ **Traçable** : Tous les changements sont enregistrés dans l'historique

## En cas de problème

Si l'erreur persiste :

1. Vérifiez que l'utilisateur existe dans app_utilisateur :
```sql
SELECT id, email, nom, prenom
FROM app_utilisateur
WHERE auth_user_id = auth.uid();
```

2. Vérifiez le trigger :
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'track_vehicule_statut_vehicule_changes';
```

3. Testez la fonction :
```sql
SELECT get_app_user_id();
-- Doit retourner votre ID app_utilisateur
```

## Fichiers liés

- `FIX-HISTORIQUE-STATUT-VEHICULE-FK.sql` - Script SQL complet
- `create-historique-statut-vehicule.sql` - Script de création initial (si besoin)
