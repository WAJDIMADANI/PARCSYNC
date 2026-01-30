# Correction - Affichage du locataire après modification d'attribution

## Problème résolu

Lorsqu'un locataire était modifié dans le modal de gestion du locataire actuel (avec les dates d'attribution), le changement n'apparaissait pas immédiatement dans :
1. Le tableau de gestion des véhicules (colonne "Nom du locataire")
2. L'onglet "Gestion du locataire actuel" du modal de détails

## Cause du problème

Le modal `VehicleDetailModal` chargeait les données depuis la table `vehicule` directement, qui ne contient pas les champs calculés comme :
- `chauffeurs_actifs` (liste des chauffeurs attribués)
- `locataire_affiche` (nom du locataire calculé selon les règles métier)
- `loueur_affiche` (nom du loueur)

Ces champs sont calculés par la vue `v_vehicles_list` qui fait des jointures avec `attribution_vehicule` et applique la logique métier pour déterminer le locataire.

## Solution appliquée

### 1. Modification de `fetchVehicleDetails()` dans VehicleDetailModal.tsx

**Avant :**
```typescript
const { data, error } = await supabase
  .from('vehicule')  // ❌ Table directe, pas de champs calculés
  .select('*')
  .eq('id', vehicle.id)
  .single();
```

**Après :**
```typescript
const { data, error } = await supabase
  .from('v_vehicles_list')  // ✅ Vue avec champs calculés
  .select('*')
  .eq('id', vehicle.id)
  .single();
```

### 2. Ajout de l'appel à `fetchVehicleDetails()` après modification d'attribution

Dans le callback `onSuccess` de `AttributionModal` :

```typescript
onSuccess={() => {
  setShowAttributionModal(false);
  fetchAttributions();          // Recharge la liste des attributions
  fetchVehicleDetails();        // ✅ Recharge les données du véhicule (NOUVEAU)
  onUpdate();                   // Recharge la liste parente
}}
```

### 3. Ajout des champs dans l'interface TypeScript

Ajout de `locataire_affiche` et `loueur_affiche` dans l'interface `Vehicle` :

```typescript
interface Vehicle {
  // ... autres champs
  locataire_affiche: string; // Calculé par la vue v_vehicles_list
  loueur_affiche: string;    // Calculé par la vue v_vehicles_list
}
```

## Résultat

Maintenant, quand vous :
1. **Créez une nouvelle attribution** → Le locataire s'affiche immédiatement
2. **Terminez une attribution** → Le locataire se met à jour immédiatement
3. **Modifiez le type de locataire** (EPAVE, Sur parc, etc.) → La mise à jour est visible partout

Les données sont synchronisées entre :
- ✅ Le tableau principal des véhicules
- ✅ L'onglet "Attributions actuelles" du modal
- ✅ L'onglet "Gestion du locataire actuel" du modal

## Logique métier du locataire (rappel)

Le locataire est déterminé selon cette priorité (définie dans la vue `v_vehicles_list`) :

1. **Si attribution principale existe** → Nom du chauffeur principal
2. **Sinon, selon le champ `locataire_type`** :
   - `epave` → "EPAVE"
   - `sur_parc` → "Sur parc"
   - `vendu` → "Vendu"
   - `libre` → Valeur de `locataire_nom_libre`
3. **Sinon** → "Non défini"

## Fichiers modifiés

- `src/components/VehicleDetailModal.tsx`
  - Fonction `fetchVehicleDetails()` : fetch depuis `v_vehicles_list`
  - Callback `onSuccess` de `AttributionModal` : ajout de `fetchVehicleDetails()`
  - Interface `Vehicle` : ajout de `locataire_affiche` et `loueur_affiche`

## Test de vérification

Pour vérifier que tout fonctionne :

1. Ouvrez le modal de détails d'un véhicule
2. Allez dans l'onglet "Attributions actuelles"
3. Cliquez sur "Nouvelle attribution"
4. Créez une attribution principale pour un chauffeur
5. Fermez le modal d'attribution
6. ✅ Le nom du chauffeur doit apparaître immédiatement dans "Gestion du locataire actuel"
7. Fermez le modal de détails
8. ✅ Le nom du chauffeur doit apparaître dans la colonne "Nom du locataire" du tableau
