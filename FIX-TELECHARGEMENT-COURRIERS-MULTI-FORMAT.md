# Correction Téléchargement Multi-Format des Courriers

## 🔴 Problème Initial

Dans `public.courrier_genere`, la colonne `fichier_pdf_url` contient souvent des URL .docx :
- Exemple : `.../courriers/...2025-12-24.docx`
- Le bouton "Télécharger PDF" téléchargeait ce fichier .docx avec l'extension `.pdf`
- Chrome affichait : **"Échec de chargement du document PDF"**
- Type MIME incorrect : `application/pdf` au lieu de `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Problèmes Identifiés

1. **Extension forcée** : Le code forçait `.pdf` même pour les fichiers .docx
2. **Type MIME incorrect** : Tous les fichiers étaient traités comme des PDF
3. **Pas de distinction UI** : Un seul bouton "Télécharger PDF" pour tous les types
4. **Colonne mal utilisée** : `fichier_pdf_url` stockait des .docx, `fichier_word_genere_url` ignoré

---

## ✅ Solution Implémentée

### 1. Utilitaire de Détection de Type de Fichier

**Fichier créé :** `src/utils/fileTypeDetector.ts`

Fonctionnalités :
- `detectFileType(url)` : Détecte si un fichier est PDF, DOCX ou inconnu
- `getFileInfo(url)` : Retourne type, mimeType et extension
- `getFileLabel(type)` : Retourne le label d'affichage ("PDF", "Word", "Fichier")
- `getAvailableDownloads()` : Analyse les colonnes et retourne les fichiers disponibles

```typescript
// Exemple d'utilisation
const files = getAvailableDownloads(
  'https://.../file.docx',  // fichier_pdf_url
  null                       // fichier_word_genere_url
);
// Retourne : [{ url: '...', type: 'docx', label: 'Word' }]

const fileInfo = getFileInfo('https://.../file.pdf');
// Retourne : { type: 'pdf', mimeType: 'application/pdf', extension: '.pdf' }
```

### 2. Modification de GeneratedLettersList

**Fichier modifié :** `src/components/GeneratedLettersList.tsx`

#### Changements clés :

**a) Import de l'utilitaire**
```typescript
import { getAvailableDownloads, getFileInfo, type DownloadableFile } from '../utils/fileTypeDetector';
```

**b) État downloadLetter modifié**
```typescript
// Avant
const [downloadLetter, setDownloadLetter] = useState<GeneratedLetter | null>(null);

// Après
const [downloadLetter, setDownloadLetter] = useState<{
  letter: GeneratedLetter;
  file: DownloadableFile
} | null>(null);
```

**c) Fonction handleDownload modifiée**
```typescript
// Avant
const handleDownload = async (letter: GeneratedLetter) => {
  if (!letter.fichier_pdf_url && !letter.fichier_word_genere_url) return;
  setDownloadLetter(letter);
};

// Après
const handleDownload = async (letter: GeneratedLetter, file: DownloadableFile) => {
  setDownloadLetter({ letter, file });
};
```

**d) Fonction handleDownloadConfirm corrigée**
```typescript
const handleDownloadConfirm = async (markAsSent: boolean, dateEnvoi?: Date) => {
  if (!downloadLetter) return;

  const { letter, file } = downloadLetter;

  // ... mise à jour statut si nécessaire ...

  // Téléchargement avec le bon type MIME et la bonne extension
  const response = await fetch(file.url);
  const blob = await response.blob();
  const fileInfo = getFileInfo(file.url);

  // ✅ BLOB avec le bon type MIME
  const blobWithCorrectType = new Blob([blob], { type: fileInfo.mimeType });
  const url = window.URL.createObjectURL(blobWithCorrectType);
  const a = document.createElement('a');
  a.href = url;
  // ✅ Extension correcte
  a.download = `${letter.modele_nom}_${letter.profil?.nom}_${new Date(letter.created_at).toLocaleDateString('fr-FR')}${fileInfo.extension}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  setDownloadLetter(null);
};
```

**e) Boutons de téléchargement multiples**
```typescript
// Avant : Un seul bouton
{letter.fichier_pdf_url && (
  <button onClick={() => handleDownload(letter)}>
    <Download />
  </button>
)}

// Après : Un bouton par format disponible
{getAvailableDownloads(letter.fichier_pdf_url, letter.fichier_word_genere_url)
  .map((file, idx) => (
    <button
      key={idx}
      onClick={() => handleDownload(letter, file)}
      title={`Télécharger ${file.label}`}
    >
      <Download />
    </button>
  ))
}
```

**f) LetterPreviewModal**
```typescript
// Télécharge le premier fichier disponible
<LetterPreviewModal
  onDownload={() => {
    const files = getAvailableDownloads(
      previewLetter.fichier_pdf_url,
      previewLetter.fichier_word_genere_url
    );
    if (files.length > 0) {
      handleDownload(previewLetter, files[0]);
    }
  }}
/>
```

### 3. Modification de DownloadWithDateModal

**Fichier modifié :** `src/components/DownloadWithDateModal.tsx`

#### Changements :

**a) Ajout du paramètre fileType**
```typescript
interface DownloadWithDateModalProps {
  isOpen: boolean;
  onConfirm: (markAsSent: boolean, dateEnvoi?: Date) => Promise<void>;
  onCancel: () => void;
  letterSubject: string;
  fileType?: string;  // ✅ Nouveau paramètre
}
```

**b) Titre dynamique**
```typescript
// Avant
<h2>Télécharger le PDF</h2>

// Après
<h2>Télécharger le {fileType}</h2>
```

Avec valeur par défaut : `fileType = 'PDF'`

---

## 📦 Build Effectué

```bash
npm run build
```

**Résultat :**
- ✅ Build réussi
- **Nouveau hash JS :** `index-41q-2WXm.js`
- **Ancien hash :** `index-DvwY9aR8.js`

---

## 🎯 Comportement Après Correction

### Scénario 1 : Fichier .docx dans fichier_pdf_url

**Avant :**
- Bouton : "Télécharger PDF" ❌
- Fichier téléchargé : `courrier.pdf` (contenu .docx)
- Chrome : "Échec de chargement du document PDF"

**Après :**
- Bouton : "Télécharger Word" ✅
- Fichier téléchargé : `courrier.docx`
- Type MIME : `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Chrome : Ouvre correctement le fichier

### Scénario 2 : Fichier .pdf dans fichier_pdf_url

**Avant :**
- Bouton : "Télécharger PDF" ✅
- Fichier téléchargé : `courrier.pdf`

**Après :**
- Bouton : "Télécharger PDF" ✅
- Fichier téléchargé : `courrier.pdf`
- Type MIME : `application/pdf`
- Chrome : Affiche correctement le PDF

### Scénario 3 : Word dans fichier_word_genere_url + PDF dans fichier_pdf_url

**Avant :**
- 1 bouton "Télécharger PDF"
- `fichier_word_genere_url` ignoré

**Après :**
- 2 boutons :
  - "Télécharger Word" (depuis `fichier_word_genere_url`)
  - "Télécharger PDF" (depuis `fichier_pdf_url`)
- Chaque bouton télécharge le bon fichier avec le bon type MIME

### Scénario 4 : Aucun fichier disponible

**Avant :**
- Bouton désactivé ou absent

**Après :**
- Aucun bouton affiché ✅

---

## 🔍 Logique de Priorité

La fonction `getAvailableDownloads()` utilise cette logique :

1. **Si `fichier_word_genere_url` existe** :
   - Ajoute ce fichier aux téléchargements disponibles

2. **Si `fichier_pdf_url` existe** :
   - Si c'est un `.pdf` : Ajoute aux téléchargements
   - Si c'est un `.docx` ET `fichier_word_genere_url` n'existe pas : Ajoute aux téléchargements
   - Si c'est un `.docx` ET `fichier_word_genere_url` existe : **Ignore** (évite doublon)

**Résultat :** Pas de doublons, tous les fichiers disponibles sont téléchargeables.

---

## 📊 Tableau Comparatif

| Aspect | Avant | Après |
|--------|-------|-------|
| Détection type fichier | ❌ Aucune | ✅ Automatique via URL |
| Extension téléchargée | ❌ Toujours `.pdf` | ✅ Correcte (`.pdf` ou `.docx`) |
| Type MIME | ❌ Toujours `application/pdf` | ✅ Correct selon type |
| Boutons UI | 1 seul bouton | 1 bouton par format |
| Label bouton | "Télécharger PDF" | "Télécharger PDF" ou "Word" |
| Modal titre | "Télécharger le PDF" | Dynamique selon type |
| Gestion Word | ❌ Ignoré | ✅ Support complet |
| Erreur Chrome | ❌ Oui | ✅ Non |

---

## 🚀 Déploiement

### Étape 1 : Déployer le nouveau build

Pousser les changements Git ou uploader `dist/` sur parcsync.madimpact.fr

### Étape 2 : Vérifier le hash chargé

Dans DevTools > Sources, vérifier que le hash est `index-41q-2WXm.js`

### Étape 3 : Tester

1. Aller dans la liste des courriers générés
2. Trouver un courrier avec fichier .docx
3. Cliquer sur le bouton de téléchargement
4. Vérifier que :
   - Le fichier téléchargé a l'extension `.docx`
   - Le nom de fichier est correct
   - Le fichier s'ouvre correctement (pas d'erreur Chrome)

---

## 🔧 Améliorations Futures (Optionnel)

### Option 1 : Conversion DOCX → PDF automatique

Créer une Edge Function pour convertir automatiquement les .docx en .pdf :

```typescript
// supabase/functions/convert-docx-to-pdf/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // 1. Télécharger le .docx depuis fichier_pdf_url
  // 2. Convertir en PDF via CloudConvert API ou LibreOffice
  // 3. Uploader le PDF dans storage
  // 4. Mettre à jour courrier_genere.fichier_pdf_url avec la vraie URL PDF
  // 5. Copier l'ancienne URL dans fichier_word_genere_url
});
```

Avantages :
- Tous les courriers ont un vrai PDF
- Pas de confusion entre colonnes
- Meilleure expérience utilisateur

### Option 2 : Migration des données existantes

Script SQL pour nettoyer les données existantes :

```sql
-- Déplacer les .docx de fichier_pdf_url vers fichier_word_genere_url
UPDATE courrier_genere
SET
  fichier_word_genere_url = fichier_pdf_url,
  fichier_pdf_url = NULL
WHERE
  fichier_pdf_url LIKE '%.docx%'
  AND fichier_word_genere_url IS NULL;
```

### Option 3 : Améliorer LetterPreviewModal

Afficher plusieurs boutons de téléchargement dans la modal de prévisualisation :

```typescript
<LetterPreviewModal>
  {/* ... preview ... */}
  <div className="flex gap-2">
    {getAvailableDownloads(...).map(file => (
      <button onClick={() => handleDownload(letter, file)}>
        Télécharger {file.label}
      </button>
    ))}
  </div>
</LetterPreviewModal>
```

---

## 📝 Fichiers Créés/Modifiés

### Créés
1. **src/utils/fileTypeDetector.ts** - Utilitaire de détection de type de fichier

### Modifiés
1. **src/components/GeneratedLettersList.tsx** - Gestion multi-format des téléchargements
2. **src/components/DownloadWithDateModal.tsx** - Support du type de fichier dans le titre

---

## ✅ Checklist de Vérification

- [x] Utilitaire de détection créé
- [x] GeneratedLettersList mis à jour
- [x] DownloadWithDateModal mis à jour
- [x] Build npm réussi
- [x] TypeScript sans erreurs
- [ ] **Déployer sur parcsync.madimpact.fr**
- [ ] Tester téléchargement .docx (nom + extension correcte)
- [ ] Tester téléchargement .pdf
- [ ] Tester avec plusieurs formats disponibles
- [ ] Vérifier que Chrome ouvre correctement les fichiers

---

**Date de correction :** 2025-12-24
**Nouveau hash build :** `index-41q-2WXm.js`
**Fichiers créés :** 1
**Fichiers modifiés :** 2
**Statut :** ✅ Prêt pour déploiement
