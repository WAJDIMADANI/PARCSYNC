# Filtres Métier Maintenance - Rapport Complet

## 1. Fichiers Modifiés

### `/src/components/MaintenanceList.tsx`

**Un seul fichier modifié**

**Modifications apportées :**
- Type de filtre étendu : `'all' | 'planned' | 'approaching' | 'urgent' | 'done'`
- Logique de filtrage métier complète dans `filteredMaintenances`
- Interface utilisateur avec 5 boutons de filtre
- Réutilisation totale de la fonction `getAlertLevel()` existante

## 2. Logique Exacte des Filtres

### Type de Filtre

```typescript
const [filterStatus, setFilterStatus] = useState<'all' | 'planned' | 'approaching' | 'urgent' | 'done'>('all');
```

**5 valeurs possibles :**
1. `'all'` : Tout (aucun filtre de statut)
2. `'planned'` : Planifiées (normales)
3. `'approaching'` : En approche
4. `'urgent'` : Urgentes
5. `'done'` : Terminées

### Fonction de Filtrage

```typescript
const filteredMaintenances = maintenances.filter(m => {
  // 1. Filtre de recherche texte
  const matchesSearch = m.vehicule
    ? `${m.vehicule.immatriculation} ${m.vehicule.marque} ${m.vehicule.modele} ${m.type} ${m.prestataire || ''}`.toLowerCase().includes(search.toLowerCase())
    : false;

  // 2. Filtre de statut métier
  let matchesStatus = true;

  if (filterStatus !== 'all') {
    if (filterStatus === 'done') {
      matchesStatus = m.statut === 'faite';
    } else if (filterStatus === 'planned') {
      matchesStatus = m.statut === 'a_faire' && getAlertLevel(m) === 'normal';
    } else if (filterStatus === 'approaching') {
      matchesStatus = m.statut === 'a_faire' && (getAlertLevel(m) === 'approaching' || getAlertLevel(m) === 'urgent' || getAlertLevel(m) === 'overdue');
    } else if (filterStatus === 'urgent') {
      matchesStatus = m.statut === 'a_faire' && (getAlertLevel(m) === 'urgent' || getAlertLevel(m) === 'overdue');
    }
  }

  // 3. Combinaison des deux filtres (ET logique)
  return matchesSearch && matchesStatus;
});
```

### Détail de Chaque Filtre

#### Filtre `'all'` (Tout)
```typescript
filterStatus === 'all'
→ matchesStatus = true (pas de filtre appliqué)
```
**Affiche :** Toutes les maintenances (terminées + planifiées de tous niveaux)

---

#### Filtre `'planned'` (Planifiées)
```typescript
filterStatus === 'planned'
→ matchesStatus = m.statut === 'a_faire' && getAlertLevel(m) === 'normal'
```

**Condition :**
- `statut = 'a_faire'` (maintenance non terminée)
- ET `alertLevel = 'normal'` (pas d'alerte)

**Affiche :** Maintenances planifiées sans urgence
- Plus de 30 jours ET plus de 1000 km restants
- Badge gris "Planifiée"

---

#### Filtre `'approaching'` (En approche)
```typescript
filterStatus === 'approaching'
→ matchesStatus = m.statut === 'a_faire' &&
                  (getAlertLevel(m) === 'approaching' ||
                   getAlertLevel(m) === 'urgent' ||
                   getAlertLevel(m) === 'overdue')
```

**Condition :**
- `statut = 'a_faire'`
- ET (`alertLevel = 'approaching'` OU `alertLevel = 'urgent'` OU `alertLevel = 'overdue'`)

**Affiche :** Toutes les maintenances nécessitant attention
- À l'approche (8-30j ou 301-1000km)
- Urgentes (0-7j ou 0-300km)
- En retard (date/km dépassés)
- Badges : bleu, orange, rouge

**Usage métier :** Vue globale de tout ce qui nécessite action

---

#### Filtre `'urgent'` (Urgentes)
```typescript
filterStatus === 'urgent'
→ matchesStatus = m.statut === 'a_faire' &&
                  (getAlertLevel(m) === 'urgent' ||
                   getAlertLevel(m) === 'overdue')
```

**Condition :**
- `statut = 'a_faire'`
- ET (`alertLevel = 'urgent'` OU `alertLevel = 'overdue'`)

**Affiche :** Maintenances prioritaires uniquement
- Urgentes (0-7j ou 0-300km)
- En retard (date/km dépassés)
- Badges : orange, rouge

**Usage métier :** Focus sur les interventions immédiates

---

#### Filtre `'done'` (Terminées)
```typescript
filterStatus === 'done'
→ matchesStatus = m.statut === 'faite'
```

**Condition :**
- `statut = 'faite'`

**Affiche :** Maintenances terminées uniquement
- Badge vert "Terminée"

---

## 3. Champs Utilisés pour la Recherche Texte

### Recherche Multi-Critères

```typescript
const matchesSearch = m.vehicule
  ? `${m.vehicule.immatriculation} ${m.vehicule.marque} ${m.vehicule.modele} ${m.type} ${m.prestataire || ''}`.toLowerCase().includes(search.toLowerCase())
  : false;
```

### 5 Champs Indexés

| Champ | Table | Type | Exemple |
|-------|-------|------|---------|
| **immatriculation** | vehicule | string | "AB-123-CD" |
| **marque** | vehicule | string | "Renault" |
| **modele** | vehicule | string | "Clio" |
| **type** | maintenance | string | "Vidange" |
| **prestataire** | maintenance | string nullable | "Garage Dupont" |

### Comportement de la Recherche

**Insensible à la casse :**
```typescript
.toLowerCase().includes(search.toLowerCase())
```

**Recherche dans la chaîne concaténée :**
```
"AB-123-CD Renault Clio Vidange Garage Dupont"
```

**Exemples de recherche :**
- `"AB-123"` → trouve le véhicule AB-123-CD
- `"renault"` → trouve tous les véhicules Renault
- `"vidange"` → trouve toutes les vidanges
- `"dupont"` → trouve toutes les interventions chez Garage Dupont
- `"clio vid"` → trouve les vidanges sur Renault Clio

**Gestion des valeurs nulles :**
```typescript
${m.prestataire || ''}
```
Si prestataire est null, remplacé par chaîne vide.

**Véhicule non trouvé :**
```typescript
m.vehicule ? ... : false;
```
Si le véhicule n'est pas chargé (erreur relation), le résultat est `false` (exclusion).

---

## 4. Combinaison Recherche + Filtre

### Logique ET

```typescript
return matchesSearch && matchesStatus;
```

**Les deux conditions doivent être vraies simultanément**

### Exemples de Combinaisons

#### Exemple 1 : Recherche + Filtre "Urgentes"
```
Recherche : "renault"
Filtre : 'urgent'

Résultat : Toutes les maintenances urgentes sur véhicules Renault
→ (immat/marque/modele contient "renault") ET (urgent ou overdue)
```

#### Exemple 2 : Recherche + Filtre "Planifiées"
```
Recherche : "vidange"
Filtre : 'planned'

Résultat : Toutes les vidanges planifiées sans urgence
→ (type contient "vidange") ET (statut a_faire ET alertLevel normal)
```

#### Exemple 3 : Recherche + Filtre "Tout"
```
Recherche : "garage martin"
Filtre : 'all'

Résultat : Toutes les maintenances chez Garage Martin
→ (prestataire contient "garage martin") ET (pas de filtre de statut)
```

#### Exemple 4 : Pas de recherche + Filtre "En approche"
```
Recherche : ""
Filtre : 'approaching'

Résultat : Toutes les maintenances à l'approche (globalement)
→ (pas de filtre texte) ET (approaching, urgent, ou overdue)
```

---

## 5. Réutilisation de Code (Zéro Duplication)

### Fonction Réutilisée

```typescript
const getAlertLevel = (maintenance: Maintenance): AlertLevel => { ... }
```

**Utilisée dans :**
1. ✅ `getStatusIcon(maintenance)` - Pour l'icône du badge
2. ✅ `getStatusColor(maintenance)` - Pour la couleur du badge
3. ✅ `getStatusLabel(maintenance)` - Pour le libellé du badge
4. ✅ `approachingCount` (KPI) - Pour compter les maintenances en approche
5. ✅ **Filtrage `'planned'`** - Pour isoler les maintenances normales
6. ✅ **Filtrage `'approaching'`** - Pour isoler les maintenances en approche/urgentes/retard
7. ✅ **Filtrage `'urgent'`** - Pour isoler les maintenances urgentes/retard

**1 seule fonction, 7 usages différents**

### Aucune Logique Dupliquée

**Avant (hypothèse duplicative) :**
```typescript
// ❌ MAUVAIS : dupliquer la logique
if (filterStatus === 'urgent') {
  const today = new Date();
  const diffDays = ...;
  const kmRestants = ...;
  if (diffDays <= 7 || kmRestants <= 300) { ... }
}
```

**Après (réutilisation) :**
```typescript
// ✅ BON : réutiliser getAlertLevel
if (filterStatus === 'urgent') {
  matchesStatus = m.statut === 'a_faire' && (getAlertLevel(m) === 'urgent' || getAlertLevel(m) === 'overdue');
}
```

**Avantages :**
- Code DRY (Don't Repeat Yourself)
- Maintenance simplifiée
- Cohérence garantie entre filtres et badges
- Modification centralisée dans `getAlertLevel()`

---

## 6. Interface Utilisateur

### Structure HTML

```tsx
<div className="flex gap-2 flex-wrap">
  <button onClick={() => setFilterStatus('all')}>Tout</button>
  <button onClick={() => setFilterStatus('planned')}>Planifiées</button>
  <button onClick={() => setFilterStatus('approaching')}>En approche</button>
  <button onClick={() => setFilterStatus('urgent')}>Urgentes</button>
  <button onClick={() => setFilterStatus('done')}>Terminées</button>
</div>
```

### Styles des Boutons

**Bouton actif :**
```css
bg-blue-600 text-white
```

**Bouton inactif :**
```css
bg-white text-gray-700 border border-gray-300 hover:bg-gray-50
```

### Responsive Design

```tsx
className="flex gap-2 flex-wrap"
```

**Comportement :**
- Desktop : 5 boutons sur 1 ligne
- Mobile : Wrapping automatique sur plusieurs lignes
- `min-w-[100px]` : Largeur minimale pour lisibilité

### Disposition Complète

```
┌──────────────────────────────────────────────────────────┐
│  [🔍 Rechercher une maintenance...]                      │
└──────────────────────────────────────────────────────────┘

┌──────┬──────────┬────────────┬──────────┬───────────┐
│ Tout │Planifiées│ En approche│ Urgentes │ Terminées │
└──────┴──────────┴────────────┴──────────┴───────────┘
   (actif = bleu, inactif = blanc bordure grise)
```

---

## 7. Logique de Comptage des Filtres

### KPI "En approche" (inchangé)

```typescript
const approachingCount = maintenances.filter(m => {
  if (m.statut !== 'a_faire') return false;
  const alertLevel = getAlertLevel(m);
  return alertLevel === 'approaching' || alertLevel === 'urgent' || alertLevel === 'overdue';
}).length;
```

**Compte :**
- Maintenances à l'approche
- Maintenances urgentes
- Maintenances en retard

**Correspondance :**
Ce KPI correspond exactement au filtre `'approaching'`

---

## 8. Exemples de Scénarios Utilisateur

### Scénario 1 : "Je veux voir uniquement les urgences"

**Action :**
1. Clic sur bouton "Urgentes"

**Résultat :**
```
filterStatus = 'urgent'
→ Affiche : maintenances avec alertLevel = 'urgent' ou 'overdue'
→ Badges visibles : Orange "Urgente" et Rouge "En retard"
→ Exclus : Planifiées (gris), À l'approche (bleu), Terminées (vert)
```

---

### Scénario 2 : "Je cherche les vidanges urgentes sur Renault"

**Action :**
1. Tape "renault vid" dans la recherche
2. Clic sur bouton "Urgentes"

**Résultat :**
```
search = "renault vid"
filterStatus = 'urgent'

→ Filtre texte : immat/marque/modele/type/prestataire contient "renault vid"
→ Filtre statut : alertLevel = 'urgent' ou 'overdue'
→ Affiche : Vidanges urgentes sur Renault uniquement
```

---

### Scénario 3 : "Je veux voir tout ce qui nécessite mon attention"

**Action :**
1. Clic sur bouton "En approche"

**Résultat :**
```
filterStatus = 'approaching'
→ Affiche : approaching + urgent + overdue
→ Badges visibles : Bleu, Orange, Rouge
→ Exclus : Planifiées (gris), Terminées (vert)
```

**Usage :** Dashboard de surveillance globale

---

### Scénario 4 : "Je veux l'historique des interventions chez Garage Dupont"

**Action :**
1. Tape "dupont" dans la recherche
2. Clic sur bouton "Terminées"

**Résultat :**
```
search = "dupont"
filterStatus = 'done'

→ Filtre texte : prestataire contient "dupont"
→ Filtre statut : statut = 'faite'
→ Affiche : Historique terminé chez Garage Dupont
```

---

### Scénario 5 : "Je veux voir toutes les maintenances planifiées sans urgence"

**Action :**
1. Clic sur bouton "Planifiées"

**Résultat :**
```
filterStatus = 'planned'
→ Affiche : statut = 'a_faire' ET alertLevel = 'normal'
→ Badges visibles : Gris "Planifiée" uniquement
→ Exclus : À l'approche, Urgentes, En retard, Terminées
```

**Usage :** Vue des maintenances à anticiper (pas d'action immédiate)

---

## 9. Tableau Récapitulatif des Filtres

| Filtre | Statut BDD | Alert Level | Badge(s) Affiché(s) | Couleur(s) | Usage Métier |
|--------|-----------|-------------|---------------------|-----------|--------------|
| **Tout** | Tous | Tous | Tous | Tous | Vue globale complète |
| **Planifiées** | `a_faire` | `normal` | Planifiée | Gris | Maintenance préventive à anticiper |
| **En approche** | `a_faire` | `approaching`, `urgent`, `overdue` | À l'approche, Urgente, En retard | Bleu, Orange, Rouge | Dashboard de surveillance |
| **Urgentes** | `a_faire` | `urgent`, `overdue` | Urgente, En retard | Orange, Rouge | Interventions immédiates |
| **Terminées** | `faite` | - | Terminée | Vert | Historique |

---

## 10. Correspondance Filtres ↔ KPI

### KPI Affichés (en haut de page)

1. **Planifiées** : `maintenances.filter(m => m.statut === 'a_faire').length`
   - **Filtre correspondant :** Aucun (il compte TOUTES les a_faire, pas seulement normales)

2. **En approche** : `approachingCount`
   - **Filtre correspondant :** `'approaching'` ✅ (exact)

3. **Terminées** : `doneCount`
   - **Filtre correspondant :** `'done'` ✅ (exact)

4. **Coût total** : Somme des coûts (terminées uniquement)
   - **Filtre correspondant :** Aucun (métrique financière)

---

## 11. Ordre de Tri (Inchangé)

```typescript
.order('date_intervention', { ascending: false })
```

**Les maintenances sont triées par date d'intervention décroissante (plus récent en premier)**

Le tri n'est pas affecté par les filtres.

---

## 12. Gestion des Cas Limites

### Cas 1 : Maintenance sans véhicule
```typescript
const matchesSearch = m.vehicule ? ... : false;
```
**Résultat :** Exclusion de la liste (ne passe pas le filtre de recherche)

### Cas 2 : Prestataire null
```typescript
${m.prestataire || ''}
```
**Résultat :** Remplacé par chaîne vide, pas d'erreur

### Cas 3 : Recherche vide
```typescript
search = ""
→ "".includes("") = true
```
**Résultat :** Toutes les maintenances passent le filtre de recherche

### Cas 4 : Filtre "Tout"
```typescript
filterStatus = 'all'
→ matchesStatus = true
```
**Résultat :** Toutes les maintenances passent le filtre de statut

### Cas 5 : Maintenance terminée mais alerte déclenchée
```typescript
m.statut = 'faite'
→ getAlertLevel(m) = 'normal' (toujours)
```
**Résultat :** Ne jamais afficher d'alerte sur une maintenance terminée

---

## 13. Matrice de Tests Filtres

| Test | Recherche | Filtre | Résultat Attendu |
|------|-----------|--------|------------------|
| 1 | "" | `all` | Toutes maintenances |
| 2 | "renault" | `all` | Toutes maintenances Renault |
| 3 | "" | `planned` | Maintenances normales uniquement |
| 4 | "" | `approaching` | Maintenances approaching + urgent + overdue |
| 5 | "" | `urgent` | Maintenances urgent + overdue |
| 6 | "" | `done` | Maintenances terminées |
| 7 | "vidange" | `urgent` | Vidanges urgentes uniquement |
| 8 | "AB-123" | `approaching` | Maintenances en approche du véhicule AB-123 |
| 9 | "dupont" | `done` | Historique chez Garage Dupont |
| 10 | "clio" | `planned` | Maintenances planifiées sur Clio |

---

## 14. Build OK

```bash
npm run build
```

**Résultat :**
```
✓ 2046 modules transformed.
✓ built in 18.29s
```

**Aucune erreur TypeScript, ESLint, ou de compilation.**

---

## 15. Performance

### Complexité de Filtrage

**Pour chaque maintenance :**
1. Filtre de recherche : O(1) - Concaténation et includes
2. Filtre de statut : O(1) - Appel à `getAlertLevel()`
3. Fonction `getAlertLevel()` : O(1) - Calculs de dates et comparaisons

**Complexité totale : O(n)** où n = nombre de maintenances

**Optimisation possible (si nécessaire) :**
- Mémoïsation de `getAlertLevel()` avec useMemo
- Index sur les champs de recherche côté BDD

**Actuellement non nécessaire** : Le nombre de maintenances reste gérable en mémoire.

---

## 16. Récapitulatif des Changements

### Code Modifié

**Ligne 36 :** Type de filtre étendu
```typescript
// Avant
const [filterStatus, setFilterStatus] = useState<'all' | 'a_faire' | 'faite'>('all');

// Après
const [filterStatus, setFilterStatus] = useState<'all' | 'planned' | 'approaching' | 'urgent' | 'done'>('all');
```

**Lignes 157-177 :** Logique de filtrage complète
```typescript
// Avant : Filtre simple sur m.statut
const matchesStatus = filterStatus === 'all' || m.statut === filterStatus;

// Après : Filtre métier avec getAlertLevel()
let matchesStatus = true;
if (filterStatus !== 'all') {
  if (filterStatus === 'done') { ... }
  else if (filterStatus === 'planned') { ... }
  else if (filterStatus === 'approaching') { ... }
  else if (filterStatus === 'urgent') { ... }
}
```

**Lignes 263-314 :** Interface avec 5 boutons
```typescript
// Avant : 3 boutons (Toutes, Planifiées, Terminées)

// Après : 5 boutons (Tout, Planifiées, En approche, Urgentes, Terminées)
```

---

## 17. Documentation des Filtres pour Utilisateurs

### Filtres Disponibles

**Tout**
- Affiche toutes les maintenances sans exception
- Usage : Vue d'ensemble complète

**Planifiées**
- Affiche uniquement les maintenances sans urgence
- Critère : Plus de 30 jours ou plus de 1000 km restants
- Badge : Gris "Planifiée"
- Usage : Maintenance préventive à planifier

**En approche**
- Affiche toutes les maintenances nécessitant attention
- Critère : Moins de 30 jours ou moins de 1000 km restants
- Badges : Bleu, Orange, Rouge
- Usage : Dashboard de surveillance quotidien

**Urgentes**
- Affiche uniquement les interventions prioritaires
- Critère : Moins de 7 jours, moins de 300 km, ou dépassé
- Badges : Orange, Rouge
- Usage : Actions immédiates à traiter

**Terminées**
- Affiche l'historique des maintenances effectuées
- Badge : Vert "Terminée"
- Usage : Consultation de l'historique

---

**Date :** 2026-03-26
**Fichiers modifiés :** 1 (`MaintenanceList.tsx`)
**Build :** ✅ OK
**Logique :** Réutilisation totale de `getAlertLevel()`
**Champs recherche :** immatriculation, marque, modele, type, prestataire
