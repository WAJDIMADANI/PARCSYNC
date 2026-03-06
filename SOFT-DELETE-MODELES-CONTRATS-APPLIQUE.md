# Soft Delete des Modèles de Contrats - Implémenté

## Objectif
Remplacer la suppression physique des modèles de contrats par une désactivation logique pour préserver l'historique et la compatibilité avec les contrats existants.

## Changements Appliqués

### 1. Prérequis Base de Données
La colonne `is_active` de type `boolean` avec valeur par défaut `true` doit exister dans la table `public.modeles_contrats`.

### 2. Fichiers Modifiés

#### A. `src/components/ContractTemplates.tsx` (Page Admin des Modèles)

**Interface mise à jour**
```typescript
interface ContractTemplate {
  id: string;
  nom: string;
  type_contrat: string;
  fichier_url: string;
  fichier_nom: string;
  variables: ContractVariables;
  created_at: string;
  is_active: boolean;  // ✅ Ajouté
}
```

**Imports ajoutés**
```typescript
import { RotateCcw, Ban, CheckCircle } from 'lucide-react';
```

**Suppression physique SUPPRIMÉE**
- Fonction `handleDelete()` SUPPRIMÉE complètement
- Ne touche plus au storage
- Ne fait plus de `.delete()` sur la table

**Nouvelles fonctions**

1. **Désactivation logique**
```typescript
const handleDeactivate = async (id: string) => {
  if (!confirm('Désactiver ce modèle ? Il ne sera plus disponible pour créer de nouveaux contrats, mais les contrats existants resteront accessibles.')) return;

  try {
    const { error } = await supabase
      .from('modeles_contrats')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    alert('Modèle désactivé avec succès');
    loadTemplates();
  } catch (error) {
    console.error('Erreur lors de la désactivation:', error);
    alert('Erreur : Impossible de désactiver le modèle. Veuillez réessayer.');
  }
};
```

2. **Réactivation**
```typescript
const handleReactivate = async (id: string) => {
  if (!confirm('Réactiver ce modèle ? Il sera à nouveau disponible pour créer de nouveaux contrats.')) return;

  try {
    const { error } = await supabase
      .from('modeles_contrats')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;

    alert('Modèle réactivé avec succès');
    loadTemplates();
  } catch (error) {
    console.error('Erreur lors de la réactivation:', error);
    alert('Erreur : Impossible de réactiver le modèle. Veuillez réessayer.');
  }
};
```

**Affichage des cartes de modèles**
- Badge "Actif" (vert) ou "Inactif" (gris) selon le statut
- Modèles inactifs affichés avec fond grisé
- Bouton "Désactiver" (icône Ban) pour les modèles actifs
- Bouton "Réactiver" (icône RotateCcw) pour les modèles inactifs
- TOUS les modèles restent visibles dans la liste admin

**Style conditionnel**
```typescript
className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow ${
  template.is_active ? 'border-slate-200' : 'border-slate-300 bg-slate-50'
}`}
```

#### B. `src/components/ContractSendModal.tsx` (Création de Contrats)

**Filtre ajouté**
```typescript
// AVANT
supabase.from('modeles_contrats').select('*').order('nom')

// APRÈS
supabase.from('modeles_contrats').select('*').eq('is_active', true).order('nom')
```

**Impact**
- Seuls les modèles actifs apparaissent dans la liste de sélection
- Les contrats existants liés à des modèles inactifs continuent de fonctionner

#### C. `src/components/ManualContractUploadModal.tsx` (Upload Manuel de Contrats)

**Filtre ajouté**
```typescript
// AVANT
supabase
  .from('modeles_contrats')
  .select('id, nom, type_contrat')
  .order('type_contrat, nom')

// APRÈS
supabase
  .from('modeles_contrats')
  .select('id, nom, type_contrat')
  .eq('is_active', true)
  .order('type_contrat, nom')
```

**Impact**
- Seuls les modèles actifs disponibles pour l'upload manuel
- Formulaire simplifié sans modèles obsolètes

### 3. Fichiers NON Modifiés (Volontairement)

#### `src/components/ContractsList.tsx`
**Raison** : Charge les modèles liés aux contrats existants via `.in('id', modeleIds)`
- Doit pouvoir afficher TOUS les modèles, y compris inactifs
- Préserve l'historique complet des contrats

#### `src/components/ContractViewModal.tsx`
**Raison** : Charge un modèle spécifique via `.eq('id', contractData.modele_id)`
- Doit pouvoir afficher les contrats historiques
- Pas de restriction nécessaire

## Comportement Final

### Pour les Administrateurs (Page Modèles)
1. Tous les modèles sont visibles (actifs ET inactifs)
2. Badge coloré indique clairement le statut
3. Bouton "Désactiver" pour les modèles actifs
4. Bouton "Réactiver" pour les modèles inactifs
5. Confirmation avant chaque action
6. Message de succès clair après l'action

### Pour les Utilisateurs (Création de Contrats)
1. Seuls les modèles actifs apparaissent dans les listes déroulantes
2. Les anciens contrats restent accessibles et affichent leur modèle (même inactif)
3. Aucune perte de données historiques

### Messages Utilisateur
- **Désactivation** : "Modèle désactivé avec succès"
- **Réactivation** : "Modèle réactivé avec succès"
- **Erreur désactivation** : "Erreur : Impossible de désactiver le modèle. Veuillez réessayer."
- **Erreur réactivation** : "Erreur : Impossible de réactiver le modèle. Veuillez réessayer."

## Avantages de cette Approche

1. **Préservation de l'historique**
   - Les contrats existants restent liés à leur modèle d'origine
   - Pas de rupture de références en base

2. **Traçabilité complète**
   - Tous les modèles restent visibles pour les admins
   - Audit trail complet

3. **Réversibilité**
   - Un modèle désactivé peut être réactivé à tout moment
   - Pas de perte définitive

4. **Sécurité des données**
   - Aucune suppression physique
   - Pas de risque de cascade delete
   - Les fichiers storage restent intacts

5. **UX claire**
   - Badge visuel immédiat du statut
   - Actions distinctes et explicites
   - Messages de confirmation et de succès

## Tests Recommandés

### Test 1 : Désactivation d'un modèle actif
1. Aller dans "Modèles de Contrats"
2. Cliquer sur l'icône Ban (désactiver) d'un modèle actif
3. Confirmer
4. **Vérifier** : Badge passe à "Inactif", fond devient grisé, bouton devient "Réactiver"

### Test 2 : Modèle désactivé n'apparaît plus dans les formulaires
1. Désactiver un modèle
2. Aller dans "Contrats" → "Nouveau contrat"
3. **Vérifier** : Le modèle désactivé n'apparaît pas dans la liste

### Test 3 : Contrats existants restent accessibles
1. Créer un contrat avec un modèle
2. Désactiver le modèle
3. Retourner voir le contrat créé
4. **Vérifier** : Le contrat s'affiche correctement avec le nom du modèle

### Test 4 : Réactivation
1. Cliquer sur l'icône RotateCcw d'un modèle inactif
2. Confirmer
3. **Vérifier** : Badge redevient "Actif", modèle disponible dans les formulaires

### Test 5 : Upload manuel avec modèles filtrés
1. Désactiver un modèle
2. Aller dans upload manuel de contrat
3. **Vérifier** : Le modèle désactivé n'apparaît pas dans la liste

## Base de Données

Si la colonne `is_active` n'existe pas encore, exécuter :

```sql
-- Ajouter la colonne is_active si elle n'existe pas
ALTER TABLE public.modeles_contrats
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Mettre à jour les modèles existants pour être actifs par défaut
UPDATE public.modeles_contrats
SET is_active = true
WHERE is_active IS NULL;
```

## Migration Complète

Aucune migration de données nécessaire :
- Tous les modèles existants sont considérés actifs par défaut
- La colonne `is_active` doit être ajoutée en base (voir ci-dessus)
- Le code frontend gère automatiquement le reste

## Résultat

✅ Suppression physique complètement retirée
✅ Désactivation/réactivation logique implémentée
✅ Interface claire avec badges et boutons distincts
✅ Filtres corrects dans tous les formulaires de création
✅ Historique préservé pour tous les contrats
✅ Messages utilisateur clairs et explicites
✅ Build réussi sans erreurs

---

**Date d'implémentation** : 2025-03-06
**Fichiers modifiés** : 3
**Fonctions ajoutées** : 2 (handleDeactivate, handleReactivate)
**Fonctions supprimées** : 1 (handleDelete)
