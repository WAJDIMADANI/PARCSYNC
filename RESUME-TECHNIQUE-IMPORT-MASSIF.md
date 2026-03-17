# Résumé technique - Import massif références véhicules

## Architecture

### Base de données

**Nouvelles colonnes** :
```typescript
vehicle_reference_brands {
  source: 'nhtsa' | 'manual'  // default 'manual'
  source_id: string | null     // ID externe NHTSA
}

vehicle_reference_models {
  source: 'nhtsa' | 'manual'
  source_id: string | null
  vehicle_type: string | null  // Type si disponible NHTSA
}
```

**Index** :
- `idx_vehicle_brands_source` sur source
- `idx_vehicle_brands_source_id` sur source_id
- `idx_vehicle_brands_source_unique` unique (source, source_id)

**Déduplication** :
```sql
CREATE UNIQUE INDEX idx_vehicle_brands_source_unique
  ON vehicle_reference_brands(source, source_id)
  WHERE source_id IS NOT NULL;
```

### Edge Function

**Endpoint** : `/functions/v1/import-vehicle-references`

**Auth** :
```typescript
// JWT verification activée
// Permission requise: manage_vehicle_references OU super_admin
const { data: { user } } = await supabase.auth.getUser(token);
const { data: permissions } = await supabase
  .from('user_permissions')
  .select('permission')
  .eq('user_id', user.id);
```

**API NHTSA** :
```typescript
// Get all makes
GET https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json
// Returns: { Results: [{ Make_ID, Make_Name }] }

// Get models by make
GET https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/{makeId}?format=json
// Returns: { Results: [{ Model_ID, Model_Name, Make_ID, VehicleTypeName }] }
```

**Flux** :
1. Fetch all makes from NHTSA
2. Filter existing brands (source='nhtsa')
3. Insert new brands in batches of 100
4. For each make (limited to 50):
   - Fetch models from NHTSA
   - Map to brand_id from DB
   - Filter existing models (source='nhtsa')
   - Insert new models in batches of 100
   - Wait 200ms between API calls

**Rate limiting** :
```typescript
await new Promise(resolve => setTimeout(resolve, 200));
```

**Batch insert** :
```typescript
const BATCH_SIZE = 100;
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await supabase.from('table').insert(batch);
}
```

### Frontend

**Composant** : `src/components/ImportVehicleReferences.tsx`

**États** :
```typescript
interface ImportStats {
  brandsInserted: number;
  brandsSkipped: number;
  modelsInserted: number;
  modelsSkipped: number;
  errors: string[];
}

interface StatusData {
  totalBrands: number;
  totalModels: number;
  nhtsaBrands: number;
  nhtsaModels: number;
}
```

**API calls** :
```typescript
// Get status
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/import-vehicle-references`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: 'status' }),
  }
);

// Launch import
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/import-vehicle-references`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: 'import' }),
  }
);
```

**Routing** :
```typescript
// Dashboard.tsx
case 'admin/import-vehicle-references':
  return <ImportVehicleReferences />;

// Sidebar.tsx
export type View =
  | ...
  | 'admin/import-vehicle-references';

{
  id: 'admin/import-vehicle-references',
  label: 'Import Références Véhicules',
  icon: Database,
  enabled: true
}
```

## Compatibilité

### Modal existant

**VehicleCreateModal.tsx** : Aucune modification nécessaire

Le service `vehicleReferenceService` charge tous les référentiels :
```typescript
const fetchBrands = async () => {
  const data = await vehicleReferenceService.getBrands();
  setBrands(data);
  // Retourne TOUTES les marques (NHTSA + manual)
};
```

Les combobox affichent toutes les sources :
```typescript
{filteredBrands.slice(0, 50).map((brand) => (
  <button onClick={() => handleBrandSelect(brand)}>
    {brand.name}
  </button>
))}
// Affiche marques NHTSA + manuelles sans distinction
```

### Service vehicleReferenceService

**Aucune modification** : Le service est agnostique de la source

```typescript
async getBrands(): Promise<VehicleBrand[]> {
  const { data } = await supabase
    .from('vehicle_reference_brands')
    .select('*')
    .order('name', { ascending: true });
  return data || [];
  // Retourne toutes les marques, source ignorée
}
```

### Coexistence des données

```sql
-- Données NHTSA
INSERT INTO vehicle_reference_brands (name, source, source_id)
VALUES ('Ford', 'nhtsa', '460');

-- Données manuelles
INSERT INTO vehicle_reference_brands (name, source, source_id)
VALUES ('Ma Marque Custom', 'manual', NULL);

-- Les deux s'affichent dans les combobox
```

## Performance

### Timeouts
```typescript
// API NHTSA makes
fetch(url, { signal: AbortSignal.timeout(30000) })

// API NHTSA models
fetch(url, { signal: AbortSignal.timeout(10000) })
```

### Batch processing
```typescript
const BATCH_SIZE = 100;
// Évite les timeouts Supabase
// Meilleure performance d'insertion
```

### Rate limiting
```typescript
await new Promise(resolve => setTimeout(resolve, 200));
// Évite les 429 Too Many Requests de NHTSA
```

### Index optimization
```sql
-- Recherche rapide par source
CREATE INDEX idx_vehicle_brands_source ON vehicle_reference_brands(source);

-- Recherche rapide par source_id
CREATE INDEX idx_vehicle_brands_source_id ON vehicle_reference_brands(source_id);

-- Jointure rapide models -> brands
CREATE INDEX idx_vehicle_models_brand_id ON vehicle_reference_models(brand_id);
```

## Sécurité

### RLS Policies

**Lecture** : Tous les utilisateurs authentifiés
```sql
CREATE POLICY "Authenticated users can view brands"
  ON vehicle_reference_brands
  FOR SELECT
  TO authenticated
  USING (true);
```

**Écriture** : Utilisateurs avec permission
```sql
CREATE POLICY "Users with permission can create brands"
  ON vehicle_reference_brands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
      AND permission = 'manage_vehicle_references'
    )
  );
```

### Edge Function

**JWT verification** : Obligatoire
```typescript
const authHeader = req.headers.get('Authorization');
const token = authHeader.replace('Bearer ', '');
const { data: { user } } = await supabase.auth.getUser(token);
```

**Permission check** :
```typescript
const hasPermission = permissions?.some(
  p => p.permission === 'manage_vehicle_references' || p.permission === 'super_admin'
);

if (!hasPermission) {
  return new Response(
    JSON.stringify({ error: 'Permission denied' }),
    { status: 403 }
  );
}
```

### CORS Headers
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
```

## Monitoring

### Logs Edge Function
```typescript
console.log('[Import] Starting NHTSA vehicle references import...');
console.log(`[Import] Found ${makes.length} makes from NHTSA`);
console.log(`[Import] Inserting ${brandsToInsert.length} new brands...`);
console.log(`[Import] Brands: ${stats.brandsInserted} inserted, ${stats.brandsSkipped} skipped`);
```

### Statistiques retournées
```typescript
{
  success: true,
  stats: {
    brandsInserted: 50,
    brandsSkipped: 100,
    modelsInserted: 1200,
    modelsSkipped: 200,
    errors: [
      'Models for make 123: Timeout',
      'Models batch 500: Connection error'
    ]
  },
  message: 'Import completed: 50 brands, 1200 models inserted'
}
```

### Métriques DB
```sql
-- Compteur par source
SELECT source, COUNT(*) FROM vehicle_reference_brands GROUP BY source;
SELECT source, COUNT(*) FROM vehicle_reference_models GROUP BY source;

-- Dernières données importées
SELECT * FROM vehicle_reference_brands
WHERE source = 'nhtsa'
ORDER BY created_at DESC
LIMIT 10;
```

## Limitations

### Scope actuel
```typescript
// Limité aux 50 premières marques
for (const make of makes.slice(0, 50)) {
```

**Raison** : Éviter les timeouts pour un premier import

**Pour importer toutes les marques** :
```typescript
for (const make of makes) {
  // Temps estimé : 10-20 minutes
}
```

### Rate limiting NHTSA
- Pas de limite stricte documentée
- Délai de 200ms recommandé entre appels
- Timeouts si trop rapide

### Données disponibles
- Principalement marques américaines et internationales
- Certaines marques peuvent manquer de modèles
- `vehicle_type` pas toujours renseigné

## Extension

### Import complet
```typescript
// Modifier la limite
for (const make of makes) {
  // Au lieu de makes.slice(0, 50)
}
```

### Import incrémental
```typescript
// Ajouter une colonne last_synced_at
// Ne fetch que les nouveaux/modifiés
WHERE last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '30 days'
```

### Autres sources
```typescript
// Ajouter d'autres sources
source: 'renault' | 'psa' | 'custom'
```

### Webhook automatique
```sql
-- Cron job Supabase
SELECT cron.schedule(
  'import-vehicle-references-monthly',
  '0 0 1 * *', -- Premier jour du mois à minuit
  $$
  SELECT net.http_post(
    url := 'https://PROJECT.supabase.co/functions/v1/import-vehicle-references',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body := '{"mode": "import"}'::jsonb
  );
  $$
);
```

## Queries utiles

### Recherche de marque
```sql
SELECT * FROM vehicle_reference_brands
WHERE name ILIKE '%ford%'
ORDER BY name;
```

### Modèles d'une marque
```sql
SELECT m.*
FROM vehicle_reference_models m
JOIN vehicle_reference_brands b ON m.brand_id = b.id
WHERE b.name = 'Ford'
ORDER BY m.name;
```

### Statistiques détaillées
```sql
SELECT
  b.name as brand,
  COUNT(m.id) as model_count,
  b.source
FROM vehicle_reference_brands b
LEFT JOIN vehicle_reference_models m ON b.id = m.brand_id
WHERE b.source = 'nhtsa'
GROUP BY b.id, b.name, b.source
ORDER BY model_count DESC
LIMIT 20;
```

### Données orphelines
```sql
-- Modèles sans marque (ne devrait pas arriver)
SELECT * FROM vehicle_reference_models m
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_reference_brands b
  WHERE b.id = m.brand_id
);
```

### Doublons potentiels
```sql
-- Marques en double (ignorer la casse)
SELECT LOWER(name) as name_lower, COUNT(*)
FROM vehicle_reference_brands
GROUP BY LOWER(name)
HAVING COUNT(*) > 1;
```

## Stack technique

- **Backend** : Supabase Edge Functions (Deno)
- **Frontend** : React + TypeScript
- **Base de données** : PostgreSQL avec RLS
- **API externe** : NHTSA vPIC
- **Style** : Tailwind CSS
- **Icons** : Lucide React

## Build

```bash
npm run build
# ✓ built in 19.29s
# dist/assets/index-B9hddFB5.js: 4,725.20 kB
```

Aucune erreur TypeScript, build réussi.

---

**Version** : 1.0
**Date** : 2026-03-17
**Status** : ✅ Production ready
