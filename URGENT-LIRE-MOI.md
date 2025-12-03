# 🚨 ACTION REQUISE - Erreur 401 PDF

## Le problème
Les employés reçoivent une erreur 401 quand ils cliquent sur le lien PDF dans leur email.

## La solution est prête ✅
J'ai modifié le code pour résoudre le problème.

## CE QUE VOUS DEVEZ FAIRE MAINTENANT ⚠️

### 1 seule étape critique:

**Redéployer la fonction sur Supabase:**

Allez sur:
```
https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/functions
```

1. Cliquez sur `generate-contract-pdf`
2. Cliquez sur "Deploy"
3. **IMPORTANT:** Activez l'option "Disable JWT verification" ou `--no-verify-jwt`
4. Confirmez le déploiement

### Alternative via CLI:
```bash
supabase functions deploy generate-contract-pdf --no-verify-jwt
```

## Test après déploiement

Ouvrez ce lien dans votre navigateur:
```
https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/generate-contract-pdf?contractId=413870ec-750a-43a9-ab97-b364fc744cbe
```

**Si ça marche:** Le PDF se télécharge automatiquement ✅
**Si erreur 401:** Refaire le déploiement avec `--no-verify-jwt`

## Plus d'infos

Voir les fichiers détaillés:
- `SOLUTION-ERREUR-401-PDF.md` - Solution complète
- `DEPLOY-GENERATE-CONTRACT-FIX.md` - Guide de déploiement
- `TEST-PDF-DOWNLOAD.md` - Tests à effectuer
