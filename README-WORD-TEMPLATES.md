# Système de Modèles Word - Documentation

## Vue d'Ensemble

Ce système permet de générer automatiquement des courriers Word personnalisés à partir de modèles, tout en préservant intégralement la mise en forme (logos, tableaux, styles, etc.).

## Documentation Disponible

### 🚀 Quick Start
**Fichier:** `QUICK-START-WORD-TEMPLATES.md`
- Mise en route en 5 minutes
- Configuration rapide
- Exemples prêts à l'emploi

### 📚 Guide Complet
**Fichier:** `GUIDE-MODELES-WORD.md`
- Documentation détaillée
- Liste complète des variables
- Guide de dépannage
- Exemples avancés

### 🔧 Résumé Technique
**Fichier:** `IMPLEMENTATION-WORD-TEMPLATES-SUMMARY.md`
- Architecture de la solution
- Fichiers créés/modifiés
- Flux de travail
- Points techniques

## Installation

### Étape 1: Configuration Base de Données

Exécutez ces 2 scripts SQL dans Supabase (dans l'ordre):

```bash
1. add-word-template-support.sql
2. create-word-template-storage.sql
```

### Étape 2: Vérification

Les packages npm ont déjà été installés:
- ✅ docxtemplater
- ✅ pizzip
- ✅ file-saver

## Utilisation Rapide

### 1. Importer un Modèle

```
Administration > Modèles de Courriers > Importer Word
```

Votre document Word doit contenir des variables au format:
```
{{nom}} {{prenom}} {{poste}} {{date_debut}}
```

### 2. Générer un Courrier

```
Administration > Générer Courrier Word
```

1. Sélectionner un modèle
2. Sélectionner un employé
3. Remplir variables personnalisées
4. Cliquer sur "Générer"

## Variables Système Disponibles

### Identité
- `{{nom}}` `{{prenom}}` `{{matricule}}`
- `{{email}}` `{{telephone}}`
- `{{genre}}` `{{civilite}}`

### Localisation
- `{{adresse}}` `{{ville}}` `{{code_postal}}` `{{pays}}`
- `{{date_naissance}}` `{{lieu_naissance}}` `{{pays_naissance}}`

### Travail
- `{{poste}}` `{{site}}` `{{secteur}}`
- `{{date_debut}}` `{{date_fin}}`
- `{{salaire}}` `{{type_contrat}}` `{{duree_travail}}`

### Documents
- `{{numero_securite_sociale}}` `{{iban}}`

### Utiles
- `{{date_jour}}` - Date actuelle en français

## Exemple de Modèle

```
                        [LOGO ENTREPRISE]

                    CONTRAT DE TRAVAIL

Entre: ABC Entreprise
Et: {{civilite}} {{prenom}} {{nom}}

Date de naissance: {{date_naissance}}
Lieu: {{lieu_naissance}}, {{pays_naissance}}
Adresse: {{adresse}}
         {{code_postal}} {{ville}}

POSTE: {{poste}}
SITE: {{site}}
SECTEUR: {{secteur}}

Date de début: {{date_debut}}
Type de contrat: {{type_contrat}}
Salaire brut mensuel: {{salaire}} €
Durée de travail: {{duree_travail}}

Fait à {{ville}}, le {{date_jour}}
```

## Caractéristiques

### ✅ Avantages
- Préserve toute la mise en forme Word
- Logos et images conservés
- Tableaux et styles intacts
- Génération instantanée
- Historique complet
- Pas de limite de modèles

### 🎯 Cas d'Usage
- Contrats de travail
- Avenants
- Attestations
- Convocations
- Courriers administratifs
- Tout document répétitif

## Architecture

```
Modèle Word (.docx)
    ↓
Import dans l'application
    ↓
Stockage dans Supabase Storage
    ↓
Sélection employé + formulaire
    ↓
Génération avec docxtemplater
    ↓
Document personnalisé (.docx)
```

## Nouveaux Composants

### Interface
- **LetterTemplatesManager** - Gestion des modèles (amélioré)
- **GenerateLetterFromTemplate** - Génération de courriers (nouveau)

### Navigation
- Administration > Modèles de Courriers
- Administration > Générer Courrier Word

### Utilitaires
- `src/lib/wordTemplateGenerator.ts` - Moteur de génération

## Support

En cas de problème:

1. **Variables non remplacées?**
   - Vérifier le format: `{{variable}}` (doubles accolades)
   - Pas d'espaces dans le nom

2. **Import échoue?**
   - Vérifier que les scripts SQL sont exécutés
   - Vérifier les buckets Supabase Storage

3. **Mise en forme perdue?**
   - Utiliser .docx (pas .doc)
   - Vérifier que le modèle s'ouvre dans Word

## Ressources

- **Quick Start:** Démarrage rapide en 5 min
- **Guide:** Documentation complète
- **Summary:** Détails techniques

## Prochaines Étapes

1. ✅ Lire le Quick Start
2. ✅ Exécuter les scripts SQL
3. ✅ Importer un premier modèle
4. ✅ Générer un document test
5. ✅ Créer vos propres modèles

---

**Version:** 1.0
**Date:** Décembre 2024
**Technologies:** React, TypeScript, Supabase, docxtemplater
