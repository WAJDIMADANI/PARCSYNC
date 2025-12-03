# Correction du Problème d'Encodage - Import en Masse

## Problème Identifié

Lors de l'import en masse de salariés, la colonne "Prénom" n'était pas détectée à cause d'un problème d'encodage des caractères. Le "é" de "Prénom" était remplacé par "�" (caractère de remplacement Unicode), ce qui empêchait le mapping automatique des colonnes.

### Symptômes
- La colonne "prenom" n'apparaissait pas dans le mapping
- Les prénoms des salariés n'étaient pas importés
- Message dans la console : `DEBUG: Column mapping:` ne listait pas "prenom"

## Solutions Implémentées

### 1. Ajout de Variantes avec Encodage Cassé

Ajout de variantes reconnues pour chaque colonne sensible :
- `'prenom'`: `'Pr�nom'`, `'Pr�Nom'`, `'Pr�NOM'`
- `'email'`: `'E�mail'`
- `'nationalite'`: `'Nationalit�'`
- Et toutes les autres colonnes avec accents

### 2. Détection Intelligente par Similarité

Implémentation d'un algorithme de similarité de texte qui :
- Compare les noms de colonnes même avec des caractères corrompus
- Match automatiquement les colonnes avec plus de 75% de similarité
- Affiche un avertissement pour les mappings approximatifs

### 3. Alertes Visuelles

Affichage d'alertes claires dans l'interface :

#### Colonnes Non Mappées (Rouge)
- Liste des colonnes importantes non détectées
- Suggestions de solutions :
  1. Télécharger et utiliser le modèle CSV
  2. Vérifier l'encodage UTF-8
  3. Réenregistrer en CSV UTF-8
  4. Vérifier les noms de colonnes

#### Mappings Approximatifs (Orange)
- Liste des colonnes détectées par similarité
- Pourcentage de similarité affiché
- Recommandation de vérifier les données

### 4. Amélioration du Parsing Excel

Configuration optimisée du parser XLSX :
```typescript
XLSX.read(buffer, {
  type: 'array',
  codepage: 65001,  // Force UTF-8
  cellDates: true,
  cellNF: false,
  cellText: false
})
```

### 5. Logs Console Améliorés

Ajout de logs détaillés pour le débogage :
- ✅ Mapping réussi des colonnes
- ⚠️ Colonnes non mappées importantes
- ℹ️ Mappings approximatifs détectés

## Fichiers Modifiés

- `/src/components/ImportSalariesBulk.tsx`
  - Fonction `calculateSimilarity()` (nouvelle)
  - Fonction `createColumnMapper()` (améliorée)
  - Ajout états `unmappedColumns` et `mappingWarnings`
  - Nouveaux composants d'alerte visuelle
  - Amélioration du parsing Excel/CSV

## Comment Tester

1. **Tester avec un fichier avec encodage cassé :**
   - Uploader le fichier Excel actuel avec "Pr�nom"
   - Vérifier que la colonne est maintenant détectée
   - Vérifier dans la console que le mapping fonctionne

2. **Tester avec un fichier correct :**
   - Télécharger le modèle CSV
   - Remplir avec des données
   - Uploader et vérifier que tout est détecté

3. **Tester les alertes visuelles :**
   - Créer un fichier avec une colonne manquante (ex: pas de "Prénom")
   - Vérifier qu'une alerte rouge apparaît
   - Vérifier que les solutions sont affichées

## Prévention Future

Pour éviter ce problème à l'avenir :

1. **Toujours utiliser le modèle CSV fourni**
   - Il est encodé en UTF-8 avec BOM (`\uFEFF`)
   - Garantit le bon encodage des caractères

2. **Vérifier l'encodage avant l'export depuis Excel**
   - Utiliser "Enregistrer sous" → "CSV UTF-8 (délimité par des virgules)"
   - Ne PAS utiliser "CSV (délimité par des virgules)" classique

3. **Utiliser LibreOffice Calc pour les conversions**
   - Meilleure gestion de l'encodage UTF-8
   - Option d'encodage visible lors de l'export

## Résultat

✅ Le système détecte maintenant les colonnes avec encodage cassé
✅ Alertes visuelles claires pour les problèmes de mapping
✅ Détection intelligente par similarité comme backup
✅ Meilleure expérience utilisateur avec solutions proposées
✅ Logs détaillés pour le débogage
