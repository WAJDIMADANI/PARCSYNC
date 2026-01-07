# Guide d'installation - Onglet Mutuelle

## Description
Ajout d'un nouvel onglet "Mutuelle" dans le module Comptabilité pour suivre les dates d'effectivité de mutuelle des salariés.

## Fonctionnalités
- Filtrage par dates (dateDebut et/ou dateFin)
- Recherche par nom/prénom
- Export Excel avec colonnes : NOM, PRENOM, EFFECTIF A COMPTER DU
- Affichage dans un tableau avec tri par date descendante

## Installation en 3 étapes

### Étape 1 : Ajouter la colonne mutuelle_effective_since

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir SQL Editor**
   - Menu de gauche → SQL Editor
   - Cliquer sur "New query"

3. **Exécuter le script de migration**
   - Ouvrir le fichier `add-mutuelle-effective-since-column.sql`
   - Copier tout le contenu
   - Coller dans l'éditeur SQL
   - Cliquer sur **"Run"**

4. **Vérifier**
   Le script affichera un message confirmant que la colonne a été ajoutée.

### Étape 2 : Créer la vue v_compta_mutuelle

1. **Toujours dans SQL Editor**
   - Cliquer sur "New query"

2. **Exécuter le script de création de vue**
   - Ouvrir le fichier `create-compta-mutuelle-view.sql`
   - Copier tout le contenu
   - Coller dans l'éditeur SQL
   - Cliquer sur **"Run"**

3. **Vérifier**
   Le script affichera :
   - Le nombre total de salariés avec une date de mutuelle
   - Un aperçu des 10 premières lignes

### Étape 3 : Déployer le code frontend

Le code frontend a déjà été modifié dans les fichiers suivants :
- ✅ `src/components/ComptabiliteMutuelleTab.tsx` (nouveau composant)
- ✅ `src/components/AccountingDashboard.tsx` (onglet ajouté)
- ✅ `src/components/Sidebar.tsx` (route ajoutée)

**Rafraîchir l'application**
- Appuyer sur `Ctrl+Shift+R` (ou `Cmd+Shift+R` sur Mac)
- L'onglet "Mutuelle" apparaîtra dans Comptabilité

## Utilisation

### Accéder à l'onglet Mutuelle

1. Dans le menu de gauche, cliquer sur **"Comptabilité"**
2. Cliquer sur l'onglet **"Mutuelle"** (icône HeartHandshake rose)

### Rechercher des données

1. **Avec dates**
   - Sélectionner une date de début (optionnel)
   - Sélectionner une date de fin (optionnel)
   - Cliquer sur "Rechercher"

2. **Sans dates**
   - Laisser les dates vides
   - Cliquer sur "Rechercher"
   - Affichera tous les salariés avec une date de mutuelle

3. **Filtrer les résultats**
   - Utiliser la barre de recherche pour filtrer par nom/prénom

### Exporter en Excel

1. Après avoir effectué une recherche
2. Cliquer sur le bouton **"Exporter"**
3. Le fichier Excel sera téléchargé avec le nom :
   - `mutuelle_YYYY-MM-DD_YYYY-MM-DD.xlsx` (si dates spécifiées)
   - `mutuelle_YYYY-MM-DD.xlsx` (sans dates)

## Format des données

### Colonnes affichées dans l'interface
- **Nom** : Nom du salarié
- **Prénom** : Prénom du salarié
- **Effectif à compter du** : Date au format français (JJ/MM/AAAA)

### Colonnes exportées dans Excel
- **NOM** : Nom du salarié
- **PRENOM** : Prénom du salarié
- **EFFECTIF A COMPTER DU** : Date au format français (JJ/MM/AAAA)

## Ajouter des dates de mutuelle aux salariés

Pour qu'un salarié apparaisse dans l'onglet Mutuelle, il faut lui attribuer une date de mutuelle :

### Méthode 1 : Via SQL
```sql
UPDATE profil
SET mutuelle_effective_since = '2024-01-15'
WHERE id = 'UUID_DU_PROFIL';
```

### Méthode 2 : Import en masse
```sql
-- Exemple pour plusieurs salariés
UPDATE profil
SET mutuelle_effective_since = '2024-01-01'
WHERE matricule IN ('MAT001', 'MAT002', 'MAT003');
```

### Méthode 3 : Via l'interface (future évolution)
L'ajout d'un champ dans le modal de modification du salarié pourra être fait ultérieurement.

## Vérification après installation

### 1. Vérifier que la colonne existe
```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profil'
  AND column_name = 'mutuelle_effective_since';
```

**Résultat attendu** : Une ligne avec `mutuelle_effective_since`, type `date`, nullable `YES`

### 2. Vérifier que la vue existe
```sql
SELECT COUNT(*) FROM v_compta_mutuelle;
```

**Résultat attendu** : Le nombre de salariés ayant une date de mutuelle (peut être 0 au début)

### 3. Vérifier l'interface
- Ouvrir l'application
- Menu Comptabilité → Onglet Mutuelle
- L'onglet doit s'afficher avec l'icône HeartHandshake rose

## Dépannage

### L'onglet Mutuelle n'apparaît pas
**Solution** : Rafraîchir complètement le navigateur (`Ctrl+Shift+R`)

### Erreur "relation v_compta_mutuelle does not exist"
**Solution** : Exécuter le script `create-compta-mutuelle-view.sql` dans SQL Editor

### Erreur "column mutuelle_effective_since does not exist"
**Solution** : Exécuter le script `add-mutuelle-effective-since-column.sql` dans SQL Editor

### Aucun salarié ne s'affiche
**Vérification** :
```sql
-- Vérifier combien de salariés ont une date de mutuelle
SELECT COUNT(*)
FROM profil
WHERE mutuelle_effective_since IS NOT NULL
  AND deleted_at IS NULL;
```

Si le résultat est 0, c'est normal - aucun salarié n'a encore de date de mutuelle assignée.

## Fichiers modifiés

### Frontend (déjà fait)
- ✅ `src/components/ComptabiliteMutuelleTab.tsx` - Nouveau composant
- ✅ `src/components/AccountingDashboard.tsx` - Ajout onglet + import
- ✅ `src/components/Sidebar.tsx` - Ajout route + icône

### Base de données (à exécuter)
- 📋 `add-mutuelle-effective-since-column.sql` - Ajout colonne
- 📋 `create-compta-mutuelle-view.sql` - Création vue

### Documentation
- 📖 `GUIDE-INSTALLATION-ONGLET-MUTUELLE.md` - Ce fichier

## Style et design

L'onglet Mutuelle utilise :
- **Couleur principale** : Rose/Pink (#ec4899)
- **Icône** : HeartHandshake de lucide-react
- **Style** : Identique aux autres onglets Comptabilité
- **Responsive** : Compatible mobile et desktop

## Notes importantes

- ✅ Les filtres de dates fonctionnent même si l'un des deux est vide
- ✅ La recherche est insensible à la casse
- ✅ L'export Excel respecte exactement le format demandé
- ✅ Aucune modification des autres onglets/pages
- ✅ Code organisé et maintenable
