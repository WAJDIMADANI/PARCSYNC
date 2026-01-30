# Guide - Ajout des champs d'acquisition pour les véhicules

## Résumé

Tous les champs d'acquisition ont été ajoutés au module de gestion des véhicules. Une nouvelle étape "Acquisition" a été créée dans le formulaire de création de véhicule.

## Modifications apportées

### 1. Base de données

**Fichier**: `add-vehicule-acquisition-fields.sql`

Nouvelles colonnes ajoutées à la table `vehicule`:
- `fournisseur` - Le fournisseur du véhicule
- `mode_acquisition` - Mode d'acquisition (LLD, LOA, LCD, Achat pur, Prêt, Location société)
- `prix_ht` - Prix HT
- `prix_ttc` - Prix TTC (calculé automatiquement avec TVA 20%)
- `mensualite` - Montant de la mensualité (pour locations uniquement)
- `duree_contrat_mois` - Durée du contrat en mois
- `date_debut_contrat` - Date de début du contrat
- `date_fin_prevue_contrat` - Date de fin prévue du contrat

**ACTION REQUISE**: Vous devez exécuter manuellement le fichier SQL `add-vehicule-acquisition-fields.sql` dans votre console Supabase SQL Editor.

### 2. Formulaire de création de véhicule

**Fichier modifié**: `src/components/VehicleCreateModal.tsx`

- Ajout d'une nouvelle étape "Acquisition" (étape 3/7)
- Les anciennes étapes ont été décalées (Assurance devient étape 4, etc.)
- Calcul automatique du prix TTC (prix HT × 1,20)
- Affichage conditionnel:
  - Pour "Achat pur": affichage des prix d'achat HT/TTC uniquement
  - Pour les locations (LLD, LOA, LCD, etc.): affichage des prix + mensualité

### 3. Modal de détail du véhicule

**Fichier modifié**: `src/components/VehicleDetailModal.tsx`

- Nouvelle section "Acquisition du véhicule" affichée entre "Dates" et "Carte essence"
- Tous les champs d'acquisition sont modifiables en mode édition
- Calcul automatique du prix TTC lors de la modification du prix HT
- Affichage conditionnel de la mensualité (masquée pour "Achat pur")

## Fonctionnalités

### Dans le formulaire de création

1. **Fournisseur**: Champ texte libre pour le nom du fournisseur
2. **Mode d'acquisition**: Liste déroulante avec 6 options
   - LLD - Location Longue Durée
   - LOA - Location avec Option d'Achat
   - LCD - Location Courte Durée
   - Achat pur
   - Prêt
   - Location société

3. **Prix**:
   - Prix HT: Saisie manuelle
   - Prix TTC: Calculé automatiquement (HT × 1,20)

4. **Mensualité**: Affichée uniquement si le mode n'est pas "Achat pur"

5. **Durée**: Nombre de mois du contrat

6. **Dates**:
   - Date début contrat
   - Date fin prévue

### Dans le modal de détail

Toutes les informations d'acquisition sont affichées dans une section dédiée et peuvent être modifiées en activant le mode édition.

## Ordre des colonnes dans le tableau

Comme demandé précédemment, l'ordre des colonnes dans le tableau de listing est:
1. Réf. TCA (en premier)
2. Immatriculation
3. Marque/Modèle
4. Nom du locataire
5. Statut
6. Propriétaire
7. Loueur
8. Actions

## Test

Le build de l'application a été testé avec succès. Toutes les modifications compilent correctement.

## Prochaines étapes

1. Exécutez le fichier SQL `add-vehicule-acquisition-fields.sql` dans Supabase
2. Testez la création d'un nouveau véhicule
3. Vérifiez que les informations d'acquisition s'affichent correctement dans le modal de détail
4. Testez la modification des informations d'acquisition

## Notes importantes

- Le calcul de la TVA est fixé à 20% (prix TTC = prix HT × 1,20)
- La mensualité n'est pas obligatoire mais fortement recommandée pour les locations
- Tous les champs d'acquisition sont optionnels (pas de validation stricte)
- Le prix TTC est recalculé automatiquement à chaque modification du prix HT
