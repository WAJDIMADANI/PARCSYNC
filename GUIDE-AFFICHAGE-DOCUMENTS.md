# Guide d'affichage des documents

## Problème résolu

Les documents affichaient des URLs "credentialless" non fonctionnelles. La solution implémentée génère maintenant des URLs signées correctes pour accéder aux documents stockés dans Supabase Storage.

## Solution mise en place

### 1. Nouvelle fonction utilitaire `resolveDocUrl`

Fichier: `src/lib/documentStorage.ts`

Cette fonction gère intelligemment la résolution des URLs de documents :

```typescript
async function resolveDocUrl(doc: Document): Promise<string>
```

**Fonctionnement :**

1. **Compatibilité rétroactive** : Si `fichier_url` contient déjà une URL HTTP complète, elle est utilisée directement
2. **Résolution moderne** : Sinon, utilise `storage_path` ou déduit le bucket du path
3. **URLs signées** : Génère une URL signée valide 5 minutes pour les buckets privés
4. **Gestion d'erreurs** : Fournit des messages d'erreur clairs en cas de problème

### 2. Composants mis à jour

Les composants suivants utilisent maintenant `resolveDocUrl` :

#### DocumentsManager
- Bouton "Voir le document" utilise `handleViewDocument(doc)`
- Génère une URL signée à la volée lors du clic
- Affiche un message d'erreur clair si le document n'est pas accessible

#### EmployeeList
- Fonction "Envoyer documents par email" résout les URLs avant envoi
- Fallback sur l'ancienne méthode en cas d'erreur

#### ContractValidationPanel
- Affichage du certificat médical et DPAE avec URLs signées
- Fallback automatique en cas d'erreur de résolution

### 3. Structure de données

Les documents supportent maintenant trois formats :

```typescript
interface Document {
  fichier_url?: string;    // Ancien format ou URL complète
  storage_path?: string;   // Nouveau format recommandé
  bucket?: string;         // Optionnel, déduit du path si absent
}
```

### 4. Avantages

✅ **Compatibilité** : Fonctionne avec l'ancien et le nouveau format
✅ **Sécurité** : URLs signées pour buckets privés (expire après 5 min)
✅ **Fiabilité** : Gestion d'erreurs avec fallback automatique
✅ **Performance** : URLs générées à la demande (pas de stockage)
✅ **Simplicité** : Une seule fonction centralisée pour tous les documents

## Utilisation

### Afficher un document

```typescript
import { resolveDocUrl } from '../lib/documentStorage';

const handleViewDocument = async (doc: Document) => {
  try {
    const url = await resolveDocUrl(doc);
    window.open(url, '_blank', 'noopener');
  } catch (error: any) {
    alert(`Impossible d'ouvrir le document: ${error.message}`);
  }
};
```

### Vérifier si c'est un PDF

```typescript
import { isPdfDocument } from '../lib/documentStorage';

if (isPdfDocument(doc)) {
  // Afficher dans un modal ou iframe
} else {
  // Télécharger directement
}
```

## Migration des anciennes données

Les anciennes données avec `fichier_url` continuent de fonctionner. Aucune migration nécessaire immédiatement.

Pour migrer vers le nouveau format (recommandé) :

```sql
UPDATE document
SET
  storage_path = fichier_url,
  bucket = 'documents'
WHERE bucket IS NULL;
```

## Notes importantes

- Les URLs signées expirent après 5 minutes pour des raisons de sécurité
- Pour des URLs publiques permanentes, utilisez des buckets publics
- La fonction détecte automatiquement le bucket depuis le path si non spécifié
