# Vérification et Déploiement - Système Word Templates

## Statut de l'Implémentation

✅ **CODE FRONTEND COMPLET**
- `src/lib/wordTemplateGenerator.ts` - Génération Word
- `src/components/LetterTemplatesManager.tsx` - Import Word
- `src/components/GenerateLetterWizard.tsx` - Génération guidée

✅ **MIGRATIONS SQL PRÊTES**
- `add-word-template-support.sql` - Colonnes tables
- `create-word-template-storage.sql` - Buckets Storage

## Étapes de Vérification

### 1. Vérifier les Dépendances NPM

Les packages nécessaires sont déjà dans `package.json` :

```json
{
  "dependencies": {
    "docxtemplater": "^3.67.5",
    "pizzip": "^3.2.0",
    "file-saver": "^2.0.5",
    "mammoth": "^1.11.0"
  }
}
```

✅ **Pas d'action nécessaire** - Déjà installés

---

### 2. Appliquer les Migrations SQL

#### Option A : Via l'interface Supabase

1. Connectez-vous à votre projet Supabase : https://app.supabase.com
2. Allez dans **SQL Editor**
3. Exécutez les migrations dans cet ordre :

**Migration 1 : Colonnes tables**

```sql
-- Fichier : add-word-template-support.sql

-- Add columns to modele_courrier table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'fichier_word_url'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN fichier_word_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modele_courrier' AND column_name = 'utilise_template_word'
  ) THEN
    ALTER TABLE modele_courrier ADD COLUMN utilise_template_word boolean DEFAULT false;
  END IF;
END $$;

-- Add column to courrier_genere table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courrier_genere' AND column_name = 'fichier_word_genere_url'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN fichier_word_genere_url text;
  END IF;
END $$;
```

**Migration 2 : Buckets Storage**

```sql
-- Fichier : create-word-template-storage.sql

-- Create letter-templates bucket for storing original Word templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('letter-templates', 'letter-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Create generated-letters bucket for storing generated documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-letters', 'generated-letters', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for letter-templates bucket
CREATE POLICY "Authenticated users can upload templates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'letter-templates');

CREATE POLICY "Authenticated users can read templates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'letter-templates');

CREATE POLICY "Authenticated users can update templates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'letter-templates');

CREATE POLICY "Authenticated users can delete templates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'letter-templates');

-- RLS Policies for generated-letters bucket
CREATE POLICY "Authenticated users can upload generated letters"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'generated-letters');

CREATE POLICY "Authenticated users can read generated letters"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'generated-letters');

CREATE POLICY "Authenticated users can delete generated letters"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'generated-letters');
```

---

### 3. Vérifications Post-Migration

#### A. Vérifier les Colonnes

```sql
-- Vérifier modele_courrier
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'modele_courrier'
  AND column_name IN ('fichier_word_url', 'utilise_template_word');
```

**Résultat attendu :**
```
fichier_word_url        | text    | YES
utilise_template_word   | boolean | YES
```

```sql
-- Vérifier courrier_genere
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'courrier_genere'
  AND column_name = 'fichier_word_genere_url';
```

**Résultat attendu :**
```
fichier_word_genere_url | text | YES
```

#### B. Vérifier les Buckets Storage

```sql
SELECT
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id IN ('letter-templates', 'generated-letters');
```

**Résultat attendu :**
```
generated-letters | generated-letters | false | [date]
letter-templates  | letter-templates  | false | [date]
```

#### C. Vérifier les Policies RLS

```sql
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (qual::text LIKE '%letter-templates%' OR qual::text LIKE '%generated-letters%')
ORDER BY policyname;
```

**Résultat attendu :** 7 policies (4 pour letter-templates, 3 pour generated-letters)

---

### 4. Compiler le Projet

```bash
npm run build
```

**Vérification :**
- ✅ Pas d'erreurs TypeScript
- ✅ Build réussi

---

### 5. Tester le Flux Complet

#### Test 1 : Import d'un Modèle Word

1. Préparez un fichier Word de test avec :
   ```
   Madame, Monsieur {{nom}},

   Nous vous informons que {{prenom}} {{nom}} est convoqué(e).

   Date : {{date_reunion}}

   Cordialement,
   {{nom_entreprise}}
   ```

2. Dans l'application :
   - Allez dans **"Modèles de Courriers"**
   - Cliquez sur **"Importer Word"**
   - Sélectionnez votre fichier `.docx`

3. **Vérifications :**
   - ✅ Message de succès
   - ✅ Badge "Word" sur le modèle
   - ✅ Variables détectées affichées

#### Test 2 : Génération d'un Courrier

1. Allez dans **"Générer un Courrier"**

2. **Étape 1 :** Sélectionnez un salarié
   - ✅ Liste des salariés s'affiche
   - ✅ Sélection fonctionne

3. **Étape 2 :** Sélectionnez votre modèle Word
   - ✅ Le modèle a une icône verte et badge "Word"
   - ✅ Variables système et personnalisées affichées

4. **Étape 3 :** Remplissez les variables personnalisées
   - ✅ Champs de saisie pour `date_reunion`
   - ✅ Variables système en vert (auto-remplies)

5. **Génération :**
   - Cliquez sur **"Générer le Document Word"**
   - ✅ Le fichier Word se télécharge automatiquement
   - ✅ Message de succès

6. **Vérification du fichier généré :**
   - Ouvrez le fichier Word téléchargé
   - ✅ Les variables sont remplacées
   - ✅ La mise en forme est IDENTIQUE
   - ✅ Le logo est présent (si vous en aviez un)
   - ✅ Les tableaux sont intacts (si vous en aviez)

---

## Checklist Complète

### Code
- ✅ `wordTemplateGenerator.ts` existe et est complet
- ✅ `LetterTemplatesManager.tsx` a le bouton "Importer Word"
- ✅ `GenerateLetterWizard.tsx` gère les templates Word
- ✅ Dépendances NPM installées

### Base de Données
- ⬜ Colonne `fichier_word_url` dans `modele_courrier`
- ⬜ Colonne `utilise_template_word` dans `modele_courrier`
- ⬜ Colonne `fichier_word_genere_url` dans `courrier_genere`

### Storage
- ⬜ Bucket `letter-templates` créé
- ⬜ Bucket `generated-letters` créé
- ⬜ Policies RLS configurées (7 policies)

### Tests
- ⬜ Import d'un fichier Word réussi
- ⬜ Génération d'un courrier réussie
- ⬜ Fichier Word généré téléchargé
- ⬜ Mise en forme préservée dans le fichier généré

---

## Résolution de Problèmes

### Erreur : "Seuls les fichiers .docx sont acceptés"
**Solution :** Assurez-vous que votre fichier est bien en `.docx` (pas `.doc`)

### Erreur : "Erreur lors de l'upload"
**Solution :** Vérifiez que le bucket `letter-templates` existe et que les policies RLS sont configurées

### Erreur : "Erreur lors du téléchargement du modèle"
**Solution :**
1. Vérifiez que le bucket est accessible
2. Vérifiez l'URL du fichier dans la base de données
3. Vérifiez les policies RLS

### Les variables ne sont pas remplacées
**Solution :**
1. Vérifiez la syntaxe : `{{nom}}` (pas `{nom}` ou `[nom]`)
2. Vérifiez que le nom de la variable correspond
3. Regardez les logs de la console

### Le fichier Word est corrompu
**Solution :**
1. Vérifiez que le fichier original s'ouvre correctement
2. Essayez de réenregistrer le fichier en `.docx`
3. Vérifiez qu'il n'y a pas de contenu protégé

---

## Commandes Utiles

### Vérifier les tables
```bash
# Dans le SQL Editor de Supabase
\d modele_courrier
\d courrier_genere
```

### Vérifier les buckets
```sql
SELECT * FROM storage.buckets;
```

### Voir les fichiers uploadés
```sql
SELECT
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id IN ('letter-templates', 'generated-letters')
ORDER BY created_at DESC
LIMIT 10;
```

### Voir les courriers générés
```sql
SELECT
  id,
  modele_nom,
  sujet,
  fichier_word_genere_url,
  created_at
FROM courrier_genere
WHERE fichier_word_genere_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## Prochaines Étapes

Une fois le système vérifié et testé :

1. **Importez vos vrais modèles Word**
   - Lettres de convocation
   - Lettres de confirmation
   - Lettres administratives
   - etc.

2. **Testez avec de vrais salariés**

3. **Formez les utilisateurs RH**
   - Comment importer un modèle Word
   - Comment générer un courrier
   - Comment vérifier le résultat

---

## Support

### Fichiers de référence
- `GUIDE-UTILISATION-WORD-TEMPLATES.md` - Guide utilisateur complet
- `add-word-template-support.sql` - Migration colonnes
- `create-word-template-storage.sql` - Migration buckets

### Logs à vérifier
- Console du navigateur (F12)
- Onglet Network pour les uploads
- Logs Supabase Storage

---

**Le système est prêt. Il ne reste plus qu'à appliquer les migrations et tester !**
