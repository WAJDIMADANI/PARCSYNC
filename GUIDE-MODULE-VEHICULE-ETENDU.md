# Guide d'Utilisation du Module Véhicule Étendu

## Résumé

Le module de gestion des véhicules a été considérablement étendu pour inclure toutes les informations essentielles à la gestion d'un parc automobile complet.

## Ce qui a été implémenté

### 1. Base de données étendue

**Fichier:** `add-vehicle-extended-fields.sql`

Nouveaux champs ajoutés à la table `vehicule`:
- `reference_tca` - Référence interne TCA
- `immat_norm` - Immatriculation normalisée (auto-calculé)
- `date_premiere_mise_en_circulation` - Date de 1ère mise en circulation
- `assurance_type` - Type d'assurance (TCA ou externe)
- `assurance_compagnie` - Nom de la compagnie (si externe)
- `assurance_numero_contrat` - Numéro du contrat
- `licence_transport_numero` - Numéro de licence de transport
- `materiel_embarque` - Équipements embarqués (format JSON)
- `carte_essence_numero` - Numéro de la carte essence
- `carte_essence_attribuee` - Statut d'attribution de la carte
- `kilometrage_actuel` - Kilométrage actuel
- `derniere_maj_kilometrage` - Date de dernière mise à jour
- `photo_path` - Chemin vers la photo du véhicule

**Nouvelles tables créées:**

1. **document_vehicule**
   - Stockage de tous les documents (carte grise, assurance, RIS, contrôle technique, autres)
   - Gestion des dates d'émission et d'expiration
   - Système d'activation/désactivation

2. **historique_kilometrage**
   - Traçabilité complète de l'évolution du kilométrage
   - Source du relevé (manuel, carburant, maintenance)
   - Notes optionnelles

**Vues créées:**
- `v_documents_vehicule_expirant` - Documents expirant dans les 60 prochains jours
- `v_vehicles_list` - Vue enrichie avec chauffeurs et loueurs
- `v_vehicules_dashboard` - Statistiques des véhicules

### 2. Stockage des documents

**Fichier:** `setup-vehicle-documents-storage.sql`

- Création du bucket `documents-vehicules` dans Supabase Storage
- Configuration des politiques RLS pour upload/téléchargement sécurisé
- Organisation des fichiers par véhicule (sous-dossiers)

### 3. Composants créés

#### VehicleCreateModal.tsx

Modal de création de véhicule avec formulaire multi-étapes:

**Étape 1: Informations générales**
- Immatriculation (obligatoire)
- Marque et modèle (obligatoires)
- Année et type de véhicule
- Statut initial

**Étape 2: Références et dates**
- Référence TCA
- Date de 1ère mise en circulation
- Date de mise en service

**Étape 3: Assurance et licence**
- Type d'assurance (TCA/externe)
- Détails de l'assurance si externe
- Numéro de licence de transport

**Étape 4: Équipements**
- Liste des équipements embarqués
- Gestion des quantités
- Numéro et statut de carte essence

**Étape 5: Kilométrage et photo**
- Kilométrage initial
- Upload photo du véhicule
- Prévisualisation de la photo

**Étape 6: Documents**
- Upload des documents (carte grise, assurance, RIS, contrôle technique)
- Dates d'émission et d'expiration
- Support PDF, JPG, PNG

#### UpdateKilometrageModal.tsx

Modal pour mettre à jour le kilométrage:
- Saisie de la date du relevé
- Nouveau kilométrage
- Validation cohérence (alerte si inférieur au précédent)
- Notes optionnelles
- Enregistrement dans l'historique

#### VehicleDocuments.tsx

Composant de gestion des documents:
- Affichage par type de document
- Indicateurs d'état (valide/expirant/expiré)
- Upload avec dates
- Téléchargement des documents
- Suppression (soft delete)
- Alertes visuelles pour documents expirant

#### VehicleDetailModal (étendu)

Onglets ajoutés:
1. **Assurance** - Affichage du type d'assurance, compagnie, contrat, licence transport
2. **Équipements** - Liste des équipements embarqués et carte essence
3. **Kilométrage** - Affichage du kilométrage actuel avec bouton de mise à jour
4. **Documents** - Intégration du composant VehicleDocuments

### 4. Intégration dans VehicleListNew.tsx

- Bouton "Ajouter un véhicule" opérationnel
- Ouverture du modal de création
- Rafraîchissement automatique après création

## Utilisation

### Créer un nouveau véhicule

1. Cliquez sur "Ajouter un véhicule" dans la liste des véhicules
2. Suivez les 6 étapes du formulaire
3. Remplissez au minimum l'immatriculation, marque et modèle
4. Les autres champs sont optionnels mais recommandés
5. Validez la création à la dernière étape

### Gérer les documents

1. Ouvrez la fiche d'un véhicule
2. Cliquez sur l'onglet "Documents"
3. Pour chaque type de document:
   - Cliquez sur "Ajouter un document"
   - Saisissez les dates d'émission et d'expiration
   - Sélectionnez le fichier
   - Le système indiquera automatiquement le statut (valide/expirant/expiré)

### Mettre à jour le kilométrage

1. Ouvrez la fiche d'un véhicule
2. Cliquez sur l'onglet "Kilométrage"
3. Cliquez sur "Mettre à jour"
4. Saisissez la date du relevé et le nouveau kilométrage
5. Ajoutez des notes si nécessaire
6. Validez

### Consulter les informations d'assurance

1. Ouvrez la fiche d'un véhicule
2. Cliquez sur l'onglet "Assurance"
3. Consultez le type d'assurance, les détails et la licence de transport

## Migrations à exécuter

Pour activer toutes ces fonctionnalités, exécutez dans l'ordre:

```sql
-- 1. Étendre la structure de la base de données
\i add-vehicle-extended-fields.sql

-- 2. Configurer le stockage
\i setup-vehicle-documents-storage.sql
```

## Points d'attention

1. **Documents expirants**: Les documents expirant dans moins de 30 jours sont signalés en orange, ceux expirés en rouge
2. **Validation kilométrage**: Le système alerte si le nouveau kilométrage est inférieur à l'ancien
3. **Normalisation immatriculation**: Les immatriculations sont automatiquement normalisées (majuscules, sans espaces)
4. **Historique**: Chaque mise à jour de kilométrage est tracée dans l'historique

## Fonctionnalités futures possibles

- Historique détaillé du kilométrage avec graphiques
- Calcul automatique de la consommation moyenne
- Notifications automatiques pour documents expirants
- Export complet des données véhicule
- Gestion avancée des équipements avec dates d'installation

## Support

Pour toute question ou problème, référez-vous aux fichiers SQL pour comprendre la structure de données.
