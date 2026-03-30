# Implémentation Navigation Inbox vers A&R

## Résumé
Ajout de la fonctionnalité permettant de naviguer directement depuis l'Inbox vers le module Comptabilité > A&R lorsqu'on clique sur une notification de fin d'absence. La ligne ciblée est automatiquement scrollée et surlignée pendant 4 secondes.

---

## Fichiers Modifiés

### 1. `/src/components/InboxPage.tsx`

**Modifications apportées :**

#### A. Types TypeScript (lignes 28, 71, 75-77, 86, 90)

```typescript
// Ajout du type 'ar_fin_absence'
interface DemandeExterne {
  type: 'demande_externe' | 'rdv_visite_medicale' | 'ar_fin_absence';
  // ...
}

// Ajout du compteur A&R dans les stats
interface TaskStats {
  // ...
  ar_fin_absence: number;
}

// Ajout du callback de navigation
interface InboxPageProps {
  onViewProfile?: (profilId: string, returnParams?: any) => void;
  onNavigateToAR?: (arEventId: string) => void;
  viewParams?: any;
}
```

#### B. Calcul du compteur A&R (lignes 354-355, 379)

```typescript
const arFinAbsence = formattedDemandes.filter(d => d.type === 'ar_fin_absence');
const arFinAbsenceCount = arFinAbsence.length;

const newStats = {
  // ...
  ar_fin_absence: arFinAbsenceCount
};
```

#### C. Navigation vers A&R au clic (lignes 469-474)

```typescript
const handleOpenDemandeExterne = async (demande: DemandeExterne) => {
  // Si c'est une notification A&R, naviguer vers le module A&R
  if (demande.type === 'ar_fin_absence' && demande.reference_id && onNavigateToAR) {
    onNavigateToAR(demande.reference_id);
    return;
  }
  // ... reste du code
};
```

#### D. Filtre A&R (lignes 578-581)

```typescript
const filteredItems = filter === 'all'
  ? inboxItems
  : filter === 'rdv_visite_medicale'
  ? // ...
  : filter === 'ar_fin_absence'
  ? inboxItems.filter(item =>
      item.itemType === 'demande_externe' && item.type === 'ar_fin_absence'
    )
  : // ...
```

#### E. UI - Carte A&R et filtre (lignes 634-651, 667-674)

```typescript
// Carte stat A&R
<StatCard
  label="A&R"
  value={stats.ar_fin_absence}
  icon={<FileText className="w-10 h-10 text-orange-500" />}
  highlight={true}
/>

// Filtre A&R
<FilterButton
  active={filter === 'ar_fin_absence'}
  onClick={() => setFilter('ar_fin_absence')}
  rdv={true}
>
  <FileText className="w-4 h-4 inline mr-1" />
  A&R ({stats.ar_fin_absence})
</FilterButton>
```

---

### 2. `/src/components/Dashboard.tsx`

**Modifications apportées :**

#### A. Fonction de navigation vers A&R (lignes 66-71)

```typescript
const handleNavigateToAR = (arEventId: string) => {
  // Navigation vers Comptabilité > A&R avec focus sur un événement
  setPreviousView(view);
  setView('compta/ar');
  setViewParams({ focus_ar_event: arEventId });
};
```

#### B. Passage du callback à InboxPage (ligne 89)

```typescript
case 'inbox':
  return <InboxPage onViewProfile={handleViewProfile} onNavigateToAR={handleNavigateToAR} viewParams={viewParams} />;
```

#### C. Passage des viewParams à AccountingDashboard (ligne 142)

```typescript
case 'compta/ar':
  return <AccountingDashboard currentView={view} onViewChange={handleViewChange} viewParams={viewParams} />;
```

---

### 3. `/src/components/AccountingDashboard.tsx`

**Modifications apportées :**

#### A. Ajout prop viewParams (lignes 14-20)

```typescript
interface AccountingDashboardProps {
  currentView: View;
  onViewChange: (view: View) => void;
  viewParams?: any;
}

export default function AccountingDashboard({ currentView, onViewChange, viewParams }: AccountingDashboardProps) {
```

#### B. Passage du focusArEventId à ComptabiliteARTab (ligne 194)

```typescript
{activeTab === 'ar' && <ComptabiliteARTab focusArEventId={viewParams?.focus_ar_event} />}
```

---

### 4. `/src/components/ComptabiliteARTab.tsx`

**Modifications apportées :**

#### A. Ajout props et state (lignes 31-46)

```typescript
interface ComptabiliteARTabProps {
  focusArEventId?: string;
}

export default function ComptabiliteARTab({ focusArEventId }: ComptabiliteARTabProps) {
  // ... états existants
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
```

#### B. useEffect pour gérer le focus (lignes 82-106)

```typescript
// Gérer le focus sur un événement spécifique depuis l'Inbox
useEffect(() => {
  if (focusArEventId && filteredEvents.length > 0 && !loading) {
    const eventIndex = filteredEvents.findIndex(e => e.id === focusArEventId);

    if (eventIndex !== -1) {
      // Calculer la page contenant l'événement
      const targetPage = Math.floor(eventIndex / itemsPerPage) + 1;
      setCurrentPage(targetPage);

      // Attendre que le DOM soit mis à jour, puis scroller et surligner
      setTimeout(() => {
        const element = document.querySelector(`[data-ar-event-id="${focusArEventId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedEventId(focusArEventId);

          // Retirer le surlignage après 4 secondes
          setTimeout(() => {
            setHighlightedEventId(null);
          }, 4000);
        }
      }, 100);
    }
  }
}, [focusArEventId, filteredEvents, loading]);
```

#### C. Attribut data et surlignage dans le tableau (lignes 510-518)

```typescript
<tr
  key={event.id}
  data-ar-event-id={event.id}
  className={`hover:bg-gray-50 transition-colors duration-300 ${
    highlightedEventId === event.id
      ? 'bg-gradient-to-r from-orange-100 via-amber-100 to-orange-100 shadow-lg scale-105'
      : ''
  }`}
>
```

---

## Flux de Navigation Complet

1. **Utilisateur clique sur notification A&R dans Inbox**
   - Type détecté : `ar_fin_absence`
   - `reference_id` contient l'ID de `compta_ar_events`

2. **InboxPage.handleOpenDemandeExterne()**
   - Détecte le type `ar_fin_absence`
   - Appelle `onNavigateToAR(demande.reference_id)`

3. **Dashboard.handleNavigateToAR()**
   - Sauvegarde la vue précédente
   - Change la vue vers `'compta/ar'`
   - Passe `{ focus_ar_event: arEventId }` dans viewParams

4. **AccountingDashboard**
   - Reçoit `viewParams`
   - Ouvre automatiquement l'onglet A&R (via `currentView`)
   - Passe `focusArEventId={viewParams?.focus_ar_event}` à ComptabiliteARTab

5. **ComptabiliteARTab.useEffect()**
   - Détecte `focusArEventId` non null
   - Recherche l'événement dans `filteredEvents`
   - Calcule la page de pagination correcte
   - Scroll vers l'élément avec `scrollIntoView()`
   - Surligne la ligne pendant 4 secondes

---

## Cas de Test Manuels

### ✅ Test 1 : Carte A&R visible
1. Accéder à l'Inbox
2. Vérifier la présence de la carte "A&R" avec icône FileText
3. Vérifier que le compteur affiche le bon nombre

### ✅ Test 2 : Filtre A&R fonctionne
1. Cliquer sur le filtre "A&R"
2. Vérifier que seules les notifications de type `ar_fin_absence` s'affichent
3. Vérifier que le compteur dans le filtre est correct

### ✅ Test 3 : Navigation vers A&R
1. Créer une notification A&R dans la base :
```sql
INSERT INTO inbox (utilisateur_id, type, titre, description, reference_id, reference_type, statut, lu)
VALUES (
  '<votre_user_id>',
  'ar_fin_absence',
  'Fin d''absence prochaine',
  'L''absence de Jean DUPONT se termine demain',
  '<un_id_compta_ar_events_existant>',
  'compta_ar_event',
  'nouveau',
  false
);
```
2. Dans l'Inbox, cliquer sur cette notification
3. Vérifier que l'application ouvre Comptabilité > A&R

### ✅ Test 4 : Pagination correcte
1. Si l'événement ciblé est sur la page 3 (par exemple)
2. Vérifier que la pagination change automatiquement vers page 3
3. Vérifier que l'événement est visible sans scroll manuel supplémentaire

### ✅ Test 5 : Scroll et surlignage
1. Après navigation, vérifier que la ligne ciblée est scrollée au centre de l'écran
2. Vérifier que la ligne a un fond orange/ambre pendant environ 4 secondes
3. Vérifier que le surlignage disparaît automatiquement après 4 secondes

### ✅ Test 6 : Types Inbox existants non cassés
1. Vérifier que les notifications "RDV Visite Médicale" fonctionnent toujours
2. Vérifier que les notifications "Demande externe" fonctionnent toujours
3. Vérifier que les tâches fonctionnent toujours

### ✅ Test 7 : Filtres et recherche A&R
1. Après navigation vers A&R, appliquer un filtre de date
2. Vérifier que l'événement ciblé reste visible
3. Vérifier que la ligne reste surlignée

---

## Points Techniques Importants

### 1. Gestion de la pagination
Le code calcule automatiquement la bonne page avec :
```typescript
const targetPage = Math.floor(eventIndex / itemsPerPage) + 1;
setCurrentPage(targetPage);
```

### 2. Timing du scroll
Un `setTimeout(100ms)` est utilisé pour attendre que React ait mis à jour le DOM avec la nouvelle page avant de scroller.

### 3. Déduplication du surlignage
Le `highlightedEventId` est réinitialisé après 4 secondes pour éviter un surlignage permanent.

### 4. Sélecteur CSS robuste
L'attribut `data-ar-event-id` permet de cibler précisément la ligne même si le HTML change.

### 5. Comportement si événement non trouvé
Si `focusArEventId` ne correspond à aucun événement (par exemple après suppression), le code ne fait rien et affiche simplement la page A&R normalement.

---

## Maintenance Future

### Ajouter un nouveau type de notification avec navigation

1. Ajouter le type dans `DemandeExterne` interface
2. Ajouter le compteur dans `TaskStats`
3. Ajouter la condition dans `handleOpenDemandeExterne`
4. Créer une fonction `handleNavigateTo...` dans Dashboard
5. Passer le callback à InboxPage
6. Modifier le composant cible pour gérer le focus

### Personnaliser le surlignage

Modifier la classe CSS dans ComptabiliteARTab ligne 515 :
```typescript
highlightedEventId === event.id
  ? 'bg-gradient-to-r from-orange-100 via-amber-100 to-orange-100 shadow-lg scale-105'
  : ''
```

### Changer la durée du surlignage

Modifier le timeout ligne 99 :
```typescript
setTimeout(() => {
  setHighlightedEventId(null);
}, 4000); // ← changer cette valeur (en ms)
```

---

## Conclusion

L'implémentation est **minimale**, **propre** et **non invasive**. Elle ne casse aucun comportement existant et suit les patterns déjà en place dans l'application (similaire au système RDV Visite Médicale).

Build : ✅ Réussi
TypeScript : ✅ Aucune erreur
Cohérence : ✅ Suit l'architecture existante
