# Résumé - Conversion Automatique DOCX → PDF

## Objectif

Convertir les courriers Word en PDF via CloudConvert avec un bouton "Générer PDF".

---

## Implémentation

### 1. Edge Function

**Fichier :** `supabase/functions/convert-courrier-to-pdf/index.ts`

**Input :** `{ courrierId: string }`

**Process :**
1. Récupère le courrier depuis DB
2. Télécharge le DOCX (depuis `fichier_word_genere_url` ou `fichier_pdf_url`)
3. Convertit via CloudConvert API
4. Upload le PDF dans `courriers/pdf/{id}.pdf`
5. Met à jour `courrier_genere` :
   - `fichier_pdf_url` → URL du PDF
   - `fichier_word_genere_url` → URL du DOCX source

**Output :** `{ success: true, pdfUrl: string }`

---

### 2. Frontend

**Fichiers modifiés :**
- `src/utils/fileTypeDetector.ts` : +3 fonctions (`hasPdfAvailable`, `canGeneratePdf`)
- `src/components/GeneratedLettersList.tsx` : +bouton "Générer PDF" + `handleGeneratePdf()`

**UI :**
- Bouton 🔍 apparaît si DOCX disponible mais pas de PDF
- Clic → Spinner → 2-5s → Toast succès → Bouton PDF apparaît

---

## Configuration Requise

### CloudConvert

1. Compte : https://cloudconvert.com/
2. API Key obtenue
3. Plan recommandé : Starter ($9/mois, 500 conversions/jour)

### Supabase

Variable d'environnement Edge Functions :
```
CLOUDCONVERT_API_KEY=eyJ...votre-clé...
```

---

## Déploiement

```bash
# 1. Configurer API Key
supabase secrets set CLOUDCONVERT_API_KEY=eyJ...

# 2. Déployer Edge Function
supabase functions deploy convert-courrier-to-pdf

# 3. Build Frontend
npm run build

# 4. Uploader dist/ sur production
```

**Nouveau hash :** `index-Cnfp7Rda.js`

---

## Test

1. Liste courriers → Courrier avec DOCX uniquement
2. Clic bouton 🔍 "Générer PDF"
3. Attendre 2-5 secondes
4. Toast "PDF généré avec succès!"
5. Bouton 📥 "Télécharger PDF" apparaît
6. Télécharger et ouvrir le PDF ✅

---

## Avantages

✅ Pas de confusion DOCX/PDF
✅ Conversion à la demande (économise quota CloudConvert)
✅ Nettoyage automatique du schéma de données
✅ UI intuitive avec feedback visuel
✅ Gestion d'erreurs complète

---

## Schéma de Données Final

**Avant :**
```
fichier_pdf_url = "courriers/abc.docx"
fichier_word_genere_url = NULL
```

**Après conversion :**
```
fichier_pdf_url = "courriers/pdf/courrier-id.pdf"
fichier_word_genere_url = "courriers/abc.docx"
```

---

## Documentation

- **Guide complet :** `GUIDE-CONVERSION-DOCX-PDF-CLOUDCONVERT.md`
- **Déploiement rapide :** `DEPLOIEMENT-RAPIDE-CONVERSION-PDF.md`

---

**Statut :** ✅ Implémenté et testé
**Build :** `index-Cnfp7Rda.js`
**Date :** 2025-12-24
