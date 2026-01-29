# Implémentation du système Locataire / Propriétaire / Loueur

## Vue d'ensemble

Cette implémentation ajoute une gestion complète des trois rôles distincts autour d'un véhicule :

1. **Locataire** : Qui utilise actuellement le véhicule
2. **Propriétaire** : Qui en est le propriétaire légal (inscrit sur la carte grise)
3. **Loueur** : De qui TCA loue le véhicule

## Changements apportés

### 1. Base de données

#### Nouveaux champs dans la table `vehicule` :
- `locataire_type` (text, nullable) - Valeurs : NULL (attribué à un chauffeur), "epave", "sur_parc", "vendu", "libre"
- `locataire_nom_libre` (text, nullable) - Nom saisi manuellement quand locataire_type = "libre"
- `proprietaire_carte_grise` (text, nullable) - Nom du propriétaire légal sur la carte grise
- `loueur_type` (text, nullable) - Valeurs : "chauffeur_tca", "entreprise", "personne_externe", NULL
- `loueur_chauffeur_id` (uuid, nullable) - Référence au chauffeur si loueur_type = "chauffeur_tca"
- `loueur_nom_externe` (text, nullable) - Nom saisi si loueur_type = "entreprise" ou "personne_externe"

#### Vue `v_vehicles_list` mise à jour :
- Nouvelle colonne calculée `locataire_affiche` : Détermine automatiquement le nom à afficher (chauffeur attribué, EPAVE, Sur parc, Vendu, etc.)
- Nouvelle colonne calculée `loueur_affiche` : Affiche le nom du loueur (chauffeur TCA avec matricule ou nom externe)
- Jointure avec la table `profil` pour récupérer les informations du loueur si c'est un chauffeur TCA

### 2. Interface utilisateur

#### Tableau des véhicules (VehicleListNew.tsx)

**Colonnes supprimées :**
- Photo (supprimée du tableau)
- Année (supprimée du tableau)
- Chauffeurs (supprimée)

**Colonnes ajoutées / réorganisées :**
1. Immatriculation
2. Réf. TCA
3. Marque/Modèle
4. **Nom du locataire** (NOUVEAU)
5. Statut
6. **Propriétaire** (NOUVEAU)
7. **Loueur** (NOUVEAU)
8. Actions

**Badges colorés pour le locataire :**
- Badge bleu avec icône User : Chauffeur attribué (attribution principale)
- Badge vert : "Sur parc"
- Badge rouge : "EPAVE"
- Badge orange : "Vendu"
- Badge gris : Saisie libre
- Texte gris clair : "Non défini"

**Badges colorés pour le loueur :**
- Badge bleu clair avec icône UserCircle : Salarié TCA (avec prénom, NOM et matricule)
- Badge vert avec icône Building2 : Entreprise externe
- Badge jaune avec icône User : Personne externe
- Texte gris clair : "-" (propriété TCA)

**Recherche enrichie :**
La recherche globale inclut maintenant :
- Locataire (nom du chauffeur ou saisie libre)
- Propriétaire (carte grise)
- Loueur (chauffeur TCA ou nom externe)

**Tri enrichi :**
Possibilité de trier par :
- Nom du locataire
- Propriétaire
- Loueur

#### Modal de détail du véhicule (VehicleDetailModal.tsx)

**Nouvelle section "Gestion du locataire actuel" :**
- Affichage en lecture seule si un chauffeur est attribué en principal
- Message informatif expliquant le fonctionnement automatique
- Si pas d'attribution principale : dropdown pour choisir le type
  - "Sur parc" (par défaut)
  - "EPAVE"
  - "Vendu"
  - "Saisie libre" → affiche un champ texte pour saisir le nom (100 caractères max)

**Nouvelle section "Propriétaire (carte grise)" :**
- Champ texte libre (150 caractères max)
- Placeholder : "Ex: TCA TRANSPORT, Jean Dupont..."
- Description : "Le nom exact tel qu'il apparaît sur la carte grise"

**Nouvelle section "Gestion du loueur" :**
- Dropdown : "De qui louons-nous ce véhicule ?"
  - "Aucun (propriété TCA)"
  - "Salarié TCA" → champ UUID pour l'ID du chauffeur
  - "Entreprise externe" → champ texte avec suggestions (HERTZ, EUROPCAR, SIXT, AVIS, BUDGET)
  - "Personne externe" → champ texte libre (150 caractères max)

#### Modal d'attribution (AttributionModal.tsx)

**Gestion automatique du locataire_type :**
- Lors de la création d'une attribution principale : `locataire_type` est automatiquement mis à NULL
- Le locataire est alors calculé automatiquement par la vue

### 3. Migration des données

La migration SQL effectue automatiquement :
- Véhicules avec attribution principale active → `locataire_type` = NULL
- Véhicules sans attribution → `locataire_type` = "sur_parc"
- Tous les autres champs à NULL (à remplir manuellement par les utilisateurs)

## Installation

### Étape 1 : Exécuter la migration SQL

**IMPORTANT : Utilisez le fichier corrigé !**

Exécutez le fichier de migration corrigé dans votre base de données Supabase :

Via l'interface Supabase SQL Editor :
1. Ouvrez le SQL Editor dans votre dashboard Supabase
2. Copiez le contenu du fichier **`EXECUTER-MAINTENANT-LOCATAIRE-PROPRIETAIRE-LOUEUR.sql`**
3. Exécutez la requête

Ou via psql :
```bash
psql -h your-db-host -U postgres -d postgres -f EXECUTER-MAINTENANT-LOCATAIRE-PROPRIETAIRE-LOUEUR.sql
```

**Note :** Ce fichier contient la correction de l'erreur `la colonne l.nom_entreprise n'existe pas`. La colonne correcte est `l.nom`.

### Étape 2 : Vérifier la migration

Vérifiez que les nouveaux champs ont été ajoutés :

```sql
SELECT
  immatriculation,
  locataire_type,
  proprietaire_carte_grise,
  loueur_type
FROM vehicule
LIMIT 5;
```

Vérifiez que la vue a été mise à jour :

```sql
SELECT
  immatriculation,
  locataire_affiche,
  loueur_affiche
FROM v_vehicles_list
LIMIT 5;
```

### Étape 3 : Déployer l'application

Le code frontend a été mis à jour et le build réussit sans erreurs.

```bash
npm run build
```

## Utilisation

### Définir le propriétaire d'un véhicule

1. Ouvrez le modal de détail du véhicule
2. Allez dans l'onglet "Informations"
3. Descendez à la section "Propriétaire (carte grise)"
4. Cliquez sur "Modifier"
5. Entrez le nom du propriétaire tel qu'il apparaît sur la carte grise
6. Cliquez sur "Enregistrer"

### Définir le loueur d'un véhicule

1. Ouvrez le modal de détail du véhicule
2. Allez dans l'onglet "Informations"
3. Descendez à la section "Gestion du loueur"
4. Cliquez sur "Modifier"
5. Sélectionnez le type de loueur :
   - "Aucun" si le véhicule est propriété de TCA
   - "Salarié TCA" si vous louez à un salarié → entrez l'ID UUID du chauffeur
   - "Entreprise externe" → entrez le nom de l'entreprise (ex: HERTZ)
   - "Personne externe" → entrez le nom de la personne
6. Cliquez sur "Enregistrer"

### Gérer le locataire manuellement

Si le véhicule n'a pas d'attribution principale :

1. Ouvrez le modal de détail du véhicule
2. Allez dans l'onglet "Informations"
3. Descendez à la section "Gestion du locataire actuel"
4. Cliquez sur "Modifier"
5. Sélectionnez le type :
   - "Sur parc" (par défaut)
   - "EPAVE"
   - "Vendu"
   - "Saisie libre" → entrez un nom personnalisé
6. Cliquez sur "Enregistrer"

### Attribuer un véhicule à un chauffeur

Lorsque vous créez une attribution principale :
- Le `locataire_type` est automatiquement mis à NULL
- Le locataire devient automatiquement le chauffeur attribué
- Pas besoin de gérer manuellement le locataire

## Notes importantes

### Contraintes de cohérence

La base de données garantit la cohérence des données :
- Si `loueur_type` = "chauffeur_tca", alors `loueur_chauffeur_id` doit être renseigné
- Si `loueur_type` = "entreprise" ou "personne_externe", alors `loueur_nom_externe` doit être renseigné
- Si `locataire_type` = "libre", alors `locataire_nom_libre` doit être renseigné

### Calcul automatique du locataire

Le locataire est calculé automatiquement par la vue `v_vehicles_list` selon cette logique :
1. Si une attribution principale existe → Affiche "Prénom NOM (Matricule)"
2. Sinon si `locataire_type` = "epave" → "EPAVE"
3. Sinon si `locataire_type` = "sur_parc" → "Sur parc"
4. Sinon si `locataire_type` = "vendu" → "Vendu"
5. Sinon si `locataire_type` = "libre" → Contenu de `locataire_nom_libre`
6. Sinon → "Non défini"

### Recherche et tri

La recherche globale et le tri fonctionnent sur tous les nouveaux champs :
- Locataire (calculé automatiquement)
- Propriétaire (carte grise)
- Loueur (chauffeur TCA ou nom externe)

## Fichiers modifiés

### SQL
- `add-locataire-proprietaire-loueur-system.sql` (NOUVEAU) - Migration complète

### Frontend
- `src/components/VehicleListNew.tsx` - Tableau réorganisé avec nouvelles colonnes
- `src/components/VehicleDetailModal.tsx` - Nouvelles sections d'édition
- `src/components/AttributionModal.tsx` - Gestion automatique du locataire_type

## Support

En cas de problème :
1. Vérifiez que la migration SQL a été exécutée correctement
2. Vérifiez que les vues ont été recréées
3. Vérifiez que le build frontend réussit
4. Consultez les logs de la console pour les erreurs éventuelles

## Améliorations futures possibles

- Ajouter un dropdown avec autocomplétion pour sélectionner un chauffeur loueur (au lieu de saisir l'UUID)
- Ajouter des statistiques dans le dashboard (nombre de véhicules par type de locataire)
- Ajouter des filtres avancés par type de loueur
- Ajouter un historique des changements de locataire/loueur
- Gérer automatiquement le changement de locataire_type lors de la fin d'une attribution principale (avec dialogue de confirmation)
