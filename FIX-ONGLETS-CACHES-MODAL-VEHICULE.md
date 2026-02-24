# Fix - Onglets cachés dans le modal véhicule

## Problème identifié

Les onglets "Kilométrage" et "Documents" étaient cachés/invisibles dans le modal de détail du véhicule car :
- La barre de navigation n'avait pas de scroll horizontal
- Trop d'onglets pour la largeur disponible
- Les textes longs comme "Attributions actuelles" et "Historique complet" prenaient trop de place

## Solution appliquée

### 1. Ajout du scroll horizontal
```tsx
// AVANT
<div className="border-b border-gray-200 px-6">
  <nav className="flex gap-4">

// APRÈS
<div className="border-b border-gray-200 px-6 overflow-x-auto">
  <nav className="flex gap-2 min-w-max">
```

**Changements :**
- `overflow-x-auto` : Active le scroll horizontal quand nécessaire
- `gap-2` au lieu de `gap-4` : Réduit l'espacement entre les onglets
- `min-w-max` : Force la navigation à ne pas se comprimer

### 2. Optimisation des boutons d'onglets

Chaque bouton a été modifié :
```tsx
// AVANT
className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${...}`}

// APRÈS
className={`py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${...}`}
```

**Changements :**
- `px-3` au lieu de `px-2` : Légèrement plus d'espace pour une meilleure lisibilité
- `whitespace-nowrap` : Empêche le texte de se couper sur plusieurs lignes

### 3. Raccourcissement des textes longs

- "Attributions actuelles" → "Attributions"
- "Historique complet" → "Historique"

**Raison :** Gain d'espace tout en gardant la compréhension

## Résultat

### Avant
- ❌ Onglets "Kilométrage" et "Documents" invisibles
- ❌ Impossible d'accéder à ces fonctionnalités sans redimensionner

### Après
- ✅ Tous les onglets sont accessibles
- ✅ Scroll horizontal fluide sur petits écrans
- ✅ Navigation compacte et optimisée
- ✅ Meilleure expérience utilisateur

## Comportement

### Sur grand écran (desktop)
- Tous les onglets visibles sans scroll
- Navigation fluide

### Sur petit écran (mobile/tablette)
- Scroll horizontal disponible automatiquement
- Glissez horizontalement pour voir tous les onglets
- Barre de scroll discrète (navigateur natif)

## Liste complète des onglets (dans l'ordre)

1. **Informations** - Détails du véhicule
2. **Statut** - Gestion et historique du statut
3. **Attributions** - Locataire actuel et attributions
4. **Propriétaire** - Info propriétaire carte grise
5. **Historique** - Historique des attributions
6. **Assurance** - Détails assurance
7. **Équipements** - Équipements embarqués
8. **Kilométrage** - Gestion kilométrage
9. **Documents** - Documents du véhicule

## Test de vérification

1. Ouvrir un véhicule dans l'interface
2. Vérifier que tous les 9 onglets sont visibles ou accessibles par scroll
3. Sur mobile : glisser horizontalement pour voir "Kilométrage" et "Documents"
4. Cliquer sur chaque onglet pour vérifier l'affichage

## Notes techniques

- Le scroll horizontal utilise le comportement natif du navigateur
- `overflow-x-auto` masque la barre de scroll quand elle n'est pas nécessaire
- `min-w-max` garantit que le contenu ne se comprime jamais
- `whitespace-nowrap` préserve l'intégrité des textes

## Compatibilité

- ✅ Chrome / Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile (iOS / Android)
- ✅ Tablettes
