# Migration des documents candidats

## Contexte
Tous les documents (CV, lettres de motivation, pièces d'identité, certificats médicaux, etc.) doivent être stockés dans la table `document` pour être consultables depuis le profil salarié.

## Architecture actuelle
- ✅ Table `document` avec `proprietaire_type` et `proprietaire_id`
- ✅ Colonne `candidat_id` dans la table `profil`
- ✅ Code frontend qui récupère les documents candidat + employé
- ✅ Formulaire de candidature qui crée les documents automatiquement

## Migration à exécuter

### Dans le SQL Editor de Supabase, exécute ce script :

```sql
/*
  # Migration finale pour unifier tous les documents
*/

-- Étape 1: Ajouter le lien candidat dans profil (si pas déjà fait)
ALTER TABLE profil ADD COLUMN IF NOT EXISTS candidat_id uuid REFERENCES candidat(id);

-- Étape 2: Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profil_candidat_id ON profil(candidat_id);
CREATE INDEX IF NOT EXISTS idx_document_proprietaire ON document(proprietaire_type, proprietaire_id);

-- Étape 3: Migrer les CV existants vers la table document
INSERT INTO document (proprietaire_type, proprietaire_id, type, fichier_url, created_at)
SELECT
  'candidat' as proprietaire_type,
  id as proprietaire_id,
  'cv' as type,
  cv_url as fichier_url,
  created_at
FROM candidat
WHERE cv_url IS NOT NULL
  AND cv_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM document
    WHERE document.proprietaire_id = candidat.id
      AND document.proprietaire_type = 'candidat'
      AND document.type = 'cv'
  );

-- Étape 4: Migrer les lettres de motivation vers la table document
INSERT INTO document (proprietaire_type, proprietaire_id, type, fichier_url, created_at)
SELECT
  'candidat' as proprietaire_type,
  id as proprietaire_id,
  'lettre_motivation' as type,
  lettre_motivation_url as fichier_url,
  created_at
FROM candidat
WHERE lettre_motivation_url IS NOT NULL
  AND lettre_motivation_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM document
    WHERE document.proprietaire_id = candidat.id
      AND document.proprietaire_type = 'candidat'
      AND document.type = 'lettre_motivation'
  );

-- Étape 5: Lier les profils aux candidats si l'email correspond
UPDATE profil p
SET candidat_id = c.id
FROM candidat c
WHERE p.email = c.email
  AND p.candidat_id IS NULL
  AND c.deleted_at IS NULL;

-- Vérification: Afficher le résultat
SELECT
  'Documents candidats migrés' as etape,
  COUNT(*) as nombre
FROM document
WHERE proprietaire_type = 'candidat'
UNION ALL
SELECT
  'Profils liés à candidat' as etape,
  COUNT(*) as nombre
FROM profil
WHERE candidat_id IS NOT NULL;
```

## Résultat attendu

Après la migration :
1. Tous les CV et lettres de motivation apparaîtront dans la table `document`
2. Les profils salariés seront liés à leur candidature d'origine
3. Dans la fiche salarié, tu verras TOUS les documents :
   - Documents candidat (CV, lettre de motivation)
   - Documents employé (certificat médical, pièces d'identité, etc.)

## Fonctionnement

Quand tu ouvres une fiche salarié :
1. Le système récupère le `candidat_id` du profil
2. Il charge les documents avec `proprietaire_id = profil.id` OU `proprietaire_id = candidat_id`
3. Tous les documents s'affichent dans la section "Documents"

## Prochains candidats

Les nouveaux candidats auront automatiquement leurs documents créés dans la table `document` grâce au code mis à jour dans `Apply.tsx`.
