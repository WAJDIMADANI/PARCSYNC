# Guide d'installation : Système de Soft Delete pour les Profils

## Vue d'ensemble

Ce système permet d'archiver les profils au lieu de les supprimer définitivement, préservant ainsi :
- L'historique des emails CRM (table `crm_email_recipients`)
- La possibilité de recréer un profil avec le même email (candidat → salarié)
- L'intégrité des données historiques

## Étape 1 : Appliquer la migration SQL

### Option A : Via l'éditeur SQL Supabase

1. Connectez-vous au dashboard Supabase
2. Allez dans "SQL Editor"
3. Créez une nouvelle requête
4. Copiez le contenu du fichier `add-soft-delete-profil.sql`
5. Exécutez la requête

### Option B : Via la CLI Supabase

```bash
supabase db execute < add-soft-delete-profil.sql
```

### Ce que fait la migration

La migration effectue les opérations suivantes :

1. **Ajout de la colonne `deleted_at`** sur la table `profil`
   - Type : `timestamptz`
   - Par défaut : `NULL` (profil actif)

2. **Création d'un index** sur `deleted_at` pour optimiser les performances

3. **Modification de la contrainte d'unicité sur `email`** :
   - Suppression de la contrainte unique globale
   - Création d'un index unique partiel : `UNIQUE(LOWER(email)) WHERE deleted_at IS NULL`
   - Permet plusieurs profils archivés avec le même email, mais un seul profil actif par email

## Étape 2 : Vérifier l'installation

### Vérification de la colonne

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profil' AND column_name = 'deleted_at';
```

Résultat attendu :
```
column_name | data_type                   | is_nullable
deleted_at  | timestamp with time zone    | YES
```

### Vérification de l'index unique

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profil' AND indexname = 'profil_email_unique_active';
```

### Test de l'unicité partielle

```sql
-- Test 1 : Créer deux profils avec le même email (l'un actif, l'autre archivé)
-- Doit réussir
INSERT INTO profil (nom, prenom, email, role, deleted_at)
VALUES ('Test', 'Actif', 'test@example.com', 'salarie', NULL);

INSERT INTO profil (nom, prenom, email, role, deleted_at)
VALUES ('Test', 'Archivé', 'test@example.com', 'salarie', NOW());

-- Test 2 : Créer deux profils actifs avec le même email
-- Doit échouer avec erreur de contrainte unique
INSERT INTO profil (nom, prenom, email, role, deleted_at)
VALUES ('Test', 'Actif2', 'test@example.com', 'salarie', NULL);

-- Nettoyage
DELETE FROM profil WHERE email = 'test@example.com';
```

## Étape 3 : Fonctionnalités frontend

### Où trouver le bouton "Supprimer"

Le bouton de suppression a été ajouté dans :

1. **Liste des salariés (EmployeeList)**
   - Ouvrez un profil en cliquant dessus
   - Dans le header du modal, vous verrez :
     - **Desktop** : Bouton rouge "Supprimer" avec icône
     - **Mobile** : Icône poubelle seule (responsive)

### Processus de suppression

1. Cliquez sur le bouton "Supprimer"
2. Un modal de confirmation s'affiche avec :
   - Nom du profil à supprimer
   - Informations sur ce qui sera conservé
   - Informations sur ce qui changera
3. Cliquez sur "Supprimer" pour confirmer ou "Annuler" pour abandonner
4. Le profil est archivé (colonne `deleted_at` définie à la date/heure actuelle)
5. Le profil disparaît de toutes les listes
6. Un message de succès s'affiche

### Comportement après archivage

#### Profils archivés ne sont plus visibles dans :
- Liste des employés (EmployeeList)
- Envoi d'emails CRM (CRMEmailsNew)
- Dashboard RH (RHDashboard)
- Liste des contrats (ContractsList)
- Toutes les recherches et sélections

#### L'historique est préservé :
- Emails CRM envoyés (table `crm_email_recipients`)
- Liens FK restent intacts
- Données historiques accessibles si nécessaire

#### Possibilité de recréer :
- Un nouveau profil avec le même email peut être créé
- Utile pour les candidats qui deviennent salariés

## Étape 4 : Modifications apportées au code

### Fichiers créés

1. **`src/components/ConfirmDeleteProfilModal.tsx`**
   - Modal de confirmation de suppression
   - Affiche les informations sur l'impact de la suppression

2. **`add-soft-delete-profil.sql`**
   - Migration SQL pour ajouter le soft delete

3. **`GUIDE-SOFT-DELETE-PROFILS.md`** (ce fichier)
   - Guide d'installation et d'utilisation

### Fichiers modifiés

1. **`src/components/EmployeeList.tsx`**
   - Ajout du filtre `.is('deleted_at', null)` dans la requête `fetchData`
   - Ajout du bouton "Supprimer" (responsive) dans le header du modal
   - Ajout de la fonction `handleDeleteProfil` pour archiver le profil
   - Ajout des états : `showDeleteConfirm`, `isDeleting`, `deleteSuccess`
   - Intégration du modal de confirmation

2. **`src/components/CRMEmailsNew.tsx`**
   - Ajout du filtre `.is('deleted_at', null)` dans `loadProfils`
   - Ajout du filtre `.is('deleted_at', null)` dans `loadProfilsBySecteur`

3. **`src/components/RHDashboard.tsx`**
   - Ajout du filtre `.is('deleted_at', null)` dans `fetchEmployeesStats` (2 requêtes)

4. **`src/components/ContractsList.tsx`**
   - Ajout du filtre `.is('deleted_at', null)` dans la récupération des profils

## Dépannage

### Problème : Le bouton "Supprimer" n'apparaît pas

- Vérifiez que vous avez bien ouvert le modal de détail d'un employé
- Sur mobile, vérifiez que l'icône poubelle est visible à côté du bouton de fermeture

### Problème : Erreur lors de la suppression

- Vérifiez que la migration SQL a bien été appliquée
- Vérifiez les logs de la console du navigateur
- Vérifiez que l'utilisateur a les permissions nécessaires sur la table `profil`

### Problème : Les profils archivés sont toujours visibles

- Vérifiez que le frontend a été rebuild et redéployé
- Videz le cache du navigateur (Ctrl+F5 ou Cmd+Shift+R)
- Vérifiez dans SQL que `deleted_at IS NULL` pour les profils actifs

### Restaurer un profil archivé (via SQL)

```sql
-- Pour restaurer un profil archivé
UPDATE profil
SET deleted_at = NULL
WHERE email = 'email@example.com' AND deleted_at IS NOT NULL;
```

### Voir tous les profils archivés

```sql
SELECT id, nom, prenom, email, deleted_at
FROM profil
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

## Notes importantes

1. **Les profils archivés ne sont PAS supprimés** : ils restent dans la base de données avec `deleted_at != NULL`

2. **L'historique est préservé** : tous les liens FK restent intacts

3. **Unicité de l'email** : un seul profil actif par email, mais plusieurs profils archivés possibles

4. **Pas de suppression réelle** : aucune donnée n'est définitivement perdue

5. **Restauration possible** : il suffit de mettre `deleted_at = NULL` pour restaurer un profil

## Support

En cas de problème :
1. Vérifiez la console du navigateur pour les erreurs JavaScript
2. Vérifiez les logs Supabase pour les erreurs SQL
3. Consultez ce guide pour les étapes de dépannage
4. Vérifiez que la migration SQL a bien été appliquée
