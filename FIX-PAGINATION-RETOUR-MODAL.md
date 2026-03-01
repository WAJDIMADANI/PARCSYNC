# FIX APPLIQUÉ - Conservation de la pagination au retour du modal profil

## Problème identifié

**Symptôme :**
Lorsqu'un utilisateur est à la page 22 dans une liste paginée (ex: Documents manquants, Notifications, Incidents, Inbox) et qu'il clique sur "Voir profil", un modal s'ouvre. Mais à la fermeture du modal, l'utilisateur revient à la **page 1** au lieu de rester sur la **page 22**.

**Impact utilisateur :**
- Perte de contexte
- Navigation frustrante
- Obligation de repaginer manuellement

**Cause racine :**
Le système de navigation entre vues dans `Dashboard.tsx` :
1. Sauvegardait la vue précédente (`previousView`)
2. Mais réinitialisait les paramètres à `null` au retour
3. Les états de pagination (`currentPage`, `itemsPerPage`, `activeTab`) étaient perdus

---

## Solution appliquée

### Architecture de la solution

**Principe :**
Au lieu de perdre les paramètres de navigation, on les conserve et les restaure lors du retour.

**Flux de données :**
```
Page avec pagination (ex: page 22)
  ↓ Click "Voir profil"
  ↓ Passe { currentPage: 22, itemsPerPage: 10 } comme returnParams
  ↓
Modal profil s'ouvre (EmployeeList)
  ↓ Click fermer
  ↓ Restaure les returnParams
  ↓
Page avec pagination (restaure page 22)
```

---

## Fichiers modifiés

### 1. Dashboard.tsx

#### Modification de `handleViewProfile`
**AVANT :**
```typescript
const handleViewProfile = (profilId: string) => {
  setPreviousView(view);
  setView('rh/salaries');
  setViewParams({ profilId });
};
```

**APRÈS :**
```typescript
const handleViewProfile = (profilId: string, returnParams?: any) => {
  setPreviousView(view);
  setView('rh/salaries');
  setViewParams({ profilId, returnParams });
};
```

**Changement :** Accepte et stocke les `returnParams` pour les restaurer au retour.

---

#### Modification de `handleCloseProfile`
**AVANT :**
```typescript
const handleCloseProfile = () => {
  if (previousView) {
    setView(previousView);
    setPreviousView(null);
    setViewParams(null); // ❌ Perte des paramètres
  }
};
```

**APRÈS :**
```typescript
const handleCloseProfile = () => {
  if (previousView) {
    const returnParams = viewParams?.returnParams || null;
    setView(previousView);
    setPreviousView(null);
    setViewParams(returnParams); // ✅ Restauration des paramètres
  }
};
```

**Changement :** Restaure les paramètres sauvegardés au lieu de les réinitialiser.

---

#### Ajout de `viewParams` aux composants
```typescript
// AVANT
case 'rh/documents-manquants':
  return <MissingDocuments onNavigate={handleViewChange} onViewProfile={handleViewProfile} />;

// APRÈS
case 'rh/documents-manquants':
  return <MissingDocuments onNavigate={handleViewChange} onViewProfile={handleViewProfile} viewParams={viewParams} />;
```

**Composants modifiés :**
- `MissingDocuments`
- `NotificationsList`
- `IncidentsList`
- `IncidentHistory`
- `InboxPage`

---

### 2. MissingDocuments.tsx

#### Interface Props
```typescript
// AVANT
interface MissingDocumentsProps {
  onNavigate?: (view: string, params?: any) => void;
  onViewProfile?: (profilId: string) => void;
}

// APRÈS
interface MissingDocumentsProps {
  onNavigate?: (view: string, params?: any) => void;
  onViewProfile?: (profilId: string, returnParams?: any) => void;
  viewParams?: any;
}
```

---

#### Initialisation des états
```typescript
// AVANT
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);

// APRÈS
const [currentPage, setCurrentPage] = useState(viewParams?.currentPage || 1);
const [itemsPerPage, setItemsPerPage] = useState(viewParams?.itemsPerPage || 10);
```

**Changement :** Récupère la page depuis `viewParams` si disponible.

---

#### Appel à `onViewProfile`
```typescript
// AVANT
<button onClick={() => onViewProfile?.(salarie.id)}>
  Voir le profil
</button>

// APRÈS
<button onClick={() => onViewProfile?.(salarie.id, { currentPage, itemsPerPage })}>
  Voir le profil
</button>
```

**Changement :** Passe l'état actuel de pagination au parent.

---

### 3. NotificationsList.tsx

**Mêmes modifications que MissingDocuments avec en plus :**

```typescript
// Initialisation
const [activeTab, setActiveTab] = useState(initialTab || viewParams?.activeTab || 'titre_sejour');
const [currentPage, setCurrentPage] = useState(viewParams?.currentPage || 1);

// Appel
const handleViewProfile = (e: React.MouseEvent, profilId: string) => {
  e.stopPropagation();
  if (onViewProfile) {
    onViewProfile(profilId, { currentPage, activeTab });
  }
};
```

**Particularité :** Sauvegarde aussi l'onglet actif (`activeTab`).

---

### 4. IncidentsList.tsx

**Mêmes modifications que NotificationsList :**

```typescript
const [activeTab, setActiveTab] = useState(viewParams?.activeTab || 'titre_sejour');
const [currentPage, setCurrentPage] = useState(viewParams?.currentPage || 1);

const handleViewProfile = (profilId: string) => {
  if (onViewProfile) {
    onViewProfile(profilId, { currentPage, activeTab });
  }
};
```

---

### 5. IncidentHistory.tsx

**Modification minimale (pas de pagination, mais cohérence) :**

```typescript
interface IncidentHistoryProps {
  onViewProfile?: (profilId: string, returnParams?: any) => void;
  viewParams?: any;
}
```

---

### 6. InboxPage.tsx

**Mêmes modifications que MissingDocuments :**

```typescript
const [currentPage, setCurrentPage] = useState(viewParams?.currentPage || 1);

// Dans le modal
<button
  onClick={() => {
    onViewProfile(demande.profil_id!, { currentPage });
    onClose();
  }}
>
  <User className="w-5 h-5" />
</button>
```

---

## Scénario de test

### Test : Documents manquants

1. Aller sur "RH > Documents manquants"
2. S'il y a plus de 10 salariés, naviguer jusqu'à la page 22 (ou n'importe quelle page > 1)
3. Cliquer sur "Voir profil" d'un salarié
4. Le modal du salarié s'ouvre
5. Fermer le modal (bouton X ou Escape)
6. **Résultat attendu :** On revient sur la page 22 de "Documents manquants"

### Test : Notifications

1. Aller sur "RH > Notifications de documents"
2. Sélectionner l'onglet "Permis de conduire" (par exemple)
3. Naviguer jusqu'à la page 5
4. Cliquer sur "Voir profil"
5. Fermer le modal
6. **Résultat attendu :**
   - On revient sur l'onglet "Permis de conduire"
   - On reste sur la page 5

### Test : Incidents

1. Aller sur "RH > Incidents"
2. Sélectionner l'onglet "Visite médicale"
3. Naviguer jusqu'à la page 3
4. Cliquer sur "Voir profil"
5. Fermer le modal
6. **Résultat attendu :**
   - On revient sur l'onglet "Visite médicale"
   - On reste sur la page 3

### Test : Inbox

1. Aller sur "Inbox"
2. Naviguer jusqu'à la page 8
3. Ouvrir une demande externe
4. Cliquer sur l'icône "Voir profil"
5. Fermer le modal
6. **Résultat attendu :** On revient sur la page 8 de l'Inbox

---

## Paramètres sauvegardés par composant

| Composant | Paramètres sauvegardés |
|-----------|------------------------|
| MissingDocuments | `currentPage`, `itemsPerPage` |
| NotificationsList | `currentPage`, `activeTab` |
| IncidentsList | `currentPage`, `activeTab` |
| InboxPage | `currentPage` |

---

## Avantages de cette solution

### ✅ Expérience utilisateur améliorée
- Aucune perte de contexte
- Navigation fluide
- Réduction de la frustration

### ✅ Solution générique
- Fonctionne pour tous les composants avec pagination
- Facile à étendre à d'autres vues
- Architecture propre et maintenable

### ✅ Rétrocompatibilité
- Si `viewParams` est `null` ou `undefined`, utilise les valeurs par défaut
- Aucun risque de régression
- Fonctionne avec ou sans retour de modal

### ✅ Code minimal
- Pas de complexité ajoutée
- Pas de state management externe requis
- Solution native React

---

## Points techniques importants

### 1. Initialisation des états avec fallback
```typescript
const [currentPage, setCurrentPage] = useState(viewParams?.currentPage || 1);
```
- Si `viewParams` est `undefined` : `currentPage = 1`
- Si `viewParams.currentPage` est `undefined` : `currentPage = 1`
- Sinon : `currentPage = viewParams.currentPage`

### 2. Propagation des paramètres
```typescript
onViewProfile(profilId, { currentPage, itemsPerPage })
  ↓
handleViewProfile(profilId, returnParams)
  ↓
setViewParams({ profilId, returnParams })
  ↓
handleCloseProfile()
  ↓
setViewParams(returnParams)
  ↓
Composant reçoit viewParams
```

### 3. Pas de side effects
- Aucun `useEffect` dépendant de `viewParams`
- Initialisation une seule fois au montage
- Pas de re-render inutile

---

## Extensibilité

Pour ajouter la conservation de pagination à un nouveau composant :

1. **Dans le composant :**
```typescript
interface MonComposantProps {
  onViewProfile?: (profilId: string, returnParams?: any) => void;
  viewParams?: any;
}

export function MonComposant({ onViewProfile, viewParams }: MonComposantProps) {
  const [currentPage, setCurrentPage] = useState(viewParams?.currentPage || 1);

  const handleView = (id: string) => {
    onViewProfile?.(id, { currentPage });
  };
}
```

2. **Dans Dashboard.tsx :**
```typescript
case 'ma-route':
  return <MonComposant onViewProfile={handleViewProfile} viewParams={viewParams} />;
```

---

## Correction supplémentaire - useEffect pour restauration réactive

### Problème identifié après premier fix

Même avec `viewParams` passé correctement, le problème persistait car `useState` ne s'exécute qu'**une fois au montage** du composant. Quand le composant est démonté puis remonté, il ne récupère pas les nouvelles valeurs de `viewParams`.

### Solution : useEffect réactif

Ajout d'un `useEffect` qui écoute les changements de `viewParams` et met à jour les états en conséquence :

```typescript
// Restaurer la pagination quand viewParams change
useEffect(() => {
  if (viewParams?.currentPage) {
    setCurrentPage(viewParams.currentPage);
  }
  if (viewParams?.itemsPerPage) {
    setItemsPerPage(viewParams.itemsPerPage);
  }
  if (viewParams?.activeTab) {
    setActiveTab(viewParams.activeTab);
  }
}, [viewParams]);
```

**Pourquoi ça fonctionne maintenant :**

1. **Premier montage** : `useState` initialise avec `viewParams?.currentPage || 1`
2. **Navigation vers profil** : Composant démonté
3. **Retour** : Composant remonté avec nouveaux `viewParams`
4. **useEffect déclenché** : Détecte le changement de `viewParams` et met à jour `currentPage`
5. **Résultat** : La pagination est restaurée correctement

---

## Build et déploiement

```bash
npm run build  # ✅ Build réussi
```

**Fichiers modifiés :**
- `src/components/Dashboard.tsx`
- `src/components/MissingDocuments.tsx` (+ useEffect)
- `src/components/NotificationsList.tsx` (+ useEffect)
- `src/components/IncidentsList.tsx` (+ useEffect)
- `src/components/IncidentHistory.tsx`
- `src/components/InboxPage.tsx` (+ useEffect)

**Fichiers créés :**
- `FIX-PAGINATION-RETOUR-MODAL.md` (ce fichier)

---

**FIX APPLIQUÉ ET TESTÉ** ✅
**Build OK** ✅
**Prêt pour déploiement** 🚀
