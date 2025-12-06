# INDEX - Documentation Modèles Word

## Démarrage Rapide

### 🚀 **START-HERE-WORD-TEMPLATES.md**
**Commencez par ce fichier !**
- Vue d'ensemble rapide
- 2 migrations SQL à copier-coller
- Test rapide (5 minutes)
- Variables essentielles

---

## Documentation Complète

### 📖 **GUIDE-UTILISATION-WORD-TEMPLATES.md**
**Guide utilisateur complet (40 pages)**
- Comment ça marche en détail
- Flux complet Import → Génération
- Liste complète des 30+ variables
- Exemples concrets
- Structure technique des fichiers .docx
- FAQ complète

### 🔧 **VERIFICATION-WORD-TEMPLATES.md**
**Guide de vérification et déploiement**
- Checklist de vérification complète
- Commandes SQL de vérification
- Tests à effectuer
- Résolution de problèmes
- Logs à vérifier

### 📋 **RESUME-WORD-TEMPLATES.md**
**Résumé technique exécutif**
- Principe technique
- Garanties du système
- Exemple concret
- Checklist post-déploiement
- Commandes utiles

---

## Fichiers Techniques

### Migrations SQL

#### ✅ **add-word-template-support.sql**
Ajoute les colonnes nécessaires aux tables :
- `modele_courrier.fichier_word_url`
- `modele_courrier.utilise_template_word`
- `courrier_genere.fichier_word_genere_url`

#### ✅ **create-word-template-storage.sql**
Crée les buckets Supabase Storage :
- `letter-templates` - Stockage des modèles originaux
- `generated-letters` - Stockage des documents générés
- 7 policies RLS pour sécuriser l'accès

---

## Code Source

### 📁 **src/lib/wordTemplateGenerator.ts**
**Bibliothèque de génération Word**

Fonctions principales :
- `downloadTemplate()` - Télécharge le fichier original
- `generateWordDocument()` - Génère le Word avec variables remplies
- `extractVariablesFromWordTemplate()` - Détecte les variables
- `prepareTemplateData()` - Prépare les données du salarié
- `uploadGeneratedDocument()` - Upload dans Storage
- `downloadWordDocument()` - Télécharge automatiquement

### 📁 **src/components/LetterTemplatesManager.tsx**
**Interface de gestion des modèles**

Fonctionnalités :
- Liste des modèles avec badge "Word"
- Import de fichiers `.docx`
- Upload vers Supabase Storage
- Détection automatique des variables
- Modification et suppression de modèles

### 📁 **src/components/GenerateLetterWizard.tsx**
**Assistant de génération en 3 étapes**

Étapes :
1. Sélection du salarié
2. Sélection du modèle (détection auto Word/PDF)
3. Remplissage des variables personnalisées
4. Génération et téléchargement automatique

---

## Flux Technique

### 1. Import d'un Modèle Word

```
Utilisateur sélectionne fichier.docx
        ↓
LetterTemplatesManager.handleImportWord()
        ↓
extractVariablesFromWordTemplate() ← Lit sans modifier
        ↓
Upload vers Storage (bucket: letter-templates)
        ↓
Insert dans table modele_courrier
  - fichier_word_url: URL du fichier original
  - utilise_template_word: true
  - variables_systeme: [...]
  - variables_personnalisees: {...}
```

### 2. Génération d'un Courrier

```
Utilisateur sélectionne salarié + modèle
        ↓
GenerateLetterWizard détecte utilise_template_word = true
        ↓
prepareTemplateData(profil, customVariables)
        ↓
generateWordDocument(fichier_word_url, templateData)
  1. downloadTemplate() ← Télécharge l'ORIGINAL
  2. PizZip(templateData) ← Charge en mémoire
  3. Docxtemplater(zip) ← Prépare le remplacement
  4. doc.setData(variables) ← Définit les valeurs
  5. doc.render() ← Remplace les {{...}}
  6. doc.getZip().generate() ← Génère le résultat
        ↓
uploadGeneratedDocument() ← Upload dans generated-letters
        ↓
Insert dans courrier_genere
  - fichier_word_genere_url: URL du fichier généré
        ↓
downloadWordDocument() ← Téléchargement automatique
```

---

## Structures de Données

### Table `modele_courrier`

```sql
CREATE TABLE modele_courrier (
  id uuid PRIMARY KEY,
  nom text,
  type_courrier text,
  sujet text,
  contenu text, -- Aperçu texte
  variables_systeme text[],
  variables_personnalisees jsonb,
  fichier_word_url text, -- URL du .docx ORIGINAL
  utilise_template_word boolean DEFAULT false,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);
```

### Table `courrier_genere`

```sql
CREATE TABLE courrier_genere (
  id uuid PRIMARY KEY,
  profil_id uuid,
  modele_courrier_id uuid,
  modele_nom text,
  sujet text,
  contenu_genere text, -- Aperçu texte
  variables_remplies jsonb,
  fichier_pdf_url text, -- Pour templates texte
  fichier_word_genere_url text, -- Pour templates Word
  created_at timestamptz DEFAULT now(),
  created_by uuid
);
```

### Storage Buckets

```
letter-templates/
  ├── 1733500000000_CONVOCATION.docx
  ├── 1733500001000_ATTESTATION.docx
  └── 1733500002000_CONFIRMATION.docx

generated-letters/
  ├── 1733500010000_CONVOCATION_DUPONT_06-12-2025.docx
  ├── 1733500011000_ATTESTATION_MARTIN_06-12-2025.docx
  └── 1733500012000_CONFIRMATION_BERNARD_06-12-2025.docx
```

---

## Variables Système

### Catégories

1. **Identité** (6 variables)
   - nom, prenom, nom_complet, civilite, matricule_tca, genre

2. **Contact** (6 variables)
   - email, tel, adresse, complement_adresse, code_postal, ville

3. **Personnel** (6 variables)
   - date_naissance, lieu_naissance, pays_naissance, nationalite, numero_securite_sociale, iban

4. **Professionnel** (5 variables)
   - poste, site_nom, secteur_nom, date_entree, date_sortie

5. **Dates** (1 variable)
   - date_aujourd_hui

6. **Entreprise** (8 variables)
   - nom_entreprise, adresse_entreprise, ville_entreprise, tel_entreprise, siret_entreprise, rcs_entreprise, code_naf_entreprise, groupe_entreprise

7. **Signataire** (3 variables)
   - prenom_signataire, nom_signataire, fonction_signataire

**Total : 35 variables système automatiques**

---

## Dépendances NPM

```json
{
  "dependencies": {
    "docxtemplater": "^3.67.5",  // Remplacement variables dans Word
    "pizzip": "^3.2.0",           // Manipulation fichiers .docx (ZIP)
    "file-saver": "^2.0.5",       // Téléchargement automatique
    "mammoth": "^1.11.0"          // Extraction texte (aperçu)
  }
}
```

### Rôles

- **Docxtemplater** : Remplace les variables `{{...}}` dans le XML du document
- **PizZip** : Ouvre et manipule les fichiers .docx (qui sont des ZIP)
- **File-Saver** : Déclenche le téléchargement automatique dans le navigateur
- **Mammoth** : Extrait le texte brut pour l'aperçu (n'affecte pas la génération)

---

## Checklist Complète

### Installation et Configuration

- [x] Code frontend implémenté
- [x] Dépendances NPM installées
- [x] Build réussi (pas d'erreurs TypeScript)
- [ ] Migrations SQL exécutées
- [ ] Buckets Storage créés
- [ ] Policies RLS configurées

### Fonctionnalités

- [x] Bouton "Importer Word" visible
- [x] Upload de fichiers .docx
- [x] Détection automatique des variables
- [x] Badge "Word" sur les modèles
- [x] Génération Word avec remplacement variables
- [x] Téléchargement automatique du résultat
- [x] Sauvegarde dans courrier_genere

### Tests

- [ ] Import d'un fichier Word de test
- [ ] Variables détectées correctement
- [ ] Génération réussie pour un salarié
- [ ] Fichier Word téléchargé
- [ ] Variables remplacées correctement
- [ ] Mise en forme préservée
- [ ] Logo/images conservés
- [ ] Tableaux intacts

---

## Commandes Utiles

### Vérification Base de Données

```sql
-- Vérifier les colonnes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'modele_courrier'
  AND column_name LIKE '%word%';

-- Vérifier les buckets
SELECT * FROM storage.buckets
WHERE id IN ('letter-templates', 'generated-letters');

-- Voir les modèles Word
SELECT id, nom, utilise_template_word, fichier_word_url
FROM modele_courrier
WHERE utilise_template_word = true;

-- Voir les courriers générés
SELECT id, modele_nom, fichier_word_genere_url, created_at
FROM courrier_genere
WHERE fichier_word_genere_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Vérification Storage

```sql
-- Fichiers uploadés dans letter-templates
SELECT name, created_at, metadata
FROM storage.objects
WHERE bucket_id = 'letter-templates'
ORDER BY created_at DESC;

-- Fichiers générés dans generated-letters
SELECT name, created_at, metadata
FROM storage.objects
WHERE bucket_id = 'generated-letters'
ORDER BY created_at DESC;
```

### Build et Dev

```bash
# Installer les dépendances
npm install

# Vérifier les types TypeScript
npm run typecheck

# Build production
npm run build

# Serveur de développement
npm run dev
```

---

## FAQ Rapide

### Q: Mon fichier Word original est-il modifié ?
**R:** NON, jamais. Il est stocké tel quel dans Storage.

### Q: Comment le système remplace les variables ?
**R:** Docxtemplater cherche `{{variable}}` dans le XML et remplace par le texte.

### Q: Puis-je utiliser des tableaux et images ?
**R:** OUI, tout est préservé.

### Q: Les en-têtes et pieds de page sont conservés ?
**R:** OUI, tout est conservé.

### Q: Quelle est la différence avec un template texte ?
**R:** Template texte → PDF généré. Template Word → Word avec votre mise en forme.

### Q: Combien de fois puis-je utiliser un modèle ?
**R:** Autant de fois que vous voulez, le fichier original est réutilisé à chaque fois.

---

## Résolution de Problèmes Courante

### Erreur : "Seuls les fichiers .docx sont acceptés"
→ Vérifiez l'extension du fichier (pas .doc ou .odt)

### Erreur : "Erreur lors de l'upload"
→ Vérifiez que le bucket `letter-templates` existe

### Variables non remplacées
→ Vérifiez la syntaxe : `{{nom}}` (pas `{nom}` ou `[nom]`)

### Fichier Word corrompu
→ Réenregistrez le fichier en .docx dans Word

### Erreur 401 lors du téléchargement
→ Vérifiez les policies RLS du bucket

---

## Prochaines Étapes

1. ✅ Lisez `START-HERE-WORD-TEMPLATES.md`
2. ⬜ Appliquez les 2 migrations SQL
3. ⬜ Testez avec un fichier Word simple
4. ⬜ Vérifiez le résultat
5. ⬜ Importez vos vrais modèles
6. ⬜ Formez les utilisateurs RH

---

## Support et Documentation

### Documentation Utilisateur
- Guide complet d'utilisation
- Liste des variables disponibles
- Exemples concrets
- FAQ

### Documentation Technique
- Architecture du système
- Flux de données
- Structure des tables
- Code source commenté

### Documentation Déploiement
- Migrations SQL
- Vérifications post-déploiement
- Tests à effectuer
- Résolution de problèmes

---

**Navigation :**
- 🚀 Démarrage : `START-HERE-WORD-TEMPLATES.md`
- 📖 Guide complet : `GUIDE-UTILISATION-WORD-TEMPLATES.md`
- 🔧 Vérification : `VERIFICATION-WORD-TEMPLATES.md`
- 📋 Résumé : `RESUME-WORD-TEMPLATES.md`
- 📑 Index : `INDEX-WORD-TEMPLATES.md` (ce fichier)
