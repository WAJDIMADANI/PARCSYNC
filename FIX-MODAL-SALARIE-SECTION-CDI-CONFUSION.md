# Fix - Section CDI prêtant à confusion dans le modal salarié

## Problème résolu

Dans le modal de détail d'un salarié (ex: Salif TRAORE), la section "Modèle de contrat / Prévisualisation (CDI)" apparaissait même quand aucun contrat actif/signé ne couvre la période actuelle.

### Situation problématique

- **Salarié:** Salif TRAORE
- **Contrats visibles en bas:** Avenants envoyés/expirés
- **Section "Modèle de contrat":** Affichait "CDI - Contrat à durée indéterminée"
- **Bouton "Modifier":** Visible dans la section "Contrat Principal"
- **Problème UX:** Donne l'impression qu'un CDI est en place alors qu'aucun contrat actif/signé ne couvre aujourd'hui

## Solution appliquée

### Modifications dans EmployeeList.tsx

1. **Section "Modèle de contrat / Prévisualisation" (ligne 3239)**
   - **Avant:** Affichée si `currentEmployee.modele_contrat` existe
   - **Après:** Affichée uniquement si `currentEmployee.modele_contrat` existe ET `getLatestActiveContract()` retourne un contrat actif/signé

2. **Bouton "Modifier" de la section Contrat Principal (ligne 3201)**
   - **Avant:** Toujours visible
   - **Après:** Visible uniquement si `getLatestActiveContract()` retourne un contrat actif/signé

### Logique de `getLatestActiveContract()`

Cette fonction retourne le type du contrat actif/signé le plus récent:
```typescript
- Filtre les contrats avec statut 'actif' ou 'signe'
- Priorité aux CDI (date_fin NULL)
- Sinon, tri par date_fin décroissant
- Retourne null si aucun contrat actif/signé n'existe
```

## Résultat

### Comportement après la correction

**Cas 1: Profil avec contrat actif/signé (CDI ou CDD)**
- ✅ Section "Modèle de contrat" visible
- ✅ Bouton "Modifier" visible
- ✅ Affichage cohérent avec les contrats listés en bas

**Cas 2: Profil sans contrat actif/signé (seulement avenants expirés/envoyés)**
- ✅ Section "Modèle de contrat" cachée
- ✅ Bouton "Modifier" caché
- ✅ Plus de confusion: les informations affichées correspondent aux contrats réels
- ✅ Les autres sections restent visibles (Statut, Dates, Secteur, Role)

## Fichiers modifiés

- **src/components/EmployeeList.tsx**
  - Ligne 3239: Condition pour afficher la section "Modèle de contrat"
  - Ligne 3201: Condition pour afficher le bouton "Modifier"

## Test

1. Ouvrir le modal d'un salarié avec uniquement avenants expirés (ex: Salif TRAORE)
2. Vérifier que la section "Modèle de contrat / Prévisualisation" n'apparaît pas
3. Vérifier que le bouton "Modifier" dans la section "Contrat Principal" n'apparaît pas
4. Vérifier que les autres informations (Statut, Dates, Secteur) restent visibles

## Build

✅ Build réussi sans erreurs
