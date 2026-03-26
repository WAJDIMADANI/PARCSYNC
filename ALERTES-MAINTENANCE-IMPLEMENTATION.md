# Système d'Alertes Maintenance - Rapport Complet

## 1. Fichiers Modifiés

### `/src/components/MaintenanceList.tsx`

**Modifications apportées :**
- Ajout de `kilometrage_actuel` dans l'interface Vehicle
- Ajout du champ dans la requête Supabase
- Création du type `AlertLevel`
- Création de la fonction `getAlertLevel()`
- Mise à jour des fonctions `getStatusIcon()`, `getStatusColor()`, `getStatusLabel()`
- Mise à jour du calcul du KPI "En approche"
- Mise à jour de l'affichage des badges dans le tableau

## 2. Logique Exacte de Calcul des Alertes

### Type AlertLevel
```typescript
type AlertLevel = 'normal' | 'approaching' | 'urgent' | 'overdue';
```

4 niveaux d'alerte possibles pour une maintenance planifiée (`a_faire`).

### Fonction `getAlertLevel(maintenance: Maintenance): AlertLevel`

Cette fonction calcule le niveau d'alerte d'une maintenance en combinant 2 critères :
- **Alerte par date** (prochain_controle_date)
- **Alerte par kilométrage** (prochain_controle_km vs kilometrage_actuel)

#### Étape 1 : Vérification du statut
```typescript
if (maintenance.statut !== 'a_faire') return 'normal';
```
Si la maintenance est terminée (`faite`), aucune alerte ne s'applique.

#### Étape 2 : Calcul de l'alerte par DATE

```typescript
if (maintenance.prochain_controle_date) {
  const controlDate = new Date(maintenance.prochain_controle_date);
  controlDate.setHours(0, 0, 0, 0);
  const diffTime = controlDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    dateAlert = 'overdue';        // Date dépassée
  } else if (diffDays <= 7) {
    dateAlert = 'urgent';         // Dans les 7 jours
  } else if (diffDays <= 30) {
    dateAlert = 'approaching';    // Dans les 30 jours
  }
}
```

**Règles DATE :**
- **En retard** (`overdue`) : `prochain_controle_date < aujourd'hui` → diffDays < 0
- **Urgent** (`urgent`) : `prochain_controle_date` dans 0-7 jours → diffDays <= 7
- **À l'approche** (`approaching`) : `prochain_controle_date` dans 8-30 jours → diffDays <= 30
- **Normal** : `prochain_controle_date` > 30 jours

#### Étape 3 : Calcul de l'alerte par KILOMÉTRAGE

```typescript
if (maintenance.prochain_controle_km && maintenance.vehicule?.kilometrage_actuel) {
  const kmRestants = maintenance.prochain_controle_km - maintenance.vehicule.kilometrage_actuel;

  if (kmRestants < 0) {
    kmAlert = 'overdue';          // Kilométrage dépassé
  } else if (kmRestants <= 300) {
    kmAlert = 'urgent';           // Moins de 300 km restants
  } else if (kmRestants <= 1000) {
    kmAlert = 'approaching';      // Moins de 1000 km restants
  }
}
```

**Règles KILOMÉTRAGE :**
- **Dépassée** (`overdue`) : `kilometrage_actuel > prochain_controle_km` → kmRestants < 0
- **Urgente** (`urgent`) : kmRestants entre 1 et 300 km → kmRestants <= 300
- **À l'approche** (`approaching`) : kmRestants entre 301 et 1000 km → kmRestants <= 1000
- **Normal** : kmRestants > 1000 km

#### Étape 4 : Combinaison des alertes (Priorité)

```typescript
const alerts: AlertLevel[] = [dateAlert, kmAlert];
if (alerts.includes('overdue')) return 'overdue';
if (alerts.includes('urgent')) return 'urgent';
if (alerts.includes('approaching')) return 'approaching';
return 'normal';
```

**Ordre de priorité (du plus grave au moins grave) :**
1. **overdue** (en retard / dépassée)
2. **urgent** (urgente)
3. **approaching** (à l'approche)
4. **normal** (planifiée)

**Exemples de combinaison :**
- Date urgent + KM normal → **urgent**
- Date approaching + KM overdue → **overdue**
- Date normal + KM approaching → **approaching**
- Date urgent + KM urgent → **urgent**
- Date overdue + KM normal → **overdue**

## 3. Mapping des Statuts Visuels

### A. Maintenances TERMINÉES (`statut = 'faite'`)

**Badge :**
- **Icône :** CheckCircle (vert)
- **Couleur :** `bg-green-100 text-green-700`
- **Label :** "Terminée"

```typescript
if (maintenance.statut === 'faite') {
  icon: <CheckCircle className="w-4 h-4 text-green-600" />
  color: 'bg-green-100 text-green-700'
  label: 'Terminée'
}
```

### B. Maintenances PLANIFIÉES (`statut = 'a_faire'`)

Le badge dépend du niveau d'alerte calculé :

#### 1. Normal (aucune alerte)
- **Icône :** Calendar (gris)
- **Couleur :** `bg-gray-100 text-gray-700`
- **Label :** "Planifiée"
- **Condition :** Plus de 30 jours ET plus de 1000 km restants

```typescript
alertLevel: 'normal'
icon: <Calendar className="w-4 h-4 text-gray-600" />
color: 'bg-gray-100 text-gray-700'
label: 'Planifiée'
```

#### 2. À l'approche
- **Icône :** Clock (bleu)
- **Couleur :** `bg-blue-100 text-blue-700`
- **Label :** "À l'approche"
- **Condition :** Entre 8-30 jours OU entre 301-1000 km restants

```typescript
alertLevel: 'approaching'
icon: <Clock className="w-4 h-4 text-blue-600" />
color: 'bg-blue-100 text-blue-700'
label: 'À l\'approche'
```

#### 3. Urgente
- **Icône :** AlertCircle (orange)
- **Couleur :** `bg-orange-100 text-orange-700`
- **Label :** "Urgente"
- **Condition :** 0-7 jours OU 0-300 km restants

```typescript
alertLevel: 'urgent'
icon: <AlertCircle className="w-4 h-4 text-orange-600" />
color: 'bg-orange-100 text-orange-700'
label: 'Urgente'
```

#### 4. En retard / Dépassée
- **Icône :** AlertCircle (rouge)
- **Couleur :** `bg-red-100 text-red-700`
- **Label :** "En retard"
- **Condition :** Date dépassée OU kilométrage dépassé

```typescript
alertLevel: 'overdue'
icon: <AlertCircle className="w-4 h-4 text-red-600" />
color: 'bg-red-100 text-red-700'
label: 'En retard'
```

## 4. KPI "En approche" (Carte)

### Ancien Calcul
```typescript
// Avant : basé sur date_intervention uniquement
const approachingCount = maintenances.filter(m => {
  if (m.statut !== 'a_faire') return false;
  const interventionDate = new Date(m.date_intervention);
  return interventionDate >= today && interventionDate <= thirtyDaysFromNow;
}).length;
```

### Nouveau Calcul
```typescript
// Après : basé sur le niveau d'alerte (date + km)
const approachingCount = maintenances.filter(m => {
  if (m.statut !== 'a_faire') return false;
  const alertLevel = getAlertLevel(m);
  return alertLevel === 'approaching' || alertLevel === 'urgent' || alertLevel === 'overdue';
}).length;
```

**Le KPI compte maintenant :**
- Les maintenances à l'approche
- Les maintenances urgentes
- Les maintenances en retard

**= Toutes les maintenances qui nécessitent une attention**

## 5. Exemples de Scénarios Réels

### Scénario 1 : Contrôle technique
```
Maintenance :
- statut: 'a_faire'
- prochain_controle_date: 2026-04-15 (dans 20 jours)
- prochain_controle_km: null

Résultat :
- dateAlert: 'approaching' (20 jours < 30)
- kmAlert: 'normal' (pas de données km)
- AlertLevel finale: 'approaching'
- Badge: "À l'approche" (bleu)
```

### Scénario 2 : Vidange urgente
```
Maintenance :
- statut: 'a_faire'
- prochain_controle_date: 2026-06-01 (dans 67 jours)
- prochain_controle_km: 155,200
Véhicule :
- kilometrage_actuel: 155,050

Calcul :
- kmRestants = 155,200 - 155,050 = 150 km
- dateAlert: 'normal' (67 jours > 30)
- kmAlert: 'urgent' (150 km < 300)
- AlertLevel finale: 'urgent'
- Badge: "Urgente" (orange)
```

### Scénario 3 : Révision dépassée
```
Maintenance :
- statut: 'a_faire'
- prochain_controle_date: 2026-03-01 (passée depuis 25 jours)
- prochain_controle_km: 150,000
Véhicule :
- kilometrage_actuel: 148,500

Calcul :
- diffDays = -25
- kmRestants = 1,500 km
- dateAlert: 'overdue' (-25 < 0)
- kmAlert: 'approaching' (1500 > 1000 mais < beaucoup)
- AlertLevel finale: 'overdue' (priorité)
- Badge: "En retard" (rouge)
```

### Scénario 4 : Kilométrage dépassé mais date OK
```
Maintenance :
- statut: 'a_faire'
- prochain_controle_date: 2026-05-15 (dans 50 jours)
- prochain_controle_km: 160,000
Véhicule :
- kilometrage_actuel: 161,200

Calcul :
- kmRestants = 160,000 - 161,200 = -1,200 km (dépassé)
- dateAlert: 'normal' (50 jours > 30)
- kmAlert: 'overdue' (-1200 < 0)
- AlertLevel finale: 'overdue'
- Badge: "En retard" (rouge)
```

### Scénario 5 : Maintenance terminée (aucune alerte)
```
Maintenance :
- statut: 'faite'
- prochain_controle_date: 2026-03-01 (passée)
- prochain_controle_km: 140,000

Résultat :
- AlertLevel: 'normal' (car statut = 'faite')
- Badge: "Terminée" (vert)
```

## 6. Tableau Récapitulatif des Badges

| Statut Maintenance | Alerte Date | Alerte KM | Badge Final | Couleur | Icône |
|-------------------|-------------|-----------|-------------|---------|-------|
| `faite` | - | - | Terminée | Vert | CheckCircle |
| `a_faire` | > 30j | > 1000km | Planifiée | Gris | Calendar |
| `a_faire` | 8-30j | 301-1000km | À l'approche | Bleu | Clock |
| `a_faire` | 0-7j | 0-300km | Urgente | Orange | AlertCircle |
| `a_faire` | < 0j | < 0km | En retard | Rouge | AlertCircle |
| `a_faire` | 5j | 2000km | Urgente | Orange | AlertCircle |
| `a_faire` | 40j | 200km | Urgente | Orange | AlertCircle |
| `a_faire` | -10j | 500km | En retard | Rouge | AlertCircle |
| `a_faire` | 15j | -500km | En retard | Rouge | AlertCircle |

**Note :** Le badge prend toujours la priorité la plus élevée entre date et km.

## 7. Palette de Couleurs

### Code Couleur Sémantique
- **Vert** (`green-600`) : Terminé / Succès
- **Gris** (`gray-600`) : Neutre / Normal / Planifié
- **Bleu** (`blue-600`) : Information / À l'approche
- **Orange** (`orange-600`) : Attention / Urgent
- **Rouge** (`red-600`) : Danger / En retard / Dépassé

### Backgrounds des Badges
- **Vert** : `bg-green-100 text-green-700`
- **Gris** : `bg-gray-100 text-gray-700`
- **Bleu** : `bg-blue-100 text-blue-700`
- **Orange** : `bg-orange-100 text-orange-700`
- **Rouge** : `bg-red-100 text-red-700`

## 8. Icônes Lucide React Utilisées

```typescript
import {
  Wrench,         // Titre de page
  Calendar,       // KPI Planifiées + Badge Normal
  DollarSign,     // KPI Coût
  Search,         // Barre de recherche
  CheckCircle,    // KPI Terminées + Badge Terminée
  Clock,          // KPI En approche + Badge À l'approche
  AlertCircle     // Badge Urgente + Badge En retard
} from 'lucide-react';
```

## 9. Requête Supabase

### Avant
```typescript
.select('*, vehicule:vehicule_id(id, immatriculation, marque, modele)')
```

### Après
```typescript
.select('*, vehicule:vehicule_id(id, immatriculation, marque, modele, kilometrage_actuel)')
```

**Champ ajouté :** `kilometrage_actuel`

Ce champ est **essentiel** pour calculer les alertes par kilométrage.

## 10. Interface TypeScript

```typescript
interface Vehicle {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  kilometrage_actuel: number | null;  // AJOUTÉ
}

interface Maintenance {
  id: string;
  vehicule_id: string;
  type: string;
  description: string | null;
  date_intervention: string;
  cout: number | null;
  kilometrage: number | null;
  prestataire: string | null;
  statut: 'a_faire' | 'faite';
  prochain_controle_date: string | null;
  prochain_controle_km: number | null;
  frequence_km: number | null;
  frequence_mois: number | null;
  created_at: string;
  vehicule?: Vehicle;
}
```

## 11. Filtres UI (Inchangés)

Les 3 filtres existants fonctionnent toujours :
1. **Toutes** : Affiche toutes les maintenances (sans filtre de statut)
2. **Planifiées** : Filtre `statut = 'a_faire'` (avec badges variables selon alerte)
3. **Terminées** : Filtre `statut = 'faite'` (badge vert uniquement)

## 12. Affichage dans le Tableau

### Structure du Badge
```typescript
<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(maintenance)}`}>
  {getStatusIcon(maintenance)}
  <span className="ml-1">{getStatusLabel(maintenance)}</span>
</span>
```

**Composants :**
1. **Container** : Badge arrondi avec couleur de fond
2. **Icône** : À gauche (16x16px)
3. **Label** : À droite avec espacement de 4px

## 13. Build OK

```bash
npm run build
```

**Résultat :**
```
✓ 2046 modules transformed.
✓ built in 15.87s
```

Aucune erreur TypeScript ou de compilation.

## 14. Table Source Unique

**Table :** `maintenance`

**Colonnes utilisées :**
- `statut` : pour filtrer a_faire / faite
- `prochain_controle_date` : pour alerte par date
- `prochain_controle_km` : pour alerte par kilométrage

**Table relation :** `vehicule`
- `kilometrage_actuel` : pour comparer avec prochain_controle_km

**Aucune logique parallèle :** Tout est calculé dynamiquement à partir des données de la table.

## 15. Récapitulatif des Changements

### Interface
- ✅ Ajout `kilometrage_actuel` dans Vehicle

### Requête
- ✅ Ajout du champ `kilometrage_actuel` dans le SELECT

### Logique Métier
- ✅ Création du type `AlertLevel`
- ✅ Création de `getAlertLevel()` avec règles date + km
- ✅ Mise à jour de `getStatusIcon()` pour gérer les alertes
- ✅ Mise à jour de `getStatusColor()` pour gérer les alertes
- ✅ Mise à jour de `getStatusLabel()` pour gérer les alertes

### KPI
- ✅ Mise à jour du calcul "En approche" pour inclure urgent et overdue

### UI
- ✅ Badges dynamiques selon niveau d'alerte
- ✅ 5 badges possibles : Terminée, Planifiée, À l'approche, Urgente, En retard

---

**Date :** 2026-03-26
**Fichiers modifiés :** 1 (`MaintenanceList.tsx`)
**Build :** ✅ OK
**Logique métier :** Date + Kilométrage avec priorité
**Source unique :** Table `maintenance` + `vehicule.kilometrage_actuel`
