# COMMENCEZ ICI - Modèles Word

## C'est Déjà Fait !

✅ Le système est **COMPLÈTEMENT IMPLÉMENTÉ**

✅ Votre fichier Word est utilisé **TEL QUEL** - aucune modification

✅ Seules les variables `{{...}}` sont remplacées

---

## Ce Que Vous Devez Faire

### 1. Appliquer 2 Migrations SQL

Connectez-vous à Supabase : https://app.supabase.com

Allez dans **SQL Editor** et copiez-collez :

#### Migration 1 : Colonnes
```sql
-- Contenu du fichier : add-word-template-support.sql

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

#### Migration 2 : Storage
```sql
-- Contenu du fichier : create-word-template-storage.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('letter-templates', 'letter-templates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-letters', 'generated-letters', false)
ON CONFLICT (id) DO NOTHING;

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

### 2. Testez

1. **Créez un fichier Word de test :**

   ```
   CONVOCATION

   Madame, Monsieur {{nom}},

   Nous vous informons que {{prenom}} {{nom}} du site {{site_nom}}
   est convoqué(e) à une réunion.

   Date : {{date_reunion}}

   Cordialement,
   {{nom_entreprise}}
   ```

   Ajoutez votre logo, votre mise en forme préférée, des tableaux, etc.
   Sauvegardez en `.docx`

2. **Dans l'application :**
   - Allez dans "Modèles de Courriers"
   - Cliquez "Importer Word"
   - Sélectionnez votre fichier
   - ✅ Vous verrez un badge "Word" sur le modèle

3. **Générez un courrier :**
   - Allez dans "Générer un Courrier"
   - Sélectionnez un salarié
   - Choisissez votre modèle Word (icône verte)
   - Remplissez `date_reunion`
   - Cliquez "Générer le Document Word"
   - ✅ Le fichier Word se télécharge automatiquement

4. **Vérifiez le résultat :**
   - Ouvrez le fichier Word téléchargé
   - ✅ Les variables sont remplacées
   - ✅ Votre logo est présent
   - ✅ Votre mise en forme est IDENTIQUE
   - ✅ Vos tableaux sont intacts

---

## Comment Ça Fonctionne

### Votre Fichier Original

```
┌─────────────────────────────────────┐
│  [VOTRE LOGO]                       │
│                                     │
│  CONVOCATION                        │
│                                     │
│  Madame, Monsieur {{nom}},          │
│                                     │
│  Nous vous convoquons.              │
│                                     │
│  {{nom_entreprise}}                 │
│                                     │
│  [Pied de page]                     │
└─────────────────────────────────────┘
```

### Fichier Généré

```
┌─────────────────────────────────────┐
│  [VOTRE LOGO]                       │  ← CONSERVÉ
│                                     │
│  CONVOCATION                        │  ← CONSERVÉ
│                                     │
│  Madame, Monsieur DUPONT,           │  ← REMPLACÉ
│                                     │
│  Nous vous convoquons.              │  ← CONSERVÉ
│                                     │
│  TRANSPORT CLASSE AFFAIRE           │  ← REMPLACÉ
│                                     │
│  [Pied de page]                     │  ← CONSERVÉ
└─────────────────────────────────────┘
```

**Le système fait un "Rechercher et Remplacer" automatisé.**

---

## Variables Automatiques

Ces variables sont remplies automatiquement depuis la fiche du salarié :

| Variable | Exemple | Description |
|----------|---------|-------------|
| `{{nom}}` | DUPONT | Nom de famille |
| `{{prenom}}` | Jean | Prénom |
| `{{civilite}}` | Monsieur | Basé sur le genre |
| `{{matricule_tca}}` | 12345 | Matricule |
| `{{email}}` | jean.dupont@example.com | Email |
| `{{poste}}` | Chauffeur | Poste |
| `{{site_nom}}` | Paris | Site d'affectation |
| `{{date_entree}}` | 01/01/2020 | Date d'entrée |
| `{{nom_entreprise}}` | TRANSPORT CLASSE AFFAIRE | Nom entreprise |
| `{{date_aujourd_hui}}` | 06/12/2025 | Date du jour |

Plus de 30 variables disponibles ! Voir `GUIDE-UTILISATION-WORD-TEMPLATES.md`

---

## Variables Personnalisées

Ajoutez vos propres variables dans le modèle Word :

- `{{date_reunion}}` - Date d'une réunion
- `{{montant}}` - Un montant
- `{{motif}}` - Un motif spécifique
- `{{duree}}` - Une durée
- etc.

Le système vous demandera de les remplir lors de la génération.

---

## Documentation Complète

📖 **GUIDE-UTILISATION-WORD-TEMPLATES.md** - Guide utilisateur complet (40 pages)

🔧 **VERIFICATION-WORD-TEMPLATES.md** - Vérifications et déploiement

📋 **RESUME-WORD-TEMPLATES.md** - Résumé technique

---

## En Résumé

1. ✅ Code déjà implémenté
2. ✅ Votre fichier Word reste identique
3. ⬜ Appliquez 2 migrations SQL
4. ⬜ Testez avec un fichier Word
5. ✅ Utilisez avec vos vrais modèles

**C'est prêt ! Il ne manque que les 2 migrations SQL.**

---

## Support

Si vous rencontrez un problème :

1. Vérifiez que les migrations sont exécutées
2. Vérifiez que votre fichier est bien `.docx`
3. Vérifiez les variables avec `{{` et `}}`
4. Consultez la console du navigateur (F12)

**Le système utilise votre fichier Word ORIGINAL. Aucune modification n'est faite à votre mise en forme.**
