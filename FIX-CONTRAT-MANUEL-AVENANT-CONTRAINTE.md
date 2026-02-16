# FIX : Contrainte avenant_num bloque contrat manuel

## Problème
```
new row for relation "contrat" violates check constraint "contrat_avenant_num_chk"
```

## Cause
La contrainte CHECK sur `avenant_num` bloquait l'insertion car la colonne n'était pas renseignée.

## Solution (2 corrections)

### 1. SQL - Corriger la contrainte
Exécutez dans **Supabase SQL Editor** :
```
FIX-CONTRAT-MANUEL-AVENANT-NUM.sql
```

Cela permet `avenant_num = NULL` pour les contrats normaux.

### 2. Code - Ajouter les champs manquants
Le code a été corrigé pour inclure :
- `type_document: 'contrat'`
- `avenant_num: null`

## Test

1. Rafraîchir l'app
2. Modal salarié → "Ajouter contrat manuel"
3. Remplir + uploader PDF
4. **Ça devrait fonctionner maintenant**

## Fichiers modifiés
- `FIX-CONTRAT-MANUEL-AVENANT-NUM.sql` - Correction SQL
- `src/components/ManualContractUploadModal.tsx` - Ajout champs

Build OK
