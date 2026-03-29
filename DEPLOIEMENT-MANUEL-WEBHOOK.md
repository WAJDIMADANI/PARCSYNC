# Déploiement manuel du webhook yousign-webhook

Le système de déploiement automatique via MCP rencontre une erreur. Voici comment déployer manuellement.

## Option 1 : Via Supabase CLI (recommandé)

```bash
# Depuis la racine du projet
./DEPLOYER-WEBHOOK-MAINTENANT.sh
```

Ou directement :
```bash
supabase functions deploy yousign-webhook --no-verify-jwt
```

## Option 2 : Via Supabase Dashboard (si CLI échoue)

1. **Aller dans Supabase Dashboard**
   - Ouvrir https://supabase.com/dashboard
   - Sélectionner le projet TCA Transport

2. **Naviguer vers Edge Functions**
   - Menu latéral → Edge Functions
   - Cliquer sur `yousign-webhook`

3. **Copier le nouveau code**
   - Ouvrir le fichier `supabase/functions/yousign-webhook/index.ts`
   - Copier tout le contenu (lignes 1 à 503)

4. **Remplacer dans l'éditeur web**
   - Coller le nouveau code dans l'éditeur Supabase
   - Vérifier que les lignes 344-406 contiennent le nouveau code de téléchargement PDF

5. **Déployer**
   - Cliquer sur le bouton "Deploy"
   - Attendre la confirmation de déploiement

## Vérification après déploiement

### 1. Tester avec un nouveau contrat

1. Créer un nouveau contrat Yousign
2. Le faire signer par le salarié
3. Attendre le webhook

### 2. Vérifier les logs

Dans Supabase Dashboard → Edge Functions → yousign-webhook → Logs

**Logs attendus après signature** :
```
Téléchargement du PDF signé depuis Yousign...
PDF signé uploadé dans Storage: contrats/{id}_signed_{timestamp}.pdf
Contrat mis à jour avec fichier_signe_url
```

### 3. Vérifier en base de données

```sql
-- Chercher le contrat fraîchement signé
SELECT
  id,
  statut,
  fichier_signe_url,
  signed_storage_path,
  yousign_signed_at
FROM public.contrat
WHERE yousign_signed_at > NOW() - INTERVAL '1 hour'
ORDER BY yousign_signed_at DESC
LIMIT 5;
```

**Résultat attendu** :
- `fichier_signe_url` : `"contrats/{id}_signed_{timestamp}.pdf"` ✅
- `signed_storage_path` : `"contrats/{id}_signed_{timestamp}.pdf"` ✅

### 4. Vérifier le Storage

1. Supabase Dashboard → Storage → documents
2. Naviguer vers le dossier `contrats/`
3. Vérifier la présence du fichier `{id}_signed_{timestamp}.pdf`
4. Cliquer dessus pour prévisualiser → doit afficher le PDF signé

### 5. Tester le bouton Télécharger

1. Ouvrir l'application TCA
2. Aller dans la fiche du salarié qui vient de signer
3. Section "Contrats"
4. Cliquer sur "Télécharger"
5. **Le PDF doit s'ouvrir immédiatement** (sans appel à l'API Yousign)

## Erreurs possibles

### Erreur: "YOUSIGN_API_KEY manquant"

**Solution** :
```bash
# Vérifier que la variable d'environnement existe
# Dans Supabase Dashboard → Settings → Edge Functions → Environment Variables
# Ajouter si manquant:
YOUSIGN_API_KEY = tb7LS9XfUkl7Be9kl2xAtWUDC7J9wcF6
```

### Erreur: "Failed to upload to Storage"

**Solution** :
```sql
-- Vérifier les policies du bucket documents
SELECT *
FROM storage.policies
WHERE bucket_id = 'documents';

-- Si nécessaire, ajouter une policy pour le service role
INSERT INTO storage.policies (bucket_id, name, definition)
VALUES (
  'documents',
  'Service role can upload',
  'true'
);
```

### Erreur: "Failed to download from Yousign"

**Causes possibles** :
1. API key Yousign invalide
2. Signature request ID incorrect
3. Contrat pas encore complètement signé

**Debug** :
```typescript
// Vérifier dans les logs du webhook
console.log("signatureRequestId:", signatureRequestId);
console.log("Yousign response status:", dlRes.status);
console.log("Yousign response text:", await dlRes.text());
```

## Rollback si problème

Si le nouveau webhook cause des problèmes, revenir à l'ancienne version :

```bash
# Restaurer l'ancienne version (sans téléchargement PDF)
git checkout HEAD~1 -- supabase/functions/yousign-webhook/index.ts
supabase functions deploy yousign-webhook --no-verify-jwt
```

## Support

En cas de problème persistant :
1. Vérifier les logs du webhook
2. Vérifier les variables d'environnement
3. Vérifier les permissions Storage
4. Contacter le support Supabase si nécessaire
