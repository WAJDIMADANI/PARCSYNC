# Ajout du lien /applysite avec différenciation orange

## Ce qui a été fait

### 1. Nouveau lien de candidature
Un nouveau lien de candidature a été créé : **https://crm.tca-transport.com/applysite**

Ce lien fonctionne exactement comme le lien habituel `/apply` :
- Mêmes champs à remplir
- Même fonctionnement
- Même processus de validation

### 2. Différenciation visuelle
Les candidatures venant du lien `/applysite` apparaissent avec **un fond orange** dans le tableau des candidats pour les différencier facilement.

## Modifications effectuées

### Base de données
- Ajout d'une colonne `source` à la table `candidat`
- Valeur par défaut : `'apply'`
- Valeurs possibles : `'apply'` ou `'applysite'`

### Code
1. **Apply.tsx** : Ajout d'une prop `source` pour enregistrer la provenance
2. **App.tsx** : Ajout de la route `/applysite`
3. **CandidateList.tsx** : Affichage en orange des candidats avec `source='applysite'`

## Installation

### Étape 1 : Exécuter le SQL
Connecte-toi à Supabase et exécute le fichier SQL suivant :

**Fichier : `add-source-column-candidat.sql`**

Ce script va :
- Ajouter la colonne `source` à la table `candidat`
- Mettre à jour tous les candidats existants avec `source='apply'`

### Étape 2 : Vérifier
1. Va sur https://crm.tca-transport.com/applysite
2. Remplis une candidature de test
3. Vérifie dans le tableau des candidats que la ligne apparaît en **orange**

## Résultat

- **Lien habituel** (`/apply`) : Lignes blanches (normales)
- **Nouveau lien** (`/applysite`) : Lignes avec **fond orange**

C'est tout ! Le système est prêt à être utilisé.
