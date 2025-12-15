# ✅ Correction Dashboard RH - Utilisation des RPC

## Problème

Le Dashboard RH affichait **7 CDD** au lieu de **0** car il utilisait la vue SQL `v_incidents_contrats_affichables` avec une logique différente du reste de l'application.

## Solution

Remplacement des appels à `v_incidents_contrats_affichables` par les nouvelles fonctions RPC dans les deux endroits du Dashboard.

### 1. Dans `fetchNotificationsStats()` (ligne 343)

**Avant :**
```typescript
const { data: contratsIncidents } = await supabase
  .from('v_incidents_contrats_affichables')
  .select('contrat_type');

const contrat_cdd = contratsIncidents?.filter(c =>
  c.contrat_type?.toLowerCase() === 'cdd'
).length || 0;
```

**Après :**
```typescript
const { data: cddData } = await supabase.rpc('get_cdd_expires');

const contrat_cdd = cddData?.length || 0;
```

### 2. Dans `fetchIncidentsStats()` (ligne 399)

**Avant :**
```typescript
const { data: contratsIncidents } = await supabase
  .from('v_incidents_contrats_affichables')
  .select('id, type, created_at, profil_id, contrat_type');
```

**Après :**
```typescript
// Récupérer les CDD expirés
const { data: cddData } = await supabase.rpc('get_cdd_expires');

// Récupérer les avenants expirés
const { data: avenantsData } = await supabase.rpc('get_avenants_expires');

// Transformer en format incident
const cddIncidents = (cddData || []).map(cdd => ({
  id: `cdd-${cdd.profil_id}-${cdd.contrat_id}`,
  type: 'contrat_expire',
  created_at: new Date().toISOString(),
  profil_id: cdd.profil_id,
  contrat_type: 'CDD'
}));

const avenantsIncidents = (avenantsData || []).map(av => ({
  id: `avenant-${av.profil_id}-${av.contrat_id}`,
  type: 'contrat_expire',
  created_at: new Date().toISOString(),
  profil_id: av.profil_id,
  contrat_type: 'Avenant'
}));

const contratsIncidents = [...cddIncidents, ...avenantsIncidents];
```

## Résultat

### Avant
- Dashboard : **7 CDD** (incorrect)
- Page Incidents : **9 CDD** (incorrect)
- Incohérence entre les pages

### Après
- Dashboard : **0 CDD** (correct)
- Page Incidents : **0 CDD** (correct)
- Cohérence totale avec la même logique partout

## Impact

Le Dashboard RH affiche maintenant :
- Les bons compteurs pour les CDD qui vont expirer (30 prochains jours)
- Les bons compteurs pour les avenants expirés
- Un total d'incidents cohérent avec la page "Gestion des incidents"
- Une notification "Contrats CDD" correcte

## Architecture finale

```
Dashboard RH
  ├─→ fetchNotificationsStats()
  │    └─→ get_cdd_expires() ✅
  │
  └─→ fetchIncidentsStats()
       ├─→ get_cdd_expires() ✅
       └─→ get_avenants_expires() ✅

Page Incidents
  ├─→ get_cdd_expires() ✅
  └─→ get_avenants_expires() ✅

Logique identique partout = Résultats cohérents
```

## Note technique

La vue `v_incidents_contrats_affichables` n'est plus utilisée nulle part dans le code React. Elle reste en base de données mais pourrait être supprimée dans une future migration.
