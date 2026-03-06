# Carte et filtre RDV Visite Médicale dans l'Inbox

## Nouveautés

### 1. Carte statistique dédiée RDV Visite Médicale

Une nouvelle carte statistique a été ajoutée dans le dashboard de l'Inbox, à côté des cartes "Total", "En attente", "En cours" et "Complétées".

**Caractéristiques:**
- Design orange/ambre avec bordure et anneau pour la faire ressortir
- Icône calendrier
- Affiche le nombre de notifications RDV actives
- Bordure orange animée au survol

**Position:**
5ème carte dans la grille (après "Complétées")

### 2. Filtre RDV Visite Médicale

Un nouveau bouton de filtre a été ajouté dans la barre de filtres, après "Complétées".

**Caractéristiques:**
- Bouton avec icône calendrier
- Couleur orange/ambre quand inactif (pour se distinguer des autres filtres gris)
- Gradient orange intense quand actif
- Affiche le nombre de RDV entre parenthèses

**Fonctionnalité:**
Quand vous cliquez sur ce filtre, seules les notifications de type `rdv_visite_medicale` sont affichées dans la liste.

## Aperçu visuel

### Dashboard avec la nouvelle carte RDV

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Boîte de Réception                              [+ Nouvelle tâche]     │
├─────────┬─────────┬─────────┬─────────┬───────────────────────────────┐
│ Total   │ En      │ En cours│ Complét.│ 🎯 RDV Visite Médicale       │
│   15    │ attente │    3    │    5    │         2                     │
│         │    5    │         │         │  [Carte orange mise en avant] │
└─────────┴─────────┴─────────┴─────────┴───────────────────────────────┘
```

### Barre de filtres

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Toutes (15)] [En attente (5)] [En cours (3)] [Complétées (5)]      │
│ [📅 RDV Visite Médicale (2)] ← Nouveau filtre orange                │
└──────────────────────────────────────────────────────────────────────┘
```

## Détails techniques

### Modifications apportées

**1. Interface `TaskStats`**
```typescript
interface TaskStats {
  en_attente: number;
  en_cours: number;
  completee: number;
  total: number;
  non_lus: number;
  rdv_visite_medicale: number;  // ← Nouveau
}
```

**2. Type du filtre étendu**
```typescript
const [filter, setFilter] = useState<
  'all' | 'en_attente' | 'en_cours' | 'completee' | 'rdv_visite_medicale'  // ← Nouveau
>('all');
```

**3. Calcul du compteur RDV**
```typescript
const rdvVisiteMedicaleCount = formattedDemandes.filter(
  d => d.type === 'rdv_visite_medicale'
).length;
```

**4. Logique de filtrage**
```typescript
const filteredItems = filter === 'all'
  ? inboxItems
  : filter === 'rdv_visite_medicale'
  ? inboxItems.filter(item =>
      item.itemType === 'demande_externe' && item.type === 'rdv_visite_medicale'
    )
  : inboxItems.filter(item =>
      item.itemType === 'tache' && item.statut === filter
    );
```

**5. Composant StatCard mis à jour**
Nouveau prop `highlight` pour mettre en valeur la carte RDV:
```typescript
<StatCard
  label="RDV Visite Médicale"
  value={stats.rdv_visite_medicale}
  icon={<Calendar className="w-10 h-10 text-orange-500" />}
  highlight={true}  // ← Active le style orange
/>
```

**6. Composant FilterButton mis à jour**
Nouveau prop `rdv` pour le style orange du filtre RDV:
```typescript
<FilterButton
  active={filter === 'rdv_visite_medicale'}
  onClick={() => setFilter('rdv_visite_medicale')}
  rdv={true}  // ← Style orange même quand inactif
>
  <Calendar className="w-4 h-4 inline mr-1" />
  RDV Visite Médicale ({stats.rdv_visite_medicale})
</FilterButton>
```

## Layout responsive

### Desktop (≥768px)
- Grille 5 colonnes pour les cartes stats
- Tous les filtres sur une ligne

### Mobile (<768px)
- Cartes empilées verticalement
- Filtres wrappent sur plusieurs lignes
- La carte RDV reste mise en valeur avec sa bordure orange

## Utilisation

### Voir toutes les notifications RDV
1. Aller dans "Boîte de Réception"
2. Observer le nombre de RDV dans la carte orange en haut
3. Cliquer sur le filtre "📅 RDV Visite Médicale"
4. Seules les notifications RDV sont affichées

### Voir les détails d'un RDV
1. Cliquer sur une notification RDV (fond orange dans la liste)
2. Le modal s'ouvre avec:
   - Infos du salarié
   - Date et heure du RDV
   - Badge d'urgence si applicable
   - Bouton "Voir le profil"

## Combinaison avec d'autres fonctionnalités

### Compteur non lus
Les notifications RDV non lues sont comptabilisées dans le badge "X non lus" en haut de la page.

### Tri
Les notifications RDV sont triées par date de création (les plus récentes en premier) comme les autres messages.

### Pagination
Le filtre RDV respecte la pagination de 10 éléments par page.

### Temps réel
Les notifications RDV créées par le CRON ou le trigger apparaissent immédiatement grâce à l'abonnement Supabase Realtime.

## Couleurs et design

### Palette RDV
- Carte stats: `from-orange-50 to-amber-50` avec bordure `border-orange-300`
- Icône: `text-orange-500`
- Texte: `text-orange-700` / `text-orange-800`
- Filtre inactif: `from-orange-100 to-amber-100 text-orange-700`
- Filtre actif: `from-orange-500 via-amber-500 to-orange-600 text-white`

### Contraste avec les autres éléments
- Tâches: Gris/Orange standard
- Demandes externes: Rose/Rose
- RDV: Orange/Ambre (distinct et facilement identifiable)

## Prochaines améliorations possibles

1. **Tri par date de RDV** - Trier les RDV par date du rendez-vous au lieu de date de création
2. **Badge urgence dans la liste** - Afficher "AUJOURD'HUI" / "DEMAIN" directement dans la liste
3. **Calendrier visuel** - Vue calendrier des RDV à venir
4. **Export** - Exporter la liste des RDV au format CSV/PDF
5. **Rappels personnalisés** - Permettre aux utilisateurs de personnaliser quand ils veulent être notifiés

## Notes

- La carte RDV compte **toutes** les notifications RDV (ouvertes ET traitées)
- Le filtre affiche **toutes** les notifications RDV peu importe leur statut
- Pour compter uniquement les RDV ouverts, il faudrait filtrer sur `statut === 'ouvert'`
