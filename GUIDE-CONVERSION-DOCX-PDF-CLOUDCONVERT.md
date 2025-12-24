# Guide Complet - Conversion DOCX → PDF avec CloudConvert

## Vue d'Ensemble

Système complet pour convertir automatiquement les courriers Word (.docx) en PDF via CloudConvert.

### Flux de Travail

```
Courrier DOCX → Bouton "Générer PDF" → Edge Function → CloudConvert API
→ Upload PDF dans Storage → Mise à jour DB → Téléchargement PDF disponible
```

---

## 1. Configuration CloudConvert

### Étape 1.1 : Créer un Compte CloudConvert

1. Aller sur https://cloudconvert.com/
2. Créer un compte (gratuit : 25 conversions/jour)
3. Plan payant recommandé pour production : à partir de $9/mois

### Étape 1.2 : Obtenir l'API Key

1. Se connecter sur https://cloudconvert.com/dashboard/api/v2/keys
2. Cliquer sur "Create New API Key"
3. Nom : `ParcSync Production`
4. Copier la clé (commence par `eyJ...`)

### Étape 1.3 : Configurer dans Supabase

**Via Dashboard Supabase :**

1. Aller dans `Project Settings` > `Edge Functions`
2. Section `Secrets`
3. Ajouter une nouvelle variable :
   - **Nom :** `CLOUDCONVERT_API_KEY`
   - **Valeur :** Coller votre clé API CloudConvert
4. Sauvegarder

**Via CLI (alternative) :**

```bash
supabase secrets set CLOUDCONVERT_API_KEY=eyJ...votre-clé...
```

---

## 2. Déploiement de l'Edge Function

### Fichier Créé

**`supabase/functions/convert-courrier-to-pdf/index.ts`**

Fonctionnalités :
- Récupère le courrier depuis la base de données
- Trouve le fichier DOCX (priorité `fichier_word_genere_url` > `fichier_pdf_url`)
- Télécharge le DOCX depuis Supabase Storage
- Convertit via CloudConvert API
- Upload le PDF dans `courriers/pdf/{courrierId}.pdf`
- Met à jour `courrier_genere` avec les bonnes URLs

### Déploiement

**Méthode 1 : Via l'outil MCP Supabase**

Dans votre interface, exécuter :

```typescript
mcp__supabase__deploy_edge_function({
  name: "convert-courrier-to-pdf",
  slug: "convert-courrier-to-pdf",
  verify_jwt: true,
  files: [
    {
      name: "index.ts",
      content: "/* contenu du fichier */"
    }
  ]
})
```

**Méthode 2 : Via Supabase CLI**

```bash
supabase functions deploy convert-courrier-to-pdf
```

### Vérification du Déploiement

```bash
# Lister les fonctions déployées
supabase functions list

# Devrait afficher :
# - convert-courrier-to-pdf (status: ACTIVE)
```

---

## 3. Modifications Frontend

### 3.1 Utilitaire `fileTypeDetector.ts`

**Nouvelles fonctions ajoutées :**

```typescript
// Vérifie si un PDF est disponible
hasPdfAvailable(fichier_pdf_url, fichier_word_genere_url): boolean

// Vérifie si un PDF peut être généré (DOCX disponible mais pas de PDF)
canGeneratePdf(fichier_pdf_url, fichier_word_genere_url): boolean
```

### 3.2 Composant `GeneratedLettersList.tsx`

**Modifications :**

1. **Nouvel état :**
   ```typescript
   const [convertingPdfId, setConvertingPdfId] = useState<string | null>(null);
   ```

2. **Nouvelle fonction :**
   ```typescript
   const handleGeneratePdf = async (letter: GeneratedLetter) => {
     setConvertingPdfId(letter.id);
     const { data, error } = await supabase.functions.invoke('convert-courrier-to-pdf', {
       body: { courrierId: letter.id }
     });
     // ... gestion succès/erreur ...
     setConvertingPdfId(null);
   };
   ```

3. **Nouveau bouton UI :**
   ```tsx
   {canGeneratePdf(letter.fichier_pdf_url, letter.fichier_word_genere_url) && (
     <button onClick={() => handleGeneratePdf(letter)}>
       <FileCheck className="w-4 h-4" />
     </button>
   )}
   ```

---

## 4. Comportement de l'Application

### Scénario 1 : Courrier avec DOCX uniquement

**Avant :**
- Bouton : "Télécharger Word" seulement
- Pas de PDF disponible

**Après :**
- Boutons : "Télécharger Word" + "Générer PDF" (🔍)
- Clic sur "Générer PDF" :
  1. Spinner s'affiche
  2. Conversion via CloudConvert (2-5 secondes)
  3. Toast : "PDF généré avec succès!"
  4. Liste rafraîchie automatiquement
  5. Nouveau bouton "Télécharger PDF" apparaît

### Scénario 2 : Courrier avec PDF déjà existant

**Comportement :**
- Bouton "Générer PDF" : **Non affiché** ✅
- Seul le bouton "Télécharger PDF" est visible

### Scénario 3 : Courrier avec .docx dans fichier_pdf_url (ancien format)

**Comportement automatique de l'Edge Function :**
1. Détecte que `fichier_pdf_url` contient un .docx
2. Génère le PDF
3. Déplace l'URL .docx vers `fichier_word_genere_url`
4. Met l'URL .pdf dans `fichier_pdf_url`
5. Résultat : Schéma de données nettoyé ✅

---

## 5. Schéma de Données

### Avant Conversion

```sql
courrier_genere:
- fichier_pdf_url = "https://.../courriers/abc123.docx"
- fichier_word_genere_url = NULL
```

### Après Conversion

```sql
courrier_genere:
- fichier_pdf_url = "https://.../courriers/pdf/courrier-id.pdf"
- fichier_word_genere_url = "https://.../courriers/abc123.docx"
```

**Avantages :**
- `fichier_pdf_url` contient toujours un vrai PDF
- `fichier_word_genere_url` contient toujours le Word source
- Pas de confusion entre formats

---

## 6. API CloudConvert - Détails Techniques

### Workflow CloudConvert

```
1. Créer un Job avec 3 tâches :
   - import/upload : Recevoir le DOCX
   - convert : Convertir DOCX → PDF
   - export/url : Fournir l'URL de téléchargement

2. Upload du DOCX via formulaire multipart

3. Polling du statut du job (toutes les 2 secondes, max 60 tentatives)

4. Téléchargement du PDF converti

5. Upload dans Supabase Storage
```

### Limites et Quotas

| Plan | Conversions/jour | Prix |
|------|------------------|------|
| Gratuit | 25 | $0 |
| Starter | 500 | $9/mois |
| Pro | 5000 | $39/mois |
| Business | Illimité | Sur mesure |

**Recommandation :** Plan Starter ($9/mois) pour démarrer

### Temps de Conversion Typiques

| Taille Fichier | Temps Moyen |
|----------------|-------------|
| < 100 KB | 2-3 secondes |
| 100-500 KB | 3-5 secondes |
| 500 KB - 1 MB | 5-10 secondes |
| > 1 MB | 10-20 secondes |

---

## 7. Gestion des Erreurs

### Erreurs Possibles

| Erreur | Cause | Solution |
|--------|-------|----------|
| `CLOUDCONVERT_API_KEY non configurée` | Variable d'env manquante | Configurer dans Supabase Dashboard |
| `Courrier introuvable` | ID invalide | Vérifier que le courrier existe |
| `Aucun fichier DOCX trouvé` | Pas de fichier source | Uploader d'abord un Word |
| `CloudConvert job creation failed` | Quota dépassé ou clé invalide | Vérifier clé API et quota |
| `La conversion a échoué ou a expiré` | Timeout (> 2 minutes) | Fichier trop lourd ou problème CloudConvert |
| `Erreur upload PDF vers storage` | Permissions bucket | Vérifier RLS policies |

### Logs de Debug

Dans la console Edge Function (Supabase Dashboard > Edge Functions > Logs) :

```
Conversion du courrier <id>, DOCX: <url>
DOCX téléchargé, taille: 245872 octets
CloudConvert job créé: <job-id>
CloudConvert job status: processing (attempt 1)
CloudConvert job status: finished (attempt 3)
Téléchargement du PDF depuis CloudConvert
PDF téléchargé, taille: 189432 octets
PDF uploadé vers storage: pdf/<courrier-id>.pdf
Courrier <id> mis à jour avec PDF: <url>
```

---

## 8. Sécurité et Permissions

### RLS Policies

**Bucket `courriers` :**

```sql
-- Upload PDF (service_role via Edge Function)
CREATE POLICY "Service role can upload PDF"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'courriers' AND name LIKE 'pdf/%');

-- Lecture publique des PDFs
CREATE POLICY "Public can read PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'courriers' AND name LIKE 'pdf/%');
```

**Table `courrier_genere` :**

Les policies existantes s'appliquent. L'Edge Function utilise `service_role_key` pour écrire sans restriction.

### JWT Verification

La fonction Edge est configurée avec `verify_jwt: true`, donc :
- Seuls les utilisateurs authentifiés peuvent appeler la fonction
- Le JWT est vérifié automatiquement par Supabase

---

## 9. Build et Déploiement

### Build Frontend

```bash
npm run build
```

**Nouveau hash :** `index-Cnfp7Rda.js`

### Déploiement Complet

1. **Configurer CloudConvert API Key** (voir Section 1.3)

2. **Déployer Edge Function**
   ```bash
   supabase functions deploy convert-courrier-to-pdf
   ```

3. **Déployer Frontend**
   - Uploader `dist/` sur parcsync.madimpact.fr
   - Vider le cache navigateur

4. **Tester**
   - Aller dans la liste des courriers
   - Trouver un courrier avec uniquement un DOCX
   - Cliquer sur le bouton "Générer PDF" (🔍)
   - Attendre 2-5 secondes
   - Vérifier que le bouton "Télécharger PDF" apparaît
   - Télécharger et ouvrir le PDF

---

## 10. Tests

### Test Manuel Complet

**Prérequis :**
- Compte CloudConvert configuré
- API Key dans Supabase
- Edge Function déployée

**Étapes :**

1. **Créer un courrier test**
   - Générer un courrier Word via l'interface

2. **Vérifier le bouton "Générer PDF"**
   - Aller dans la liste des courriers
   - Vérifier que le bouton 🔍 est présent

3. **Générer le PDF**
   - Cliquer sur "Générer PDF"
   - Observer le spinner
   - Attendre le toast de succès

4. **Vérifier le résultat**
   - Le bouton 🔍 disparaît
   - Un bouton "Télécharger PDF" apparaît
   - Cliquer sur "Télécharger PDF"
   - Ouvrir le fichier téléchargé
   - Vérifier que c'est bien un PDF valide

5. **Vérifier la base de données**
   ```sql
   SELECT
     id,
     fichier_pdf_url,
     fichier_word_genere_url
   FROM courrier_genere
   WHERE id = 'votre-courrier-id';
   ```

   Résultat attendu :
   - `fichier_pdf_url` : URL se terminant par `.pdf`
   - `fichier_word_genere_url` : URL se terminant par `.docx`

### Test de Charge

Pour tester plusieurs conversions simultanées :

```bash
# Appeler la fonction plusieurs fois en parallèle
for i in {1..5}; do
  curl -X POST \
    'https://your-project.supabase.co/functions/v1/convert-courrier-to-pdf' \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"courrierId": "courrier-id-'$i'"}' &
done
wait
```

---

## 11. Monitoring et Maintenance

### Suivi des Conversions

**Query SQL pour stats :**

```sql
-- Nombre de courriers avec PDF généré
SELECT
  COUNT(*) as total_with_pdf,
  COUNT(CASE WHEN fichier_pdf_url LIKE '%.pdf%' THEN 1 END) as real_pdfs,
  COUNT(CASE WHEN fichier_pdf_url LIKE '%.docx%' THEN 1 END) as docx_in_pdf_url
FROM courrier_genere;

-- Courriers convertis aujourd'hui
SELECT COUNT(*)
FROM courrier_genere
WHERE fichier_pdf_url LIKE '%/pdf/%'
  AND updated_at::date = CURRENT_DATE;
```

### Logs CloudConvert

Dashboard CloudConvert > Jobs History :
- Voir toutes les conversions effectuées
- Temps de conversion
- Taille des fichiers
- Erreurs éventuelles

### Coûts CloudConvert

Dashboard CloudConvert > Usage :
- Conversions utilisées / quota
- Coût estimé du mois
- Prévisions de dépassement

---

## 12. Améliorations Futures

### Option 1 : Conversion Automatique à la Génération

Modifier `GenerateLetterV2Wizard` pour appeler automatiquement la conversion après la génération du Word :

```typescript
// Après génération du courrier Word
const { id } = courrierCree;
await supabase.functions.invoke('convert-courrier-to-pdf', {
  body: { courrierId: id }
});
```

**Avantages :**
- PDF disponible immédiatement
- Pas besoin de clic supplémentaire

**Inconvénients :**
- Temps de génération plus long
- Consomme 1 conversion par courrier généré

### Option 2 : Batch Conversion

Créer une fonction Edge pour convertir plusieurs courriers en une seule fois :

```typescript
// convert-courriers-batch/index.ts
interface BatchRequest {
  courrierIds: string[];
}
```

**Utilité :**
- Convertir tous les vieux courriers d'un coup
- Script de migration de données

### Option 3 : PDF Preview dans l'UI

Afficher un aperçu du PDF directement dans l'interface :

```tsx
<embed
  src={letter.fichier_pdf_url}
  type="application/pdf"
  width="100%"
  height="600px"
/>
```

### Option 4 : Alternative à CloudConvert

Si les coûts deviennent trop élevés, considérer :

**LibreOffice Headless (Self-hosted) :**
- Gratuit
- Hébergement requis
- Complexe à configurer

**Gotenberg (Docker) :**
- Open-source
- API simple
- Nécessite un serveur

**PDF.co API :**
- Alternative payante à CloudConvert
- Tarifs similaires

---

## 13. Troubleshooting

### Le bouton "Générer PDF" ne s'affiche pas

**Causes possibles :**
1. Le courrier a déjà un PDF → Normal
2. Le courrier n'a pas de DOCX → Vérifier `fichier_pdf_url` et `fichier_word_genere_url`
3. Le build n'est pas à jour → Vérifier hash JS : `index-Cnfp7Rda.js`

### Erreur "CLOUDCONVERT_API_KEY non configurée"

**Solution :**
```bash
supabase secrets set CLOUDCONVERT_API_KEY=eyJ...
```

Puis redéployer la fonction :
```bash
supabase functions deploy convert-courrier-to-pdf
```

### La conversion prend trop de temps

**Timeout après 2 minutes.**

**Causes :**
1. Fichier trop lourd (> 5 MB) → Optimiser le Word avant upload
2. Problème réseau CloudConvert → Réessayer
3. Quota CloudConvert dépassé → Vérifier dashboard

**Solution temporaire :**
Augmenter `maxAttempts` dans `index.ts` :
```typescript
const maxAttempts = 90; // 3 minutes au lieu de 2
```

### Le PDF généré est corrompu

**Causes :**
1. Le DOCX source est corrompu → Télécharger et vérifier le Word
2. Erreur lors du téléchargement → Vérifier les logs Edge Function
3. Erreur lors de l'upload Storage → Vérifier les permissions

**Debug :**
```typescript
// Dans index.ts, ajouter des logs
console.log('PDF size:', pdfArrayBuffer.byteLength);
console.log('PDF first bytes:', new Uint8Array(pdfArrayBuffer.slice(0, 10)));
```

Le PDF doit commencer par `%PDF-1.` (bytes: `37 50 44 46 2D 31`)

---

## 14. Checklist de Déploiement

### Prérequis

- [ ] Compte CloudConvert créé
- [ ] API Key CloudConvert obtenue
- [ ] Plan CloudConvert choisi (Gratuit ou Payant)

### Configuration Supabase

- [ ] Variable `CLOUDCONVERT_API_KEY` configurée dans Edge Functions
- [ ] Permissions RLS vérifiées pour bucket `courriers`
- [ ] Policy `service_role` pour upload PDF créée

### Déploiement

- [ ] Edge Function `convert-courrier-to-pdf` déployée
- [ ] Fonction testée avec `supabase functions invoke`
- [ ] Build frontend effectué (`npm run build`)
- [ ] Hash vérifié : `index-Cnfp7Rda.js`
- [ ] Frontend déployé sur parcsync.madimpact.fr
- [ ] Cache navigateur vidé

### Tests

- [ ] Bouton "Générer PDF" visible sur courrier DOCX
- [ ] Conversion fonctionne (2-5 secondes)
- [ ] Toast de succès affiché
- [ ] Bouton "Télécharger PDF" apparaît après conversion
- [ ] PDF téléchargé s'ouvre correctement
- [ ] Base de données mise à jour correctement

### Monitoring

- [ ] Logs Edge Function vérifiés (pas d'erreurs)
- [ ] Dashboard CloudConvert vérifié (conversions comptabilisées)
- [ ] Query SQL exécutée pour vérifier les données

---

## 15. Ressources

### Documentation

- **CloudConvert API :** https://cloudconvert.com/api/v2
- **Supabase Edge Functions :** https://supabase.com/docs/guides/functions
- **Supabase Storage :** https://supabase.com/docs/guides/storage

### Support

- **CloudConvert Support :** support@cloudconvert.com
- **Supabase Discord :** https://discord.supabase.com

### Code Source

- **Edge Function :** `supabase/functions/convert-courrier-to-pdf/index.ts`
- **Frontend :** `src/components/GeneratedLettersList.tsx`
- **Utilitaires :** `src/utils/fileTypeDetector.ts`

---

**Date de création :** 2025-12-24
**Version :** 1.0
**Auteur :** Système de génération automatique
**Statut :** ✅ Prêt pour production
