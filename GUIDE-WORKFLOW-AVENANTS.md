# Guide du Workflow de Gestion des Avenants

## Vue d'ensemble

Le système de gestion des avenants permet de créer automatiquement des avenants 1 et 2 avec pré-remplissage automatique des dates des contrats précédents.

## Fonctionnalités implémentées

### 1. Détection automatique du type d'avenant

Le système détecte automatiquement si le modèle de contrat sélectionné est :
- Un **contrat classique** (CDD/CDI)
- Un **avenant 1** (prolongation du CDD initial)
- Un **avenant 2** (deuxième prolongation)

La détection se fait en analysant le nom du modèle de contrat :
- Recherche des mots-clés : "avenant 1", "avenant n°1", "avenant n° 1"
- Recherche des mots-clés : "avenant 2", "avenant n°2", "avenant n° 2"

### 2. Récupération automatique des dates

#### Pour l'avenant 1 :
- **Date début CDD** : récupérée automatiquement depuis le dernier contrat CDD du salarié
- **Date fin CDD** : récupérée automatiquement depuis le dernier contrat CDD du salarié
- **Date fin avenant 1** : à saisir manuellement (nouvelle date de fin)

#### Pour l'avenant 2 :
- **Date début CDD** : récupérée depuis le contrat initial
- **Date fin CDD** : récupérée depuis le contrat initial
- **Date début avenant 1** : récupérée depuis l'avenant 1
- **Date fin avenant 1** : récupérée depuis l'avenant 1
- **Date fin avenant 2** : à saisir manuellement (nouvelle date de fin)

### 3. Interface utilisateur

#### Affichage pour l'avenant 1 :
- Section bleue affichant les dates du CDD initial (en lecture seule)
- Champ éditable pour la date de fin de l'avenant 1
- Message d'avertissement si aucun CDD n'est trouvé

#### Affichage pour l'avenant 2 :
- Section violette affichant les dates du CDD et de l'avenant 1 (en lecture seule)
- Champ éditable pour la date de fin de l'avenant 2
- Message d'avertissement si des données sont manquantes

### 4. Validation des données

Le système valide automatiquement que :
- La date de fin de l'avenant 1 est **postérieure** à la date de fin du CDD initial
- La date de fin de l'avenant 2 est **postérieure** à la date de fin de l'avenant 1
- Les champs obligatoires sont remplis avant l'envoi

### 5. Stockage des données

Toutes les variables sont stockées dans la colonne `variables` (JSONB) de la table `contrat` :

```json
{
  "poste": "...",
  "contract_start": "2024-01-01",
  "contract_end": "2024-06-30",
  "employees_date_de_debut___av1": "2024-01-01",
  "employees_date_de_fin__av1": "2024-12-31",
  "employees_date_de_fin__av2": "2025-06-30"
}
```

## Comment utiliser

### Étape 1 : Créer un modèle d'avenant

1. Allez dans la section "Modèles de contrats"
2. Créez un nouveau modèle nommé par exemple :
   - "CDD - AVENANT 1 prolongation"
   - "CDD - AVENANT 2 prolongation"
3. Le système détectera automatiquement le type d'avenant

### Étape 2 : Envoyer un avenant à un salarié

1. Sélectionnez le salarié dans la liste des employés
2. Cliquez sur "Envoyer le contrat"
3. Sélectionnez le modèle d'avenant
4. Le système va automatiquement :
   - Détecter le type d'avenant
   - Récupérer les dates des contrats précédents
   - Pré-remplir les champs en lecture seule
5. Saisissez la nouvelle date de fin
6. Validez et envoyez

### Étape 3 : Vérification

Le système affichera :
- ✅ Un encadré coloré avec les dates récupérées
- ⚠️ Un message d'avertissement si des données sont manquantes
- ❌ Une erreur de validation si les dates ne sont pas cohérentes

## Structure de la base de données

### Colonnes ajoutées à la table `contrat`

- `type_document` (text) : "contrat" ou "avenant"
- `avenant_num` (integer) : numéro de l'avenant (1, 2, 3, etc.)

### Index créés

- `idx_contrat_profil_type_document` : pour rechercher les avenants d'un salarié
- `idx_contrat_profil_avenant_num` : pour rechercher un avenant spécifique
- `idx_contrat_created_at` : pour trier par ordre chronologique

## Variables disponibles dans les modèles

Les variables suivantes peuvent être utilisées dans les modèles Word :

- `{{contract_start}}` : Date de début du CDD initial
- `{{contract_end}}` : Date de fin du CDD initial
- `{{employees_date_de_debut___av1}}` : Date de début de l'avenant 1
- `{{employees_date_de_fin__av1}}` : Date de fin de l'avenant 1
- `{{employees_date_de_fin__av2}}` : Date de fin de l'avenant 2

## Gestion des erreurs

### Aucun CDD trouvé
Si aucun CDD n'est trouvé pour un salarié, le système :
- Affiche un message d'avertissement
- Permet de saisir les dates manuellement
- Continue le processus normalement

### Dates incohérentes
Si les dates ne sont pas cohérentes, le système :
- Affiche un message d'erreur explicite
- Empêche l'envoi du contrat
- Demande de corriger les dates

### Données manquantes
Si des données sont manquantes (avenant 1 pour un avenant 2), le système :
- Affiche un avertissement
- Permet la saisie manuelle
- Valide la cohérence des dates saisies

## Notes techniques

- Les fonctions de récupération utilisent `.maybeSingle()` pour gérer l'absence de données
- Les dates sont stockées au format ISO (YYYY-MM-DD)
- La validation se fait côté client et côté serveur
- Les variables sont automatiquement incluses dans le JSON envoyé à Supabase
