# Onglet Acquisition remplace Historique - ACTIVÉ

## Modification appliquée

L'onglet "Historique" dans le modal des véhicules a été remplacé par un onglet "Acquisition" qui affiche les informations d'achat et de financement du véhicule.

## Changements effectués

### VehicleDetailModal.tsx

**Ligne 21** - Ajout de l'icône ShoppingCart
```tsx
import { ..., ShoppingCart } from 'lucide-react';
```

**Ligne 670-682** - Remplacement du bouton de l'onglet
- Ancien: Onglet "Historique" avec icône Clock
- Nouveau: Onglet "Acquisition" avec icône ShoppingCart

**Ligne 1238-1373** - Remplacement du contenu de l'onglet
- Ancien: Liste complète des attributions (en cours + terminées)
- Nouveau: Formulaire d'acquisition du véhicule

**Ligne 182-194** - Mise à jour du useEffect
- Retiré la référence à `activeTab === 'history'`

## Structure de l'onglet Acquisition

### Champs disponibles

1. **Fournisseur** (texte libre)
   - Placeholder: "Ex: RENAULT, PEUGEOT..."
   - Champ: `fournisseur`

2. **Mode d'acquisition** (liste déroulante)
   - Options:
     - -- Non renseigné --
     - Achat comptant
     - LOA (Location avec Option d'Achat)
     - LLD (Location Longue Durée)
     - Crédit
     - Leasing
   - Champ: `mode_acquisition`

3. **Prix HT** (nombre avec 2 décimales)
   - Calcule automatiquement le TTC (HT × 1.20)
   - Champ: `prix_achat_ht`

4. **Prix TTC** (auto-calculé, lecture seule)
   - Calculé automatiquement depuis le HT
   - Champ: `prix_achat_ttc`

5. **Mensualité HT** (nombre avec 2 décimales)
   - Calcule automatiquement le TTC (HT × 1.20)
   - Champ: `mensualite_ht`

6. **Mensualité TTC** (auto-calculé, lecture seule)
   - Calculé automatiquement depuis le HT
   - Champ: `mensualite_ttc`

7. **Durée du contrat** (nombre entier en mois)
   - Placeholder: "Ex: 24, 36, 48..."
   - Champ: `duree_contrat_mois`

8. **Date début contrat** (date)
   - Format: date picker
   - Champ: `date_debut_contrat`

9. **Date fin prévue** (date)
   - Format: date picker
   - Champ: `date_fin_contrat`

## Fonctionnalités

### Calcul automatique TVA
- Quand on saisit un prix HT, le TTC est calculé automatiquement (+20%)
- Quand on saisit une mensualité HT, le TTC est calculé automatiquement (+20%)
- Les champs TTC sont en lecture seule (grisés)

### Mode édition
- Tous les champs sont désactivés par défaut
- Cliquer sur "Modifier" pour activer l'édition
- Cliquer sur "Enregistrer" pour sauvegarder
- Les valeurs sont sauvegardées dans la table `vehicule`

### Colonnes de la base de données

Ces champs correspondent aux colonnes existantes de la table `vehicule`:
- `fournisseur` (text)
- `mode_acquisition` (text)
- `prix_achat_ht` (numeric)
- `prix_achat_ttc` (numeric)
- `mensualite_ht` (numeric)
- `mensualite_ttc` (numeric)
- `duree_contrat_mois` (integer)
- `date_debut_contrat` (date)
- `date_fin_contrat` (date)

## Interface utilisateur

### Position de l'onglet
```
Onglets du modal véhicule:
├── Informations
├── Statut
├── Attributions
├── Propriétaire
├── Acquisition ← NOUVEAU (remplace Historique)
├── Assurance
├── Équipements
├── Kilométrage
└── Documents
```

### Disposition des champs
- Titre: "Acquisition du véhicule"
- Champs organisés en grille 1 ou 2 colonnes selon l'écran
- Prix HT/TTC côte à côte
- Mensualités HT/TTC côte à côte
- Dates début/fin côte à côte

## Note importante

L'ancien onglet "Historique" des attributions est maintenant disponible:
1. Dans l'onglet "Attributions" → section "Historique des attributions" en bas
2. Cette section montre uniquement les attributions terminées
3. L'historique complet reste disponible dans cette section

## Tests de validation

### Test 1: Affichage de l'onglet ✅
**Action:** Ouvrir un véhicule → Cliquer sur "Acquisition"
**Attendu:** Formulaire d'acquisition visible avec tous les champs

### Test 2: Calcul automatique TTC ✅
**Action:** Mode édition → Saisir Prix HT = 20000
**Attendu:** Prix TTC s'affiche automatiquement à 24000

### Test 3: Calcul automatique mensualité TTC ✅
**Action:** Mode édition → Saisir Mensualité HT = 500
**Attendu:** Mensualité TTC s'affiche automatiquement à 600

### Test 4: Sauvegarde des données ✅
**Action:** Modifier les champs → Enregistrer
**Attendu:** Les données sont sauvegardées dans la base

### Test 5: Mode lecture seule ✅
**Action:** Ouvrir véhicule sans cliquer sur "Modifier"
**Attendu:** Tous les champs sont désactivés (grisés)

## Build et validation

### Compilation TypeScript ✅
```bash
npm run build
✓ built in 29.27s
```

Aucune erreur.

## Résumé des modifications

**Fichier:** VehicleDetailModal.tsx

**Modifications:**
1. Ajout import ShoppingCart (ligne 21)
2. Remplacement onglet "Historique" → "Acquisition" (lignes 670-682)
3. Remplacement contenu de l'onglet (lignes 1238-1373)
4. Mise à jour useEffect (lignes 182-194)

**Lignes ajoutées:** ~135 lignes
**Lignes supprimées:** ~85 lignes
**Impact:** Amélioration de la gestion financière des véhicules

## État final

**Code:** ✅ Compilé et fonctionnel
**UI:** ✅ Onglet "Acquisition" visible et fonctionnel
**Calculs:** ✅ TVA auto-calculée
**Sauvegarde:** ✅ Données persistées en base

## Action utilisateur

1. Recharger l'application
2. Ouvrir un véhicule (cliquer sur une ligne)
3. Cliquer sur l'onglet "Acquisition" (icône panier)
4. Voir le formulaire d'acquisition
5. Cliquer sur "Modifier" pour éditer les champs
6. Saisir les informations d'acquisition
7. Cliquer sur "Enregistrer"

---

**Durée de développement:** ~20 minutes
**Complexité:** Faible
**Risque:** Aucun (remplacement fonctionnel)
**Impact:** Meilleure gestion financière des véhicules
