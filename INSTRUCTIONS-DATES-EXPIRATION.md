# Instructions - Dates d'expiration des documents

## ⚠️ ÉTAPE OBLIGATOIRE AVANT D'UTILISER LA FONCTIONNALITÉ

### Vous devez d'abord exécuter la migration SQL dans Supabase !

L'erreur que vous rencontrez est due au fait que les colonnes `certificat_medical_expiration` et `permis_expiration` n'existent pas encore dans votre base de données.

## 📋 Comment exécuter la migration

### Méthode 1 : Via l'interface Supabase (RECOMMANDÉ)

1. Ouvrez votre projet Supabase : https://supabase.com/dashboard
2. Cliquez sur "SQL Editor" dans le menu de gauche
3. Cliquez sur "+ New Query"
4. Copiez TOUT le contenu du fichier `add-document-expiration-dates.sql`
5. Collez-le dans l'éditeur SQL
6. Cliquez sur "Run" (ou appuyez sur Ctrl+Enter)
7. Vérifiez qu'il n'y a pas d'erreur (vous devriez voir "Success. No rows returned")

### Méthode 2 : Via le terminal Supabase CLI

Si vous avez le CLI Supabase installé :

```bash
supabase db push
```

## ✅ Vérification

Pour vérifier que la migration a bien été exécutée :

1. Dans Supabase, allez dans "Table Editor"
2. Sélectionnez la table "profil"
3. Vérifiez que les colonnes suivantes existent :
   - `certificat_medical_expiration` (type: date)
   - `permis_expiration` (type: date)

## 🎯 Utilisation de la fonctionnalité

Une fois la migration exécutée :

1. Ouvrez la liste des salariés
2. Cliquez sur un salarié pour ouvrir son profil
3. Trouvez la section "Documents importants" (fond violet/purple)
4. Cliquez sur le bouton "Modifier"
5. Sélectionnez les dates d'expiration pour :
   - Le certificat médical
   - Le permis de conduire
6. Cliquez sur "Enregistrer"

## 🔍 En cas de problème

Si vous voyez toujours une erreur après avoir exécuté la migration :

1. Vérifiez dans la console du navigateur (F12) pour voir le message d'erreur détaillé
2. Vérifiez que vous êtes bien connecté en tant qu'utilisateur authentifié
3. Vérifiez que les politiques RLS sont bien configurées (elles le sont déjà normalement)

## 📝 Ce qui a été modifié

### Base de données
- 2 nouvelles colonnes dans la table `profil`

### Interface utilisateur
- Nouvelle section "Documents importants" dans le modal salarié
- Mode édition avec champs de type date
- Boutons Modifier/Annuler/Enregistrer
- Messages d'erreur détaillés

### Code
- Interface TypeScript `Employee` mise à jour
- Fonction de sauvegarde `handleSaveExpirationDates`
- Gestion d'état pour le mode édition
- Meilleure gestion des erreurs avec messages explicites
