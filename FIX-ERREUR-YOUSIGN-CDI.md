# Fix erreur Yousign pour les CDI

## Problème identifié

**Erreur :** `"Yousign error: DOCX download failed: 400 Bad Request"`

Cette erreur se produit uniquement pour les contrats CDI quand on utilise le bouton **"Renvoyer"** (vert).

## Cause

La fonction `create-yousign-signature` essaie de télécharger un fichier DOCX à partir de l'URL stockée dans `contract.modele.fichier_url`.

Pour les CDI, cette URL retourne une erreur 400 Bad Request parce que :
1. L'URL est incorrectement formatée (URL relative au lieu d'URL complète)
2. Le fichier n'existe pas dans le storage Supabase
3. Le fichier n'est pas public

## Solution apportée

### 1. Amélioration de la construction des URLs

**Fichier :** `supabase/functions/create-yousign-signature/index.ts`

La fonction vérifie maintenant si l'URL est relative (commence par `documents/`) et construit l'URL complète :

```typescript
if (contract.modele?.fichier_url) {
  const fichierUrl = contract.modele.fichier_url;
  // Si l'URL est relative, construire l'URL complète
  if (fichierUrl.startsWith('documents/')) {
    docxUrl = `${SUPABASE_URL}/storage/v1/object/public/${fichierUrl}`;
  } else {
    docxUrl = fichierUrl;
  }
}
```

### 2. Vérification de l'accessibilité du fichier

Avant de télécharger le fichier DOCX, la fonction vérifie maintenant qu'il est accessible :

```typescript
// Vérifier que l'URL est accessible
const testResp = await fetch(docxUrl, { method: 'HEAD' });
if (!testResp.ok) {
  throw new Error(`Le fichier modèle DOCX n'est pas accessible (${testResp.status}).
    Vérifiez que le fichier existe dans le storage et est public.`);
}
```

Cela donne un message d'erreur plus clair qui indique exactement quel est le problème.

### 3. Amélioration du bouton "Télécharger"

**Fichier :** `src/components/EmployeeList.tsx`

Le bouton bleu "Télécharger" a été amélioré pour générer le PDF via `generate-contract-pdf` avec `returnPdf: true`, qui retourne directement le PDF sous forme de blob sans passer par Yousign.

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contract-pdf`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      contractId: contract.id,
      returnPdf: true  // ← Retourne le PDF directement
    })
  }
);

// Traiter le PDF comme un blob
const pdfBlob = await response.blob();
const pdfUrl = URL.createObjectURL(pdfBlob);
window.open(pdfUrl, '_blank');
```

## Distinction des boutons

Il est important de comprendre la différence entre les deux boutons :

| Bouton | Couleur | Fonction | Utilise | Nécessite |
|--------|---------|----------|---------|-----------|
| **Télécharger** | Bleu | Télécharge/génère le PDF | `generate-contract-pdf` | Rien (génère HTML→PDF) |
| **Renvoyer** | Vert | Envoie le contrat par email avec signature électronique | `create-yousign-signature` | Fichier DOCX template |

## Déploiement

### 1. Redéployer l'Edge Function

```bash
supabase functions deploy create-yousign-signature
```

### 2. Vérifier le fichier DOCX du modèle CDI

Aller dans Supabase Dashboard → Storage → Bucket "documents" et vérifier que :

1. Le fichier DOCX du modèle CDI existe
2. Le bucket "documents" est configuré comme **PUBLIC**
3. L'URL du fichier est correcte dans la table `modeles_contrats`

#### Vérification SQL

```sql
-- Voir les modèles de contrats et leurs URLs
SELECT id, nom, type_contrat, fichier_url
FROM modeles_contrats
WHERE type_contrat = 'CDI';

-- Si fichier_url est une URL relative, c'est normal
-- Exemple : documents/templates/contrat-cdi.docx
```

### 3. Rendre le bucket public si nécessaire

Si le bucket n'est pas public :

1. Aller dans Supabase Dashboard → Storage
2. Sélectionner le bucket "documents"
3. Cliquer sur Settings
4. Activer "Public bucket"

## Test

### Test du bouton "Télécharger" (bleu)

1. Ouvrir le modal d'un salarié avec un contrat CDI
2. Cliquer sur le bouton bleu "Télécharger"
3. Le PDF devrait se générer et s'ouvrir dans un nouvel onglet
4. Ce bouton **ne devrait PAS** utiliser Yousign ni nécessiter un fichier DOCX

### Test du bouton "Renvoyer" (vert)

1. Ouvrir le modal d'un salarié avec un contrat CDI généré (pas manuel)
2. Cliquer sur le bouton vert "Renvoyer"
3. Vérifier dans les logs que l'URL DOCX est correcte et accessible
4. Le système devrait envoyer le contrat par email avec Yousign

## Messages d'erreur améliorés

Avant :
```
Yousign error: DOCX download failed: 400 Bad Request
```

Après :
```
Le fichier modèle DOCX n'est pas accessible (400).
Vérifiez que le fichier existe dans le storage et est public.
```

Plus les logs console détaillés :
```
📄 Using DOCX URL: https://xxx.supabase.co/storage/v1/object/public/documents/templates/cdi.docx
🔍 Vérification de l'URL DOCX...
❌ URL DOCX inaccessible: 400 Bad Request
   URL testée: https://xxx.supabase.co/storage/v1/object/public/documents/templates/cdi.docx
```

## Actions requises

1. ✅ Code frontend corrigé (bouton Télécharger)
2. ✅ Code Edge Function corrigé (meilleure gestion des URLs)
3. ⚠️ **À FAIRE :** Redéployer `create-yousign-signature`
4. ⚠️ **À FAIRE :** Vérifier que le fichier DOCX du modèle CDI existe et est accessible
5. ⚠️ **À FAIRE :** Vérifier que le bucket "documents" est public

## Fichiers modifiés

1. `src/components/EmployeeList.tsx` (lignes 3996-4032)
2. `supabase/functions/create-yousign-signature/index.ts` (lignes 505-538)
