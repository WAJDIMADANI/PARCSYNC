# FIX: Erreur d'import CSV - "Erreur de date PostgreSQL"

## Le Problème

Lors de l'import CSV en masse, vous obtenez cette erreur :
```
Erreur de date PostgreSQL. Dates présentes: Début contrat: 2025-10-21,
Fin contrat: 2026-07-03, Naissance: 1984-01-03, Entrée: 2025-10-21.
```

**CE N'EST PAS UN PROBLÈME DE DATES!**

Le vrai problème est une incompatibilité de schéma de base de données:
- Le code d'import essaie d'insérer des colonnes (`type`, `date_debut`, `date_fin`, `esign`, `source`)
- Ces colonnes n'existent pas dans votre table `contrat` actuelle
- La table `contrat` requiert une colonne `modele_id` (NOT NULL) que l'import ne fournit pas
- PostgreSQL rejette l'insertion à cause des colonnes manquantes
- Le message d'erreur JavaScript est trompeur et parle de "dates" alors que c'est un problème de schéma

## La Solution

### Étape 1: Appliquer la migration SQL

1. Ouvrez l'éditeur SQL de Supabase:
   https://supabase.com/dashboard/project/[votre-projet]/sql

2. Copiez et collez le contenu du fichier `fix-contrat-schema-for-import.sql`

3. Cliquez sur "RUN" pour exécuter la migration

Cette migration va:
- Rendre la colonne `modele_id` nullable (au lieu de required)
- Ajouter les colonnes manquantes: `type`, `date_debut`, `date_fin`, `esign`, `source`
- Créer des index pour améliorer les performances

### Étape 2: Vérifier les permissions

Dans la console, vous voyez:
```
Checking permission "admin/import-salarie": ❌ DENIED
Checking permission "admin/import-bulk": ✅ ALLOWED
```

**C'est normal!** Le premier check est juste le Sidebar qui vérifie quel menu afficher.
Pour l'import CSV, vous avez besoin de la permission `admin/import-bulk` qui est déjà ALLOWED.

Si le menu "Import en Masse" n'apparaît pas, exécutez cette requête SQL:

```sql
-- Vérifier vos permissions actuelles
SELECT p.email, array_agg(up.permission_id) as permissions
FROM app_utilisateur p
LEFT JOIN utilisateur_permissions up ON p.id = up.utilisateur_id
WHERE p.email = 'wajdi@mad-impact.com'
GROUP BY p.email;

-- Si la permission admin/import-bulk manque, l'ajouter
INSERT INTO utilisateur_permissions (utilisateur_id, permission_id)
SELECT u.id, 'admin/import-bulk'
FROM app_utilisateur u
WHERE u.email = 'wajdi@mad-impact.com'
AND NOT EXISTS (
  SELECT 1 FROM utilisateur_permissions up
  WHERE up.utilisateur_id = u.id AND up.permission_id = 'admin/import-bulk'
);
```

### Étape 3: Tester l'import

1. Rechargez la page dans votre navigateur
2. Allez dans **Administration > Import en Masse**
3. Importez votre fichier CSV
4. Vérifiez que les 338 lignes passent sans erreur

## Explications Techniques

### Pourquoi ce problème existe

Il y a eu une refonte de la table `contrat` avec deux schémas différents:

**Ancien schéma (utilisé par le code d'import):**
```sql
CREATE TABLE contrat (
  id uuid PRIMARY KEY,
  profil_id uuid NOT NULL,
  type text,              -- CDI, CDD, Avenant
  date_debut date,        -- Date de début du contrat
  date_fin date,          -- Date de fin (nullable pour CDI)
  esign text,             -- Statut de signature électronique
  ...
);
```

**Nouveau schéma (actuellement en base):**
```sql
CREATE TABLE contrat (
  id uuid PRIMARY KEY,
  profil_id uuid NOT NULL,
  modele_id uuid NOT NULL,        -- Template de contrat (REQUIRED!)
  variables jsonb DEFAULT '{}',    -- Variables du contrat
  date_signature timestamptz,      -- Date de signature
  statut text,                     -- envoye, signe, valide
  ...
);
```

Le code d'import utilise l'ancien schéma, donc l'insertion échoue.

### Pourquoi le message d'erreur parle de "dates"

Dans le fichier `ImportSalariesBulk.tsx` ligne 928:

```typescript
if (errorMessage.includes('date/time field value out of range') ||
    errorMessage.includes('out of range')) {
  errorMessage = `Erreur de date PostgreSQL. Dates présentes: ...`;
}
```

Le code intercepte TOUTES les erreurs PostgreSQL et les transforme en "erreur de date", ce qui est trompeur.

### Après la correction

Après avoir appliqué la migration, la table `contrat` supportera BOTH schémas:
- Les imports CSV pourront utiliser `type`, `date_debut`, `date_fin`
- L'interface de contrats manuelle pourra utiliser `modele_id` et `variables`
- Les deux approches coexisteront sans conflit

## Vérification

Après la migration, vérifiez que les colonnes existent:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contrat'
ORDER BY ordinal_position;
```

Vous devriez voir:
- `type` (text, YES)
- `date_debut` (date, YES)
- `date_fin` (date, YES)
- `esign` (text, YES)
- `source` (text, YES)
- `modele_id` (uuid, YES) - maintenant nullable!

## Support

Si l'erreur persiste après la migration:

1. Ouvrez la console du navigateur (F12)
2. Copiez TOUS les logs incluant:
   - `📝 Ligne X: Insertion profil avec données:`
   - `❌ Détails complets de l'erreur:`
3. Partagez ces logs pour diagnostic

Le problème devrait être complètement résolu après la migration SQL.
