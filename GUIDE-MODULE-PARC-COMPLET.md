# Guide d'Installation - Module Parc Complet

Ce guide vous accompagne dans l'installation et la configuration du nouveau module de gestion des véhicules avec système d'attributions multiples et traçabilité complète.

## Vue d'Ensemble

Le nouveau module Parc offre:
- ✅ Gestion complète des véhicules avec photos
- ✅ Système d'attributions multiples (plusieurs chauffeurs par véhicule)
- ✅ Traçabilité complète de l'historique
- ✅ Gestion des loueurs (ALD, Leaseplan, Arval, etc.)
- ✅ Filtres avancés et recherche intelligente
- ✅ Pagination optimisée pour 600+ véhicules
- ✅ Export CSV de l'historique

## 📋 Prérequis

- Accès à l'éditeur SQL de Supabase
- Droits d'administration sur le projet

## 🚀 Installation en 3 Étapes

### Étape 1: Migration de la Base de Données

Exécutez le fichier SQL suivant dans l'éditeur SQL de Supabase:

```bash
create-parc-module-complete.sql
```

Ce fichier va:
- Créer la table `loueur` pour gérer les sociétés de location
- Créer la table `attribution_vehicule` pour tracer toutes les attributions
- Ajouter les colonnes `reference_tca`, `immat_norm`, `photo_path` à la table `vehicule`
- Supprimer la colonne obsolète `conducteur_actuel_id`
- Créer des index pour optimiser les performances
- Créer la vue `v_vehicles_list` pour charger toutes les données en une seule requête
- Configurer RLS (Row Level Security)
- Insérer 4 loueurs par défaut (ALD, Leaseplan, Arval, Alphabet)

### Étape 2: Configuration du Storage

Exécutez le fichier SQL suivant pour créer le bucket de photos:

```bash
setup-vehicle-photos-storage.sql
```

Ce fichier va:
- Créer le bucket `vehicle-photos` (privé, max 5MB par fichier)
- Configurer les policies RLS pour l'upload et la lecture des photos
- Autoriser les formats: JPEG, PNG, WebP

### Étape 3: Vérification

Vérifiez que tout est bien installé:

```sql
-- Vérifier les tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('loueur', 'attribution_vehicule');

-- Vérifier la vue
SELECT COUNT(*) FROM v_vehicles_list;

-- Vérifier le bucket
SELECT * FROM storage.buckets WHERE id = 'vehicle-photos';

-- Vérifier les loueurs
SELECT * FROM loueur;
```

## 📱 Utilisation du Nouveau Module

### Interface Principale - Liste des Véhicules

**Fonctionnalités:**
- 🔍 Recherche globale (immatriculation, référence TCA, nom chauffeur, loueur)
- 🎯 Filtres avancés (statut, marque, modèle, année, référence TCA)
- 📊 Tri personnalisable sur toutes les colonnes
- 📄 Pagination (25, 50, 100 véhicules par page)
- 🖼️ Photos des véhicules

**Colonnes affichées:**
- Photo miniature
- Immatriculation (en gras)
- Référence TCA (badge)
- Marque/Modèle
- Année
- Statut (badge coloré)
- Chauffeurs actifs (avec type P/S et matricule TCA)
- Loueur (ou "Propriété TCA")
- Actions

### Fiche Détaillée du Véhicule

**Onglet "Informations":**
- Modification des données du véhicule
- Upload/suppression de photo
- Informations: immatriculation, référence TCA, marque, modèle, année, type
- Statut et dates de service

**Onglet "Attributions actuelles":**
- Liste des attributions actives
- Badge Principal/Secondaire
- Date de début et durée
- Loueur associé
- Notes éventuelles
- Bouton "Terminer l'attribution"
- Bouton "Nouvelle attribution"

**Onglet "Historique complet":**
- Timeline de toutes les attributions (actives et terminées)
- Vue chronologique inversée (plus récentes en haut)
- Calcul automatique de la durée
- Badge "Active" pour les attributions en cours
- Export CSV de l'historique

### Créer une Attribution

**Étape 1 - Sélection:**
1. Rechercher le chauffeur (nom, prénom ou matricule TCA)
2. Sélectionner le chauffeur dans la liste
3. Choisir le loueur (ou laisser vide pour "Propriété TCA")
4. Sélectionner le type: Principal ou Secondaire

**Étape 2 - Détails:**
1. Vérifier le récapitulatif
2. Saisir la date de début (par défaut: aujourd'hui)
3. Ajouter des notes si nécessaire (optionnel)
4. Confirmer

**Alertes:**
- ⚠️ Si le chauffeur a déjà une attribution principale active, un avertissement s'affiche
- La création reste possible (permet d'avoir 2 attributions principales)

## 🎯 Concepts Clés

### Attribution vs Conducteur Actuel

**Ancien système:**
- Un seul conducteur par véhicule
- Pas d'historique
- Colonne `conducteur_actuel_id` dans la table `vehicule`

**Nouveau système:**
- Plusieurs chauffeurs simultanés (principal + secondaires)
- Historique complet conservé
- Table dédiée `attribution_vehicule` avec dates de début/fin
- `date_fin IS NULL` = attribution active

### Types d'Attribution

**Principal:**
- Chauffeur principal du véhicule
- Usage quotidien
- Un véhicule peut avoir plusieurs attributions principales (mais déconseillé)

**Secondaire:**
- Chauffeur occasionnel ou de remplacement
- Usage ponctuel
- Pas de limite

### Loueurs

Le système gère deux types de véhicules:

1. **Propriété TCA** (`loueur_id IS NULL`)
   - Véhicules appartenant à l'entreprise
   - Affichage: "Propriété TCA" en vert

2. **En location** (`loueur_id IS NOT NULL`)
   - Véhicules loués auprès d'ALD, Leaseplan, Arval, etc.
   - Affichage: nom du loueur

## 🔧 Configuration Technique

### Normalisation des Immatriculations

Les immatriculations sont automatiquement normalisées:
- Suppression des espaces et tirets
- Conversion en majuscules
- Stockage dans `immat_norm`
- Index unique pour éviter les doublons

**Exemples:**
- `AA-123-BB` → `AA123BB`
- `aa 123 bb` → `AA123BB`
- `AA123BB` → `AA123BB`

### Photos des Véhicules

**Stockage:**
- Bucket: `vehicle-photos`
- Path: `{vehicule_id}/photo.{ext}`
- Formats: JPEG, PNG, WebP
- Taille max: 5MB

**Accès:**
- URLs signées (valides 1h)
- Cache côté client
- Lazy loading dans le tableau

### Vue Optimisée

La vue `v_vehicles_list` charge en une seule requête:
- Toutes les infos du véhicule
- Les attributions actives
- Les chauffeurs avec matricule TCA
- Les loueurs
- Agrégation JSON des chauffeurs actifs

**Avantages:**
- Une seule requête au lieu de N+1
- Performance optimale pour 600+ véhicules
- Tri et filtrage côté client

## 📊 Export de Données

### Export CSV de l'Historique

Depuis l'onglet "Historique complet", cliquez sur "Export CSV" pour télécharger:
- Nom complet du chauffeur
- Matricule TCA
- Type d'attribution
- Loueur
- Date début
- Date fin (ou "En cours")
- Durée calculée
- Statut (Active/Terminée)

Format: `historique_{immatriculation}_{timestamp}.csv`

## 🎨 Design et UX

### Responsive Design

Le module est optimisé pour:
- 💻 Desktop (13 pouces et +)
- 📱 Tablette
- 📱 Mobile (avec scroll horizontal sur le tableau)

### Performance

- ✅ Debounce sur la recherche (300ms)
- ✅ Pagination côté client (50 items par défaut)
- ✅ React.memo sur les rows
- ✅ useMemo pour les filtres et tri
- ✅ Lazy loading des photos
- ✅ Cache des signed URLs

### Couleurs et États

**Statuts véhicules:**
- 🟢 Actif: vert
- 🟡 Maintenance: jaune
- 🔴 Hors service: rouge
- 🔵 En location: bleu

**Types d'attribution:**
- 🔵 Principal: badge bleu
- ⚪ Secondaire: badge gris

## 🔍 Dépannage

### Problème: Les véhicules n'apparaissent pas

**Solution:**
```sql
-- Vérifier que la vue existe
SELECT COUNT(*) FROM v_vehicles_list;

-- Si erreur, recréer la vue
DROP VIEW IF EXISTS v_vehicles_list CASCADE;
-- Puis réexécuter la partie "VUE OPTIMISÉE" du SQL
```

### Problème: Impossible d'uploader des photos

**Solution:**
```sql
-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE id = 'vehicle-photos';

-- Vérifier les policies
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%vehicle%';

-- Si nécessaire, réexécuter setup-vehicle-photos-storage.sql
```

### Problème: Les immatriculations en double

**Solution:**
```sql
-- Vérifier les doublons
SELECT immat_norm, COUNT(*)
FROM vehicule
GROUP BY immat_norm
HAVING COUNT(*) > 1;

-- Normaliser manuellement
UPDATE vehicule
SET immat_norm = normalize_immat(immatriculation)
WHERE immat_norm IS NULL OR immat_norm = '';
```

## 📚 Référence API

### Table `loueur`

```sql
CREATE TABLE loueur (
  id uuid PRIMARY KEY,
  nom text NOT NULL,
  contact text,
  telephone text,
  email text,
  adresse text,
  siret text,
  actif boolean DEFAULT true,
  created_at timestamptz,
  updated_at timestamptz
);
```

### Table `attribution_vehicule`

```sql
CREATE TABLE attribution_vehicule (
  id uuid PRIMARY KEY,
  vehicule_id uuid REFERENCES vehicule(id),
  profil_id uuid REFERENCES profil(id),
  loueur_id uuid REFERENCES loueur(id),
  date_debut date NOT NULL,
  date_fin date,
  type_attribution text CHECK (type_attribution IN ('principal', 'secondaire')),
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);
```

### Fonction `normalize_immat(text)`

```sql
-- Normalise une immatriculation
SELECT normalize_immat('AA-123-BB');
-- Retourne: 'AA123BB'
```

## 🎯 Bonnes Pratiques

1. **Créer une attribution principale par véhicule** (recommandé)
2. **Utiliser les attributions secondaires** pour les chauffeurs occasionnels
3. **Toujours terminer une attribution** avant d'en créer une nouvelle pour le même chauffeur
4. **Ajouter des notes** pour documenter les changements
5. **Uploader des photos** pour faciliter l'identification
6. **Utiliser des références TCA** pour lier avec d'autres systèmes

## 🚀 Évolutions Futures

Fonctionnalités prévues:
- [ ] Alertes automatiques (CT, assurance expirées)
- [ ] Import en masse de véhicules
- [ ] QR codes pour les véhicules
- [ ] Historique des modifications
- [ ] Dashboard analytics du parc
- [ ] Export PDF des fiches véhicules

---

**Questions?** Consultez les logs du navigateur (F12 → Console) pour plus de détails sur les erreurs.

**Performance:** Ce module est optimisé pour gérer 600+ véhicules sur un écran 13 pouces avec un temps de chargement inférieur à 2 secondes.
