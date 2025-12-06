# Quick Start - Modèles Word

Guide rapide pour commencer à utiliser les modèles Word en 5 minutes.

## 1. Configuration Initiale (À faire une seule fois)

### Exécutez les 2 scripts SQL dans Supabase:

**Script 1: add-word-template-support.sql**
```sql
-- Ajoute les colonnes nécessaires aux tables
-- Copier/coller le contenu du fichier dans l'éditeur SQL Supabase
-- Cliquer sur "Run"
```

**Script 2: create-word-template-storage.sql**
```sql
-- Crée les buckets de stockage
-- Copier/coller le contenu du fichier dans l'éditeur SQL Supabase
-- Cliquer sur "Run"
```

## 2. Préparez votre Modèle Word

Créez un document Word (.docx) avec des variables au format `{{variable}}`:

```
Objet: Confirmation d'embauche

Cher(e) {{civilite}} {{nom}},

Nous sommes heureux de vous confirmer votre embauche au poste de {{poste}}.

Date de début: {{date_debut}}
Salaire: {{salaire}} € brut/mois

Cordialement,
```

## 3. Importez le Modèle

1. **Administration > Modèles de Courriers**
2. Cliquez **Importer Word**
3. Sélectionnez votre fichier .docx
4. ✓ Terminé!

## 4. Générez un Courrier

1. **Administration > Générer Courrier Word**
2. Sélectionnez le modèle (colonne gauche)
3. Sélectionnez un employé (colonne droite)
4. Remplissez les variables personnalisées si nécessaire
5. Cliquez **Générer le Document Word**
6. Le document est téléchargé automatiquement!

## Variables les Plus Utilisées

### Identité
- `{{nom}}` `{{prenom}}` `{{civilite}}`
- `{{email}}` `{{telephone}}`

### Adresse
- `{{adresse}}` `{{ville}}` `{{code_postal}}`

### Travail
- `{{poste}}` `{{site}}` `{{secteur}}`
- `{{date_debut}}` `{{date_fin}}`
- `{{salaire}}` `{{type_contrat}}`

### Utiles
- `{{date_jour}}` - Date du jour
- `{{matricule}}` - Matricule employé

## Exemples de Modèles

### Contrat de Travail
```
CONTRAT DE TRAVAIL - {{type_contrat}}

Entre: [Entreprise]
Et: {{civilite}} {{prenom}} {{nom}}
     Né(e) le {{date_naissance}} à {{lieu_naissance}}
     Demeurant: {{adresse}}, {{code_postal}} {{ville}}

Poste: {{poste}}
Lieu: {{site}} - {{secteur}}
Début: {{date_debut}}
Fin: {{date_fin}}
Salaire: {{salaire}} € brut/mois
```

### Convocation Entretien
```
Objet: Convocation à un entretien

{{civilite}} {{nom}},

Nous vous invitons à un entretien le {{date_entretien}} à {{heure_entretien}}.

Lieu: {{site}}
Avec: {{nom_manager}}

Contact: {{email}} / {{telephone}}
```

### Attestation Employeur
```
ATTESTATION D'EMPLOI

Nous soussignés certifions que:

{{civilite}} {{prenom}} {{nom}}
Matricule: {{matricule}}
Né(e) le {{date_naissance}}

Est employé(e) dans notre entreprise depuis le {{date_debut}}
Au poste de: {{poste}}
Site: {{site}}

Fait à {{ville}}, le {{date_jour}}
```

## Astuces

- **Gardez la même mise en forme** - Le document généré sera identique au modèle
- **Testez avec un employé** - Vérifiez que toutes les variables sont bien remplacées
- **Variables personnalisées** - Toute variable non reconnue deviendra personnalisée
- **Sauvegarde automatique** - Tous les documents générés sont conservés

## Besoin d'Aide?

Consultez le guide complet: `GUIDE-MODELES-WORD.md`
