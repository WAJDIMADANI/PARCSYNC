# Fix UUID Empty String Error

## Problème résolu
Erreur "invalid input syntax for type uuid: ''" lors de la modification d'un candidat/vivier, particulièrement après l'upload de documents.

## Cause
Les champs `site_id` et `secteur_id` (type UUID nullable) recevaient des chaînes vides `""` au lieu de `null` quand l'utilisateur sélectionnait "Aucun" dans les selects.

## Solution implémentée

### 1. Nouveau helper (`src/utils/uuidHelper.ts`)
```typescript
// Convertit les chaînes vides en null pour les UUID
uuidOrNull(value: string | null | undefined): string | null

// Sanitize plusieurs champs UUID dans un objet
sanitizeUuidFields(data, uuidFields)
```

### 2. Modifications dans CandidateList.tsx
- Import du helper `sanitizeUuidFields`
- Initialisation de `site_id` et `secteur_id` avec `null` au lieu de `""`
- Les selects utilisent maintenant `value={formData.site_id ?? ""}` pour l'affichage
- Les onChange mettent `null` au lieu de `""` : `e.target.value || null`
- Sanitization des données avant update/insert avec `sanitizeUuidFields(formData, ['site_id', 'secteur_id'])`
- Appliqué dans :
  - Modal de modification candidat
  - Modal de conversion candidat → employé

### 3. Modifications dans VivierList.tsx
- Mêmes corrections que CandidateList.tsx
- Sanitization avant update du candidat

## Fichiers modifiés
- `src/utils/uuidHelper.ts` (nouveau)
- `src/components/CandidateList.tsx`
- `src/components/VivierList.tsx`

## Test
1. Ouvrir l'onglet Candidats ou Vivier
2. Modifier un candidat
3. Sélectionner "Aucun" pour Site ou Secteur
4. Uploader un document
5. Enregistrer
6. ✅ Plus d'erreur UUID

## Build
✅ Build réussi sans erreur
