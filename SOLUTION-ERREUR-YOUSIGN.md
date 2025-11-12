# Solution à l'erreur Yousign lors de l'envoi de contrat

## Problème identifié
L'erreur `dns error: failed to lookup address information` vient du fait que la fonction `create-yousign-signature` essayait d'utiliser PDFShift (service payant) avec une clé API invalide (`YOUR_PDFSHIFT_API_KEY_HERE`).

## Solution appliquée
✅ **Remplacement de PDFShift par HTML2PDF.it (gratuit)**

La fonction `create-yousign-signature` a été mise à jour pour :
1. Générer un PDF directement à partir du HTML
2. Utiliser l'API gratuite HTML2PDF.it au lieu de PDFShift
3. Uploader le PDF généré vers Yousign

## Fichier modifié
- `supabase/functions/create-yousign-signature/index.ts`

## Déploiement de la correction

### Option 1 : Déploiement via Supabase CLI (recommandé)
```bash
npx supabase functions deploy create-yousign-signature
```

### Option 2 : Déploiement via le Dashboard Supabase
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans "Edge Functions"
4. Trouvez la fonction `create-yousign-signature`
5. Cliquez sur "Deploy" ou "Redeploy"

## Changements clés

### Avant (PDFShift - payant)
```typescript
async function generatePDF(htmlContent: string): Promise<ArrayBuffer> {
  const PDFSHIFT_API_KEY = Deno.env.get("PDFSHIFT_API_KEY");
  // ... utilisait PDFShift
}
```

### Après (HTML2PDF - gratuit)
```typescript
async function generatePDF(htmlContent: string): Promise<ArrayBuffer> {
  const response = await fetch("https://api.html2pdf.app/v1/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html: htmlContent,
      engine: "chrome",
      pdf_options: { format: "A4", ... }
    })
  });
  return await response.arrayBuffer();
}
```

## Test après déploiement
1. Allez dans l'interface RH
2. Sélectionnez un candidat "Contrat validé"
3. Cliquez sur "Envoyer le contrat"
4. Remplissez les informations (poste, salaire, site, etc.)
5. Cliquez sur "Envoyer le contrat"

✅ Le contrat devrait maintenant s'envoyer sans erreur DNS !

## Variables d'environnement requises
- ✅ `YOUSIGN_API_KEY` - Configurée
- ✅ `SUPABASE_URL` - Auto-configurée
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Auto-configurée
- ❌ `PDFSHIFT_API_KEY` - Plus nécessaire !

## Support
Si l'erreur persiste après le déploiement :
1. Vérifiez les logs de la fonction dans le dashboard Supabase
2. Assurez-vous que la fonction a bien été redéployée (vérifiez la date de déploiement)
3. Testez avec un nouveau contrat
