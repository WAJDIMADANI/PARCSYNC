# Guide d'Utilisation des Modèles Word

Ce guide explique comment utiliser le nouveau système de génération de courriers à partir de modèles Word avec mise en forme complète.

## Vue d'Ensemble

Le système vous permet de :
- Importer vos modèles Word existants avec tous leurs éléments (logos, tableaux, mise en forme, etc.)
- Détecter automatiquement les variables dans vos documents
- Générer des courriers personnalisés en remplissant simplement un formulaire
- Télécharger les documents générés au format .docx avec la mise en forme identique

## Étape 1: Configuration de la Base de Données

Avant d'utiliser le système, exécutez ces deux scripts SQL dans votre base de données Supabase:

### 1.1 Script de Schéma

Exécutez le fichier `add-word-template-support.sql` pour ajouter les colonnes nécessaires:

```sql
-- Ce script ajoute le support des modèles Word
-- Exécutez ce script dans l'éditeur SQL de Supabase
```

### 1.2 Script de Stockage

Exécutez le fichier `create-word-template-storage.sql` pour créer les buckets de stockage:

```sql
-- Ce script crée les buckets de stockage nécessaires
-- Exécutez ce script dans l'éditeur SQL de Supabase
```

## Étape 2: Préparation de vos Modèles Word

### 2.1 Format des Variables

Dans vos documents Word, utilisez le format `{{nom_variable}}` pour définir les emplacements où les données seront insérées.

Exemple:
```
Cher(e) {{civilite}} {{nom}} {{prenom}},

Nous vous confirmons votre embauche au poste de {{poste}} à compter du {{date_debut}}.

Votre salaire sera de {{salaire}} euros brut par mois.
```

### 2.2 Variables Système Disponibles

Ces variables sont automatiquement remplies depuis les données de l'employé:

**Informations Personnelles:**
- `{{nom}}` - Nom de famille
- `{{prenom}}` - Prénom
- `{{matricule}}` - Matricule
- `{{email}}` - Email
- `{{telephone}}` - Téléphone
- `{{genre}}` - M ou F
- `{{civilite}}` - Monsieur ou Madame

**Adresse:**
- `{{adresse}}` - Adresse complète
- `{{ville}}` - Ville
- `{{code_postal}}` - Code postal
- `{{pays}}` - Pays

**Naissance:**
- `{{date_naissance}}` - Date de naissance
- `{{lieu_naissance}}` - Lieu de naissance
- `{{pays_naissance}}` - Pays de naissance

**Documents:**
- `{{numero_securite_sociale}}` - Numéro de sécurité sociale
- `{{iban}}` - IBAN

**Poste:**
- `{{poste}}` - Nom du poste
- `{{site}}` - Nom du site
- `{{secteur}}` - Nom du secteur

**Contrat:**
- `{{date_debut}}` - Date de début
- `{{date_fin}}` - Date de fin
- `{{salaire}}` - Salaire
- `{{type_contrat}}` - Type de contrat
- `{{duree_travail}}` - Durée de travail

**Date:**
- `{{date_jour}}` - Date du jour au format français

### 2.3 Variables Personnalisées

Vous pouvez aussi créer vos propres variables pour des informations spécifiques:
- `{{nom_manager}}` - Le système vous demandera de saisir cette valeur
- `{{date_entretien}}` - Variable personnalisée
- `{{montant_prime}}` - Variable personnalisée
- etc.

## Étape 3: Importer un Modèle Word

1. Connectez-vous à l'application
2. Allez dans **Administration > Modèles de Courriers**
3. Cliquez sur le bouton **Importer Word** (bouton vert)
4. Sélectionnez votre fichier .docx
5. Le système va:
   - Analyser votre document
   - Détecter toutes les variables `{{variable}}`
   - Sauvegarder le fichier dans le stockage
   - Classifier les variables (système vs personnalisées)
   - Afficher un résumé

Exemple de résumé:
```
Modèle Word "Contrat CDI" importé avec succès!

5 variables système détectées
2 variables personnalisées détectées

Le fichier Word a été sauvegardé avec sa mise en forme complète.
```

## Étape 4: Générer un Courrier

1. Allez dans **Administration > Générer Courrier Word**
2. **Sélectionnez un modèle Word** dans la liste de gauche
   - Les modèles Word ont une icône verte et un badge "Word"
3. **Sélectionnez un employé** dans la liste de droite
   - Recherchez par nom, prénom ou matricule
4. Si le modèle contient des **variables personnalisées**, remplissez-les:
   - Un formulaire apparaîtra automatiquement
   - Saisissez les valeurs pour chaque variable
5. Cliquez sur **Générer le Document Word**
6. Le système va:
   - Télécharger le modèle
   - Remplacer toutes les variables par leurs valeurs
   - Générer le document final
   - Le sauvegarder dans le stockage
   - Le télécharger automatiquement sur votre ordinateur

## Étape 5: Consulter l'Historique

Dans la même page "Générer Courrier Word", en bas, vous trouverez:
- La liste des 10 derniers documents générés
- Pour chaque document: nom du modèle, employé concerné, date de génération
- Un bouton **Télécharger** pour récupérer à nouveau le document

## Caractéristiques Techniques

### Mise en Forme Préservée

Le système préserve intégralement:
- Les polices et styles de texte
- Les couleurs
- Les tableaux
- Les images et logos
- Les en-têtes et pieds de page
- Les sauts de page
- Les puces et numérotations
- Toute autre mise en forme Word

### Sécurité

- Les modèles sont stockés dans un bucket privé Supabase
- Seuls les utilisateurs authentifiés peuvent accéder aux modèles
- Les documents générés sont également stockés de manière sécurisée
- Les permissions RLS contrôlent l'accès

### Performance

- Les documents sont générés côté client (dans le navigateur)
- Pas de délai serveur pour la génération
- Téléchargement immédiat après génération
- Les fichiers générés sont automatiquement sauvegardés

## Dépannage

### Le modèle ne s'importe pas

- Vérifiez que le fichier est bien au format .docx (pas .doc)
- Assurez-vous que les buckets de stockage sont créés
- Vérifiez les permissions dans Supabase Storage

### Les variables ne sont pas remplacées

- Vérifiez le format: `{{variable}}` (avec doubles accolades)
- Pas d'espaces dans le nom de la variable
- Les variables sont sensibles à la casse

### Le document généré n'a pas la bonne mise en forme

- Assurez-vous d'utiliser un fichier .docx (format Office Open XML)
- Les fichiers .doc (ancien format) ne sont pas supportés
- Évitez les mises en forme trop complexes

## Avantages de cette Solution

1. **Aucune perte de mise en forme** - Contrairement aux systèmes qui génèrent du PDF ou du texte, vos documents Word restent identiques
2. **Simplicité d'utilisation** - Il suffit de préparer un modèle Word normal
3. **Flexibilité** - Ajoutez autant de variables personnalisées que nécessaire
4. **Historique complet** - Tous les documents générés sont conservés
5. **Éditable** - Les documents générés peuvent être modifiés dans Word si nécessaire

## Support

Pour toute question ou problème:
1. Vérifiez que les scripts SQL ont été exécutés
2. Vérifiez les permissions Supabase
3. Consultez la console navigateur pour les erreurs
4. Vérifiez que les variables sont bien au format `{{variable}}`
