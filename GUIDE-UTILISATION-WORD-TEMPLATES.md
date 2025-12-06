# Guide d'Utilisation - Modèles Word avec Votre Mise en Forme

## Vue d'Ensemble

Votre système utilise VOTRE fichier Word ORIGINAL, sans le modifier. Il remplace uniquement les variables {{...}} avec les vraies valeurs.

**C'est comme faire un "Rechercher et Remplacer" dans Word, mais automatisé.**

---

## Comment Ça Marche : Flux Complet

### 1. IMPORT DE VOTRE FICHIER WORD ORIGINAL

**Ce qui se passe :**
- Vous uploadez votre fichier `.docx` via le bouton "Importer Word"
- Le fichier est stocké TEL QUEL dans Supabase Storage (bucket `letter-templates`)
- AUCUNE modification n'est faite à votre fichier
- Le système lit le fichier pour détecter les variables `{{nom}}`, `{{prenom}}`, etc.
- Les variables sont enregistrées en base de données pour référence

**Votre fichier reste IDENTIQUE :**
- Même mise en forme
- Même logo
- Même en-tête et pied de page
- Même tableaux
- Même polices et couleurs
- Même marges

---

### 2. GÉNÉRATION D'UN COURRIER

**Étapes automatiques :**

1. **Téléchargement du fichier ORIGINAL**
   - Le système récupère VOTRE fichier .docx depuis Supabase Storage
   - C'est le fichier exact que vous avez uploadé, byte par byte

2. **Chargement en mémoire avec PizZip**
   - Le fichier Word est un fichier ZIP contenant du XML
   - PizZip ouvre le fichier en préservant TOUTE sa structure

3. **Remplacement des variables avec Docxtemplater**
   - Docxtemplater est une bibliothèque spécialisée
   - Elle cherche UNIQUEMENT les patterns `{{variable}}`
   - Elle remplace UNIQUEMENT ces variables par les vraies valeurs
   - Elle ne touche à RIEN d'autre

4. **Génération du résultat**
   - Le fichier résultant est VOTRE fichier
   - Seules les variables ont été remplacées par du texte
   - Tout le reste est IDENTIQUE

5. **Téléchargement automatique**
   - Le fichier Word généré est automatiquement téléchargé
   - Il est aussi sauvegardé dans Supabase Storage (bucket `generated-letters`)
   - Un enregistrement est créé dans `courrier_genere` en base de données

---

## Exemple Concret

### Votre fichier Word original contient :

```
Objet : Convocation

Madame, Monsieur {{nom}},

Nous vous invitons à une réunion le {{date_reunion}}.

Cordialement,
{{nom_entreprise}}
```

### Après génération pour un salarié :

```
Objet : Convocation

Madame, Monsieur DUPONT,

Nous vous invitons à une réunion le 15 janvier 2025.

Cordialement,
TRANSPORT CLASSE AFFAIRE
```

**TOUT LE RESTE EST IDENTIQUE :**
- La mise en forme de "Objet : Convocation"
- La police utilisée
- Les marges du document
- L'en-tête et le pied de page
- Le logo de l'entreprise

---

## Variables Disponibles

### Variables Système (Auto-remplies)

Ces variables sont automatiquement remplies à partir des données du salarié :

**Identité :**
- `{{nom}}` - Nom de famille
- `{{prenom}}` - Prénom
- `{{nom_complet}}` - Prénom et nom
- `{{civilite}}` - Monsieur/Madame (basé sur le genre)
- `{{matricule_tca}}` - Numéro de matricule
- `{{genre}}` - Genre

**Contact :**
- `{{email}}` - Email
- `{{tel}}` - Téléphone
- `{{adresse}}` - Adresse
- `{{complement_adresse}}` - Complément d'adresse
- `{{code_postal}}` - Code postal
- `{{ville}}` - Ville

**Personnel :**
- `{{date_naissance}}` - Date de naissance
- `{{lieu_naissance}}` - Lieu de naissance
- `{{pays_naissance}}` - Pays de naissance
- `{{nationalite}}` - Nationalité
- `{{numero_securite_sociale}}` - N° Sécurité Sociale
- `{{iban}}` - IBAN

**Professionnel :**
- `{{poste}}` - Poste occupé
- `{{site_nom}}` - Nom du site
- `{{secteur_nom}}` - Nom du secteur
- `{{date_entree}}` - Date d'entrée
- `{{date_sortie}}` - Date de sortie

**Dates :**
- `{{date_aujourd_hui}}` - Date du jour (format français)

**Entreprise :**
- `{{nom_entreprise}}` - TRANSPORT CLASSE AFFAIRE
- `{{adresse_entreprise}}` - 111 Avenue Victor Hugo, 75116 Paris
- `{{ville_entreprise}}` - Paris
- `{{tel_entreprise}}` - 01.86.22.24.00
- `{{siret_entreprise}}` - 50426507500029
- `{{rcs_entreprise}}` - RCS PARIS B 504265075
- `{{code_naf_entreprise}}` - 4939B – Autres transports routiers de voyageurs
- `{{groupe_entreprise}}` - NKM HOLDING

**Signataire :**
- `{{prenom_signataire}}` - Prénom du signataire
- `{{nom_signataire}}` - Nom du signataire
- `{{fonction_signataire}}` - Direction des Ressources Humaines

### Variables Personnalisées

Vous pouvez ajouter des variables personnalisées qui seront demandées lors de la génération :
- `{{date_reunion}}` - Date d'une réunion spécifique
- `{{montant_prime}}` - Montant d'une prime
- `{{motif}}` - Motif d'un courrier
- `{{duree}}` - Durée d'une période
- etc.

---

## Comment Importer un Modèle Word

1. **Préparez votre fichier Word**
   - Créez votre courrier dans Word avec votre mise en forme
   - Ajoutez des variables avec la syntaxe `{{nom_variable}}`
   - Sauvegardez en `.docx`

2. **Importez dans le système**
   - Allez dans "Modèles de Courriers"
   - Cliquez sur "Importer Word"
   - Sélectionnez votre fichier `.docx`
   - Le système détecte automatiquement les variables

3. **Vérification**
   - Vous verrez un badge "Word" sur le modèle
   - Les variables système et personnalisées sont affichées
   - Le modèle est prêt à être utilisé

---

## Comment Générer un Courrier

1. **Allez dans "Générer un Courrier"**

2. **Étape 1 : Sélectionnez le salarié**
   - Recherchez le salarié
   - Cliquez sur son nom

3. **Étape 2 : Choisissez le modèle**
   - Les modèles Word ont une icône verte et un badge "Word"
   - Sélectionnez votre modèle

4. **Étape 3 : Remplissez les variables personnalisées**
   - Les variables système sont auto-remplies (badge vert)
   - Complétez les variables personnalisées demandées
   - Prévisualisez si besoin

5. **Générez**
   - Cliquez sur "Générer le Document Word"
   - Le fichier Word est automatiquement téléchargé
   - Un enregistrement est créé dans "Courriers Générés"

---

## Vérification Technique

### Structure du Fichier Word

Un fichier `.docx` est en réalité un fichier ZIP contenant :
```
document.docx/
├── word/
│   ├── document.xml        ← Contenu du document
│   ├── styles.xml          ← Styles et mise en forme
│   ├── header1.xml         ← En-tête
│   ├── footer1.xml         ← Pied de page
│   └── media/              ← Images et logos
├── _rels/                  ← Relations entre fichiers
└── [Content_Types].xml     ← Types de contenu
```

**Ce qui est préservé :**
- ✅ Tous les fichiers XML de structure
- ✅ Tous les styles (styles.xml)
- ✅ Tous les en-têtes et pieds de page
- ✅ Toutes les images et logos (media/)
- ✅ Toutes les relations entre fichiers
- ✅ Tous les tableaux et mises en forme

**Ce qui est modifié :**
- ✏️ UNIQUEMENT les textes `{{variable}}` dans document.xml

---

## Code Technique (Pour Référence)

### Fonction de génération principale

```typescript
// Fichier : src/lib/wordTemplateGenerator.ts

export async function generateWordDocument(
  templateUrl: string,
  variables: TemplateVariable
): Promise<Blob> {
  // 1. Télécharger le template ORIGINAL
  const templateData = await downloadTemplate(templateUrl);

  // 2. Charger avec PizZip (préserve la structure)
  const zip = new PizZip(templateData);

  // 3. Créer une instance Docxtemplater
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });

  // 4. Définir les variables
  doc.setData(variables);

  // 5. Remplacer les variables
  doc.render();

  // 6. Générer le blob de sortie
  const output = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return output;
}
```

### Extraction des variables (SANS modification)

```typescript
export async function extractVariablesFromWordTemplate(
  templateArrayBuffer: ArrayBuffer
): Promise<string[]> {
  const zip = new PizZip(templateArrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Lit le texte pour trouver les variables
  const tags = doc.getFullText().match(/\{\{([^}]+)\}\}/g) || [];
  const uniqueTags = Array.from(new Set(tags.map(tag => tag.replace(/[{}]/g, '').trim())));

  return uniqueTags;
}
```

---

## Buckets Supabase Storage

### `letter-templates`
- Stocke vos fichiers Word ORIGINAUX
- Accès : Utilisateurs authentifiés
- Pas de modification après upload

### `generated-letters`
- Stocke les documents Word GÉNÉRÉS
- Un nouveau fichier par génération
- Peut être téléchargé à nouveau depuis "Courriers Générés"

---

## Base de Données

### Table `modele_courrier`

| Colonne | Type | Description |
|---------|------|-------------|
| `fichier_word_url` | text | URL du fichier Word ORIGINAL dans Storage |
| `utilise_template_word` | boolean | `true` si c'est un template Word |
| `contenu` | text | Aperçu texte (pour affichage) |
| `variables_systeme` | text[] | Liste des variables système détectées |
| `variables_personnalisees` | jsonb | Variables personnalisées avec config |

### Table `courrier_genere`

| Colonne | Type | Description |
|---------|------|-------------|
| `fichier_word_genere_url` | text | URL du fichier Word GÉNÉRÉ dans Storage |
| `variables_remplies` | jsonb | Toutes les variables avec leurs valeurs |
| `contenu_genere` | text | Aperçu texte du résultat |

---

## FAQ

### Q: Est-ce que mon fichier Word est modifié après l'import ?
**R:** NON. Votre fichier Word original est stocké TEL QUEL dans Supabase Storage. Il n'est JAMAIS modifié.

### Q: Puis-je utiliser des logos et images dans mon modèle ?
**R:** OUI. Tous les éléments visuels (logos, images, tableaux) sont préservés.

### Q: Est-ce que les en-têtes et pieds de page sont conservés ?
**R:** OUI. Tout est conservé : en-têtes, pieds de page, numéros de page, etc.

### Q: Puis-je avoir des tableaux dans mon modèle ?
**R:** OUI. Les tableaux sont parfaitement conservés avec leur mise en forme.

### Q: Comment mettre une variable dans un tableau ?
**R:** Comme partout ailleurs : `{{nom_variable}}` dans la cellule du tableau.

### Q: Que se passe-t-il si une variable n'a pas de valeur ?
**R:** La variable est remplacée par une chaîne vide `""`.

### Q: Puis-je générer plusieurs fois avec le même modèle ?
**R:** OUI. Chaque génération télécharge le fichier ORIGINAL et crée un nouveau document.

### Q: Le document généré est-il éditable dans Word ?
**R:** OUI. C'est un fichier Word normal, vous pouvez l'ouvrir et le modifier dans Word.

---

## Résumé Visuel du Flux

```
┌─────────────────────────────────────────────────────────────┐
│  1. IMPORT                                                   │
│                                                              │
│  Votre fichier.docx ──────▶ Supabase Storage               │
│  (avec logo, tableaux,      (bucket: letter-templates)      │
│   mise en forme)            STOCKÉ TEL QUEL                  │
│                                                              │
│  Variables détectées ──────▶ Base de données                │
│  {{nom}}, {{date}}          (pour référence)                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. GÉNÉRATION                                               │
│                                                              │
│  Storage ──────▶ Téléchargement ──────▶ Mémoire            │
│  (fichier         du fichier            (PizZip +           │
│   original)       ORIGINAL              Docxtemplater)      │
│                                                              │
│  Variables ──────▶ Remplacement ──────▶ Document           │
│  (valeurs          UNIQUEMENT des       résultat            │
│   saisies)         variables {{...}}                         │
│                                                              │
│  Document ──────▶ Sauvegarde ──────▶ Téléchargement        │
│  résultat         dans Storage         automatique          │
│                   (generated-letters)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. RÉSULTAT                                                 │
│                                                              │
│  Fichier Word avec :                                         │
│  ✅ VOTRE logo                                              │
│  ✅ VOTRE mise en forme                                     │
│  ✅ VOTRE en-tête et pied de page                           │
│  ✅ VOTRE tableau                                           │
│  ✅ VOS polices et couleurs                                 │
│  ✏️  Variables remplacées par les vraies valeurs           │
└─────────────────────────────────────────────────────────────┘
```

---

## Fichiers Importants du Projet

### Code Source
- `src/lib/wordTemplateGenerator.ts` - Génération Word
- `src/components/LetterTemplatesManager.tsx` - Gestion des modèles
- `src/components/GenerateLetterWizard.tsx` - Assistant de génération

### Migrations SQL
- `add-word-template-support.sql` - Colonnes pour les templates Word
- `create-word-template-storage.sql` - Buckets Supabase Storage

### Dépendances NPM
- `docxtemplater` - Remplacement des variables dans Word
- `pizzip` - Manipulation des fichiers .docx (ZIP)
- `file-saver` - Téléchargement automatique

---

## Support

Si vous rencontrez un problème :

1. Vérifiez que votre fichier est bien en `.docx` (pas `.doc` ou `.odt`)
2. Vérifiez que les variables sont bien entre `{{` et `}}`
3. Vérifiez que les buckets Storage existent dans Supabase
4. Consultez les logs de la console du navigateur

---

**Votre fichier Word reste VOTRE fichier. Le système ne fait que remplir les blancs.**
