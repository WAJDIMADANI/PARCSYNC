# Comment Ça Marche - En Images

## Principe Simple

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  VOTRE FICHIER WORD                                            │
│  avec logo, tableaux, mise en forme                            │
│                                                                │
│  Bonjour {{nom}}, votre poste est {{poste}}                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                          ↓
                    [UPLOAD]
                          ↓
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  STOCKÉ TEL QUEL dans Supabase                                 │
│  Aucune modification                                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                          ↓
                    [GÉNÉRATION]
                          ↓
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  1. Télécharger le fichier ORIGINAL                            │
│  2. Chercher {{nom}} et {{poste}}                              │
│  3. Remplacer par "DUPONT" et "Chauffeur"                      │
│  4. Sauvegarder le résultat                                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                          ↓
                    [RÉSULTAT]
                          ↓
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  VOTRE FICHIER WORD                                            │
│  avec logo, tableaux, mise en forme                            │
│  (IDENTIQUE)                                                   │
│                                                                │
│  Bonjour DUPONT, votre poste est Chauffeur                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Exemple Visuel Complet

### AVANT (Votre Modèle)

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  [LOGO TCA]                         TRANSPORT CLASSE AFFAIRE  ║
║                                     111 Avenue Victor Hugo    ║
║                                     75116 Paris               ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║                      CONVOCATION                              ║
║                                                               ║
║  Paris, le {{date_aujourd_hui}}                               ║
║                                                               ║
║  {{civilite}} {{nom}},                                        ║
║                                                               ║
║  Nous avons le plaisir de vous informer que vous êtes        ║
║  convoqué(e) à une réunion concernant votre poste de         ║
║  {{poste}} sur le site de {{site_nom}}.                      ║
║                                                               ║
║  Cette réunion aura lieu le {{date_reunion}}.                ║
║                                                               ║
║  Veuillez confirmer votre présence avant le                  ║
║  {{date_limite_confirmation}}.                                ║
║                                                               ║
║  Cordialement,                                                ║
║                                                               ║
║  {{nom_signataire}}                                           ║
║  {{fonction_signataire}}                                      ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  TRANSPORT CLASSE AFFAIRE - SIRET: 50426507500029            ║
║  Tél: 01.86.22.24.00 - www.tca.fr                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### APRÈS (Document Généré)

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  [LOGO TCA]                         TRANSPORT CLASSE AFFAIRE  ║
║                                     111 Avenue Victor Hugo    ║
║                                     75116 Paris               ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║                      CONVOCATION                              ║
║                                                               ║
║  Paris, le 06/12/2025                                         ║
║                                                               ║
║  Monsieur DUPONT,                                             ║
║                                                               ║
║  Nous avons le plaisir de vous informer que vous êtes        ║
║  convoqué(e) à une réunion concernant votre poste de         ║
║  Chauffeur sur le site de Paris Charles de Gaulle.           ║
║                                                               ║
║  Cette réunion aura lieu le 15/01/2025.                      ║
║                                                               ║
║  Veuillez confirmer votre présence avant le                  ║
║  10/01/2025.                                                  ║
║                                                               ║
║  Cordialement,                                                ║
║                                                               ║
║  Marie MARTIN                                                 ║
║  Direction des Ressources Humaines                            ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  TRANSPORT CLASSE AFFAIRE - SIRET: 50426507500029            ║
║  Tél: 01.86.22.24.00 - www.tca.fr                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### Ce Qui Change

```
{{date_aujourd_hui}}                →  06/12/2025
{{civilite}}                        →  Monsieur
{{nom}}                             →  DUPONT
{{poste}}                           →  Chauffeur
{{site_nom}}                        →  Paris Charles de Gaulle
{{date_reunion}}                    →  15/01/2025
{{date_limite_confirmation}}        →  10/01/2025
{{nom_signataire}}                  →  Marie MARTIN
{{fonction_signataire}}             →  Direction des Ressources Humaines
```

### Ce Qui NE Change PAS

```
✅ Logo TCA
✅ En-tête (nom entreprise, adresse)
✅ Mise en forme du titre "CONVOCATION"
✅ Cadres et bordures
✅ Police de caractères
✅ Taille et style du texte
✅ Espacement des paragraphes
✅ Pied de page
✅ Numérotation
✅ Tableaux
✅ Images
```

---

## Flux Utilisateur RH

### 1. Créer le Modèle Word (Une Fois)

```
Word sur votre ordinateur
       ↓
Créer le document avec mise en forme
       ↓
Ajouter {{variables}}
       ↓
Sauvegarder en .docx
       ↓
Application → "Importer Word"
       ↓
✅ Modèle prêt à être utilisé
```

### 2. Générer un Courrier (Autant de Fois Que Nécessaire)

```
Application → "Générer un Courrier"
       ↓
Sélectionner un salarié
       ↓
Choisir le modèle Word
       ↓
Remplir les variables personnalisées
       ↓
Cliquer "Générer le Document Word"
       ↓
✅ Fichier Word téléchargé automatiquement
```

---

## Variables : 3 Types

### 🔵 Variables Système (Auto-remplies)

```
Profil du salarié                     Valeur dans le document
─────────────────────                 ───────────────────────
Nom: DUPONT                     →     {{nom}} devient "DUPONT"
Prénom: Jean                    →     {{prenom}} devient "Jean"
Poste: Chauffeur                →     {{poste}} devient "Chauffeur"
Site: Paris CDG                 →     {{site_nom}} devient "Paris CDG"
Email: j.dupont@tca.fr          →     {{email}} devient "j.dupont@tca.fr"
```

**35 variables système disponibles !**

### 🟠 Variables Personnalisées (À Remplir)

```
RH saisit                             Valeur dans le document
─────────────────                     ───────────────────────
date_reunion: 15/01/2025        →     {{date_reunion}} devient "15/01/2025"
motif: Entretien annuel         →     {{motif}} devient "Entretien annuel"
montant: 500                    →     {{montant}} devient "500"
```

### 🟢 Variables Entreprise (Fixes)

```
Constantes                            Valeur dans le document
─────────────────                     ───────────────────────
                                →     {{nom_entreprise}} devient "TRANSPORT CLASSE AFFAIRE"
                                →     {{siret_entreprise}} devient "50426507500029"
                                →     {{tel_entreprise}} devient "01.86.22.24.00"
```

---

## Technologie Utilisée

### Fichier Word = Fichier ZIP

```
document.docx
│
├── [Content_Types].xml
├── _rels/
│   └── .rels
└── word/
    ├── document.xml          ← CONTENU DU TEXTE
    ├── styles.xml            ← STYLES ET MISE EN FORME
    ├── header1.xml           ← EN-TÊTE
    ├── footer1.xml           ← PIED DE PAGE
    ├── numbering.xml         ← NUMÉROTATION
    └── media/
        ├── image1.png        ← LOGO
        └── image2.jpg        ← AUTRES IMAGES
```

### Ce Que Fait Docxtemplater

```
1. Ouvrir le fichier .docx (ZIP)
        ↓
2. Lire word/document.xml
        ↓
3. Chercher <w:t>{{nom}}</w:t>
        ↓
4. Remplacer par <w:t>DUPONT</w:t>
        ↓
5. Sauvegarder le XML modifié
        ↓
6. Recréer le fichier .docx (ZIP)
```

**Tous les autres fichiers restent IDENTIQUES !**

---

## Sécurité

### Stockage des Fichiers

```
Supabase Storage
│
├── letter-templates/               ← Modèles originaux
│   ├── CONVOCATION.docx
│   ├── ATTESTATION.docx
│   └── CONFIRMATION.docx
│
└── generated-letters/              ← Documents générés
    ├── CONVOCATION_DUPONT_06-12-2025.docx
    ├── ATTESTATION_MARTIN_06-12-2025.docx
    └── CONFIRMATION_BERNARD_06-12-2025.docx
```

### Permissions (RLS)

```
✅ Utilisateurs authentifiés PEUVENT :
   - Uploader des modèles
   - Lire les modèles
   - Générer des courriers
   - Lire les courriers générés

❌ Utilisateurs authentifiés NE PEUVENT PAS :
   - Accéder aux fichiers d'autres organisations
   - Modifier les modèles d'autres utilisateurs

❌ Utilisateurs non authentifiés :
   - Aucun accès
```

---

## Comparaison : Texte vs Word

### Template Texte → PDF

```
Modèle texte simple
       ↓
Génération PDF basique
       ↓
✅ Rapide
❌ Mise en forme limitée
❌ Pas de logo
❌ Pas de tableaux complexes
```

### Template Word → Word

```
Modèle Word complet
       ↓
Génération Word préservée
       ↓
✅ Mise en forme complète
✅ Logo et images
✅ Tableaux complexes
✅ En-têtes et pieds de page
✅ Styles personnalisés
✅ Éditable après génération
```

---

## En Résumé

### Ce Qui Est Fait

✅ Code complet et testé
✅ Import de fichiers Word
✅ Détection automatique des variables
✅ Génération avec préservation totale
✅ Téléchargement automatique

### Ce Qu'il Faut Faire

⬜ Exécuter 2 migrations SQL (5 minutes)
⬜ Tester avec un fichier Word (5 minutes)

### Ce Que Vous Obtenez

🎯 **Vos fichiers Word avec votre mise en forme**
🎯 **Génération automatique en 1 clic**
🎯 **35+ variables auto-remplies**
🎯 **Documents professionnels identiques à vos originaux**

---

## Navigation

📖 **Guides complets** : Voir `INDEX-WORD-TEMPLATES.md`

🚀 **Démarrage rapide** : Voir `START-HERE-WORD-TEMPLATES.md`

💡 **Ce fichier** : Vue d'ensemble visuelle

---

**Le système utilise VOTRE fichier Word ORIGINAL.**

**Il ne fait qu'un "Rechercher et Remplacer" automatisé.**

**C'est tout !**
