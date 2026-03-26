# Enrichissement Page Maintenance & Garage - Rapport

## 1. Fichiers Modifiés

### `/src/components/MaintenanceList.tsx`

**Modifications apportées :**
- Ajout du calcul KPI "En approche"
- Passage de 3 à 4 cartes KPI (grille responsive)
- Conservation des filtres existants
- Amélioration des labels

## 2. Logique Exacte des KPI

### KPI 1 : Planifiées
```typescript
const plannedCount = maintenances.filter(m => m.statut === 'a_faire').length;
```
**Règle :** Compte toutes les maintenances avec `statut = 'a_faire'`

### KPI 2 : Terminées
```typescript
const doneCount = maintenances.filter(m => m.statut === 'faite').length;
```
**Règle :** Compte toutes les maintenances avec `statut = 'faite'`

### KPI 3 : En approche (NOUVEAU)
```typescript
const today = new Date();
const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(today.getDate() + 30);

const approachingCount = maintenances.filter(m => {
  if (m.statut !== 'a_faire') return false;
  const interventionDate = new Date(m.date_intervention);
  return interventionDate >= today && interventionDate <= thirtyDaysFromNow;
}).length;
```
**Règle :** Compte les maintenances planifiées (`a_faire`) dont la `date_intervention` est entre aujourd'hui et J+30

**Détail du calcul :**
1. Filtre uniquement les maintenances avec `statut = 'a_faire'`
2. Parse la `date_intervention` en objet Date
3. Vérifie si la date est >= aujourd'hui ET <= aujourd'hui + 30 jours
4. Compte le nombre de résultats

### KPI 4 : Coût total
```typescript
const totalCost = maintenances
  .filter(m => m.statut === 'faite' && m.cout)
  .reduce((sum, m) => sum + (m.cout || 0), 0);
```
**Règle :** Somme des coûts (`cout`) de toutes les maintenances avec `statut = 'faite'` et où `cout` n'est pas null

**Note :** Le calcul se fait sur `maintenances` (toutes) et non `filteredMaintenances` pour afficher le total global

## 3. Logique Exacte des Filtres

### Filtre de recherche textuelle
```typescript
const matchesSearch = m.vehicule
  ? `${m.vehicule.immatriculation} ${m.vehicule.marque} ${m.vehicule.modele} ${m.type} ${m.prestataire || ''}`.toLowerCase().includes(search.toLowerCase())
  : false;
```
**Champs recherchés :**
- `vehicule.immatriculation`
- `vehicule.marque`
- `vehicule.modele`
- `maintenance.type`
- `maintenance.prestataire`

### Filtre par statut
```typescript
const matchesStatus = filterStatus === 'all' || m.statut === filterStatus;
```

**3 options de filtre :**

#### 1. Toutes (all)
- Affiche toutes les maintenances
- Aucun filtrage par statut

#### 2. Planifiées (a_faire)
```typescript
filterStatus === 'a_faire'
```
- Affiche uniquement les maintenances avec `statut = 'a_faire'`

#### 3. Terminées (faite)
```typescript
filterStatus === 'faite'
```
- Affiche uniquement les maintenances avec `statut = 'faite'`

### Combinaison des filtres
```typescript
const filteredMaintenances = maintenances.filter(m => {
  const matchesSearch = /* ... */;
  const matchesStatus = /* ... */;
  return matchesSearch && matchesStatus;
});
```

Les deux filtres sont combinés avec un **ET logique** :
- La maintenance doit correspondre à la recherche textuelle
- ET correspondre au filtre de statut sélectionné

## 4. Grille KPI Responsive

```typescript
<div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Comportement :**
- Mobile (< 768px) : 1 colonne (cartes empilées)
- Tablette (768px - 1023px) : 2 colonnes
- Desktop (>= 1024px) : 4 colonnes

## 5. Affichage des Cartes KPI

### Carte 1 : Planifiées
- **Label :** "Planifiées"
- **Valeur :** `{plannedCount}`
- **Icône :** Calendar (orange)
- **Couleur :** Orange (#EA580C)

### Carte 2 : Terminées
- **Label :** "Terminées"
- **Valeur :** `{doneCount}`
- **Icône :** CheckCircle (vert)
- **Couleur :** Vert (#16A34A)

### Carte 3 : En approche
- **Label :** "En approche"
- **Valeur :** `{approachingCount}`
- **Sous-label :** "30 prochains jours"
- **Icône :** Clock (bleu)
- **Couleur :** Bleu (#2563EB)

### Carte 4 : Coût total
- **Label :** "Coût total"
- **Valeur :** `{totalCost.toLocaleString()} €`
- **Sous-label :** "Terminées"
- **Icône :** DollarSign (vert)
- **Couleur :** Vert (#16A34A)

## 6. Build OK

```bash
npm run build
```

**Résultat :**
```
✓ 2046 modules transformed.
✓ built in 18.55s
```

Aucune erreur TypeScript ou de compilation.

## 7. Table Source

**Table unique :** `maintenance`

**Colonnes utilisées pour les KPI :**
- `statut` : pour filtrer planifiées/terminées
- `date_intervention` : pour calculer "en approche"
- `cout` : pour calculer le coût total

**Aucune logique parallèle :** Tous les calculs se basent sur le state `maintenances` qui contient les données de la table `maintenance`.

## 8. Récapitulatif des Changements

### Avant
- 3 cartes KPI
- Grille `md:grid-cols-3`
- Pas de notion de "en approche"

### Après
- 4 cartes KPI
- Grille `md:grid-cols-2 lg:grid-cols-4`
- Nouveau KPI "En approche" (30 jours)
- Labels améliorés avec sous-labels explicatifs
- Responsive optimisé (mobile → tablette → desktop)

## 9. Interface UI Complète

### En-tête
- Titre : "Maintenance & Garage"
- Sous-titre : "Suivi des interventions et entretiens"

### Section KPI (4 cartes)
1. Planifiées
2. Terminées
3. En approche (30j)
4. Coût total

### Section Filtres
- Barre de recherche textuelle
- 3 boutons de filtre : Toutes / Planifiées / Terminées

### Section Tableau
Colonnes :
1. Véhicule (immatriculation + marque/modèle)
2. Type
3. Date
4. Prestataire
5. Kilométrage
6. Coût
7. Statut (badge coloré)
8. Description

## 10. Cohérence Visuelle

### Couleurs
- **Orange** : Planifiées / À faire
- **Vert** : Terminées / Succès
- **Bleu** : En approche / Information
- **Gris** : Neutre / Désactivé

### Icônes Lucide React
- `Calendar` : Planification
- `CheckCircle` : Terminé
- `Clock` : Temps / Approche
- `DollarSign` : Coût
- `Search` : Recherche
- `AlertCircle` : Statut planifié (dans badges)

### Badges de Statut
- **Planifiée** : `bg-orange-100 text-orange-700`
- **Terminée** : `bg-green-100 text-green-700`

---

**Date :** 2026-03-26
**Fichiers modifiés :** 1 (`MaintenanceList.tsx`)
**Lignes ajoutées :** ~20 lignes
**Build :** ✅ OK
**Source unique :** Table `maintenance`
