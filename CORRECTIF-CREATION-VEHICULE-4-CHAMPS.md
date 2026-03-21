# Correctif : Champs vides lors de la création de véhicule

## Problème constaté

Lors de l'ajout d'un véhicule (ex: AZ123EY), les champs suivants restent vides même après les avoir remplis :
- finition
- energie
- couleur

**Exemple** :
```
Utilisateur remplit :
  finition = "BUSINESS"
  energie  = "Diesel"
  couleur  = "BLANC"

Résultat en BDD :
  finition = null (ou vide)
  energie  = null (ou vide)
  couleur  = null (ou vide)
```

## Diagnostic

### Fichier concerné
`src/components/VehicleCreateModal.tsx`

### Cause du bug

**Ligne 395** (avant correctif) :
```typescript
const textFields = ['fournisseur', 'financeur_nom', ...,'mode_acquisition'];
```

Les champs `finition`, `energie`, `couleur` n'étaient **PAS inclus** dans la liste `textFields`.

**Conséquence** :
- La fonction `cleanPayloadForInsert` ne traitait pas ces 3 champs
- Si les champs étaient des chaînes vides `''`, ils restaient `''` au lieu de devenir `null`
- Si les champs avaient des valeurs, les surcharges explicites (lignes 440-442) créaient une redondance inutile

**Lignes 443-447** (avant correctif) :
```typescript
const vehicleData = cleanPayloadForInsert({
  ...formData,
  finition: formData.finition || null,   // ← Surcharge redondante
  energie: formData.energie || null,     // ← Surcharge redondante
  couleur: formData.couleur || null,     // ← Surcharge redondante
  proprietaire_carte_grise: formattedProprietaire,
  ...
});
```

Ces surcharges étaient une tentative de corriger le problème, mais elles ne réglaient pas la cause racine.

## Solution appliquée

### 1. Ajout des 3 champs à `textFields`

**Ligne 395 (après correctif)** :
```typescript
const textFields = [
  'finition',        // ← AJOUTÉ
  'energie',         // ← AJOUTÉ
  'couleur',         // ← AJOUTÉ
  'fournisseur',
  'financeur_nom',
  'financeur_adresse',
  'financeur_code_postal',
  'financeur_ville',
  'financeur_telephone',
  'mode_acquisition'
];
```

**Effet** :
- `cleanPayloadForInsert` convertit maintenant les chaînes vides en `null` pour ces 3 champs
- Les valeurs remplies sont correctement conservées

### 2. Suppression des surcharges redondantes

**Lignes 443-449 (après correctif)** :
```typescript
const vehicleData = cleanPayloadForInsert({
  ...formData,  // ← finition, energie, couleur sont maintenant traités par cleanPayloadForInsert
  proprietaire_carte_grise: formattedProprietaire,
  derniere_maj_kilometrage: formData.kilometrage_actuel ? new Date().toISOString().split('T')[0] : null,
  materiel_embarque: equipments.filter(eq => eq.type && eq.quantite > 0),
  photo_path: photoPath,
});
```

**Effet** :
- Code plus propre et cohérent
- Évite les surcharges inutiles
- Tous les champs texte sont gérés de manière uniforme

### 3. Ajout de logs de diagnostic

**Lignes 438-441** :
```typescript
console.log('[CREATION] formData.finition:', formData.finition);
console.log('[CREATION] formData.energie:', formData.energie);
console.log('[CREATION] formData.couleur:', formData.couleur);
console.log('[CREATION] formData.mode_acquisition:', formData.mode_acquisition);
```

**Lignes 451-456** :
```typescript
console.log('[CREATION] vehicleData après cleanPayloadForInsert:', {
  finition: vehicleData.finition,
  energie: vehicleData.energie,
  couleur: vehicleData.couleur,
  mode_acquisition: vehicleData.mode_acquisition
});
```

**Effet** :
- Permet de tracer les valeurs avant et après `cleanPayloadForInsert`
- Facilite le débogage en cas de problème futur

## Comportement attendu après correctif

### Scénario 1 : Utilisateur remplit les 3 champs

**Input** :
```
finition = "BUSINESS"
energie  = "Diesel"
couleur  = "BLANC"
```

**Traitement** :
```
formData.finition = "BUSINESS"
→ cleanPayloadForInsert : "BUSINESS" (non vide, conservé)
→ BDD : "BUSINESS" ✅
```

**Console** :
```
[CREATION] formData.finition: BUSINESS
[CREATION] formData.energie: Diesel
[CREATION] formData.couleur: BLANC
[CREATION] vehicleData après cleanPayloadForInsert: {
  finition: "BUSINESS",
  energie: "Diesel",
  couleur: "BLANC",
  mode_acquisition: "LOA"
}
```

### Scénario 2 : Utilisateur laisse les champs vides

**Input** :
```
finition = ""
energie  = ""
couleur  = ""
```

**Traitement** :
```
formData.finition = ""
→ cleanPayloadForInsert : null (chaîne vide convertie)
→ BDD : null ✅
```

**Console** :
```
[CREATION] formData.finition:
[CREATION] formData.energie:
[CREATION] formData.couleur:
[CREATION] vehicleData après cleanPayloadForInsert: {
  finition: null,
  energie: null,
  couleur: null,
  mode_acquisition: "LOA"
}
```

## Test manuel

Pour tester le correctif :

1. Ouvrir le formulaire de création de véhicule
2. Remplir les champs :
   - Finition : "BUSINESS"
   - Énergie : "Diesel"
   - Couleur : "BLANC"
3. Soumettre le formulaire
4. Vérifier dans la console :
   ```
   [CREATION] formData.finition: BUSINESS
   [CREATION] formData.energie: Diesel
   [CREATION] formData.couleur: BLANC
   [CREATION] vehicleData après cleanPayloadForInsert: {
     finition: "BUSINESS",
     energie: "Diesel",
     couleur: "BLANC",
     ...
   }
   ```
5. Ouvrir le véhicule créé dans le modal détail
6. Vérifier que les 3 champs affichent bien les valeurs

**Requête SQL de vérification** :
```sql
SELECT immatriculation, finition, energie, couleur
FROM vehicule
WHERE immatriculation = 'AZ123EY';
```

**Résultat attendu** :
```
immatriculation | finition  | energie | couleur
----------------|-----------|---------|--------
AZ123EY         | BUSINESS  | Diesel  | BLANC
```

## Fichiers modifiés

**1 fichier modifié** : `src/components/VehicleCreateModal.tsx`

**Modifications** :

1. **Ligne 395** : Ajout de `finition`, `energie`, `couleur` à `textFields`
   ```typescript
   const textFields = ['finition', 'energie', 'couleur', ...];
   ```

2. **Lignes 438-441** : Ajout de logs de diagnostic (avant cleanPayloadForInsert)
   ```typescript
   console.log('[CREATION] formData.finition:', formData.finition);
   console.log('[CREATION] formData.energie:', formData.energie);
   console.log('[CREATION] formData.couleur:', formData.couleur);
   console.log('[CREATION] formData.mode_acquisition:', formData.mode_acquisition);
   ```

3. **Lignes 443-449** : Suppression des surcharges redondantes
   ```typescript
   // AVANT :
   const vehicleData = cleanPayloadForInsert({
     ...formData,
     finition: formData.finition || null,  // ← supprimé
     energie: formData.energie || null,    // ← supprimé
     couleur: formData.couleur || null,    // ← supprimé
     ...
   });

   // APRÈS :
   const vehicleData = cleanPayloadForInsert({
     ...formData,  // ← finition, energie, couleur traités automatiquement
     ...
   });
   ```

4. **Lignes 451-456** : Ajout de logs de diagnostic (après cleanPayloadForInsert)
   ```typescript
   console.log('[CREATION] vehicleData après cleanPayloadForInsert:', {
     finition: vehicleData.finition,
     energie: vehicleData.energie,
     couleur: vehicleData.couleur,
     mode_acquisition: vehicleData.mode_acquisition
   });
   ```

## Build

```
✓ built in 19.45s
```

Aucune erreur. Prêt pour déploiement.

## Bilan

**Bug identifié** : ✅ `finition`, `energie`, `couleur` absents de `textFields`

**Correctif appliqué** : ✅ Ajout des 3 champs + suppression surcharges redondantes

**Logs ajoutés** : ✅ Traçabilité complète

**Fichiers modifiés** : ✅ 1 seul (VehicleCreateModal.tsx)

**Build** : ✅ OK (19.45s)

**Prêt pour déploiement** : ✅ OUI

---

## Note importante

Ce correctif concerne uniquement la **création** de véhicules. Le correctif précédent dans `DIAGNOSTIC-AUDIT-4-CHAMPS.md` concernait l'**affichage** des véhicules existants dans le modal détail.

**Les deux correctifs sont complémentaires** :
- Création : `VehicleCreateModal.tsx` (ce fichier)
- Affichage : `VehicleDetailModal.tsx` (fichier précédent)
