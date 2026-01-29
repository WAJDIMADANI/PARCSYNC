# Guide d'intégration des locataires externes

## Étape 1: Migration SQL ✅
**Fichier:** `EXECUTER-MAINTENANT-locataires-externes.sql`

### Actions requises:
1. Ouvrir le SQL Editor dans Supabase
2. Copier-coller le contenu du fichier
3. Exécuter la requête
4. Vérifier qu'il n'y a pas d'erreurs

### Ce que fait la migration:
- Crée la table `locataire_externe` pour le carnet d'adresses
- Crée la table `locataire_externe_history` pour l'historique
- Modifie `attribution_vehicule` pour supporter les locataires externes
- Met à jour la vue `v_vehicles_list`
- Configure RLS et triggers

## Étape 2: Composants créés ✅

### LocataireExterneSelector
- Permet de rechercher et sélectionner un locataire externe existant
- Permet de créer un nouveau locataire externe
- Affiche l'historique des modifications d'un locataire

### TerminerAttributionModal
- Permet de terminer une attribution active
- Demande une date de fin
- Valide que la date de fin est après la date de début

### AttributionModal (modifié)
- Étape 1: Choix du type de locataire (3 cartes)
  - Salarié TCA
  - Personne externe
  - Entreprise externe
- Étape 2: Sélection du locataire selon le type
- Étape 3: Détails (dates, notes)
- Support de la date de fin optionnelle

## Étape 3: Modifications à faire dans VehicleDetailModal

### Dans l'onglet "Attributions actuelles":

#### Pour chaque attribution, afficher selon le type:

**Salarié TCA** (quand `profil_id` n'est pas null):
```tsx
<div className="flex items-start space-x-3">
  <Users className="h-5 w-5 text-blue-600 mt-1" />
  <div className="flex-1">
    <div className="flex items-center space-x-2">
      <span className="font-medium">{prenom} {nom}</span>
      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
        Salarié TCA
      </span>
      {type_attribution === 'principal' && (
        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
          Principal
        </span>
      )}
    </div>
    <div className="text-sm text-gray-600">
      <div>Matricule: {matricule}</div>
      {loueur_nom && <div>Loueur: {loueur_nom}</div>}
    </div>
  </div>
</div>
```

**Personne externe** (quand `type_locataire === 'personne_externe'`):
```tsx
<div className="flex items-start space-x-3">
  <User className="h-5 w-5 text-green-600 mt-1" />
  <div className="flex-1">
    <div className="flex items-center space-x-2">
      <span className="font-medium">{nom}</span>
      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
        Personne externe
      </span>
    </div>
    <div className="text-sm text-gray-600 space-y-1">
      {telephone && <div className="flex items-center space-x-1">
        <Phone className="h-3 w-3" />
        <span>{telephone}</span>
      </div>}
      {email && <div className="flex items-center space-x-1">
        <Mail className="h-3 w-3" />
        <span>{email}</span>
      </div>}
    </div>
    <button
      onClick={() => showLocataireHistory(locataire_externe_id)}
      className="mt-2 text-xs text-green-600 hover:text-green-700"
    >
      Voir historique
    </button>
  </div>
</div>
```

**Entreprise externe** (quand `type_locataire === 'entreprise_externe'`):
```tsx
<div className="flex items-start space-x-3">
  <Building2 className="h-5 w-5 text-purple-600 mt-1" />
  <div className="flex-1">
    <div className="flex items-center space-x-2">
      <span className="font-medium">{nom}</span>
      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
        Entreprise externe
      </span>
    </div>
    <div className="text-sm text-gray-600 space-y-1">
      {telephone && <div className="flex items-center space-x-1">
        <Phone className="h-3 w-3" />
        <span>{telephone}</span>
      </div>}
      {email && <div className="flex items-center space-x-1">
        <Mail className="h-3 w-3" />
        <span>{email}</span>
      </div>}
      {adresse && <div className="flex items-center space-x-1">
        <MapPin className="h-3 w-3" />
        <span>{adresse}</span>
      </div>}
    </div>
    <button
      onClick={() => showLocataireHistory(locataire_externe_id)}
      className="mt-2 text-xs text-purple-600 hover:text-purple-700"
    >
      Voir historique
    </button>
  </div>
</div>
```

#### Bouton "Terminer attribution":
Ajouter pour chaque attribution active:
```tsx
<button
  onClick={() => openTerminerModal(attribution)}
  className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
>
  <X className="h-4 w-4" />
  <span>Terminer</span>
</button>
```

### Dans l'onglet "Historique complet":

Inclure toutes les attributions (passées et présentes) avec:
- Icône différente selon le type
- Badge de couleur approprié
- Dates de début et fin
- Informations complètes du locataire

### Imports nécessaires:
```tsx
import { Users, User, Building2, Phone, Mail, MapPin, X } from 'lucide-react';
import TerminerAttributionModal from './TerminerAttributionModal';
```

### État à ajouter:
```tsx
const [terminerModalOpen, setTerminerModalOpen] = useState(false);
const [selectedAttribution, setSelectedAttribution] = useState<any>(null);
```

### Handlers à ajouter:
```tsx
const openTerminerModal = (attribution: any) => {
  setSelectedAttribution(attribution);
  setTerminerModalOpen(true);
};

const handleTerminationSuccess = () => {
  setTerminerModalOpen(false);
  setSelectedAttribution(null);
  loadVehicleData(); // Recharger les données
};
```

## Étape 4: Page LocatairesExternesManager (à créer)

Cette page affichera:
- Liste paginée de tous les locataires externes
- Filtres par type (personne/entreprise)
- Recherche par nom
- Vue détaillée avec historique
- Liste des véhicules attribués
- Modification des coordonnées

## Étape 5: Ajout au menu Sidebar

Ajouter une nouvelle entrée pour les RH:
```tsx
{hasPermission('gerer:parc') && (
  <NavLink
    to="/locataires-externes"
    className={({ isActive }) => `...`}
  >
    <Building2 className="w-5 h-5" />
    <span>Locataires externes</span>
  </NavLink>
)}
```

## Étape 6: Test

1. Créer une attribution pour un salarié TCA
2. Créer une attribution pour une personne externe (nouveau)
3. Créer une attribution pour une entreprise externe (existante)
4. Vérifier l'affichage dans VehicleDetailModal
5. Terminer une attribution
6. Vérifier l'historique d'un locataire externe
7. Modifier un locataire externe et voir l'historique
8. Tester les exports CSV

## Notes importantes

- Le champ `type_attribution` n'existe que pour les salariés TCA
- Pour les locataires externes, `type_attribution` est NULL
- La vue `v_vehicles_list` inclut maintenant un champ `type_locataire`
- L'historique est automatiquement créé via trigger lors des mises à jour
