# Solution complète : Erreur CDI Yousign

## Diagnostic

**Erreur :** `"Yousign error: DOCX download failed: 400 Bad Request"`

**Cause identifiée :** Les fichiers DOCX **existent bien** dans le storage Supabase, mais le **bucket "modeles-contrats" n'est pas public**, ce qui rend les fichiers inaccessibles via leur URL publique.

### Preuve que les fichiers existent

```sql
-- Les fichiers sont bien dans la base de données
SELECT id, nom, type_contrat, fichier_url
FROM modeles_contrats
WHERE type_contrat = 'CDI';
```

Résultat :
- `CDD au CDI à l'issue de deux avenants` : ✅ Existe
- `CDI Reprise forfait 3H` : ✅ Existe
- `CDI REPRISE Forfait 4h` : ✅ Existe

**Mais** : Les URLs retournent HTTP 400 au lieu de HTTP 200

## Deux solutions disponibles

### Solution 1 : Corriger les permissions du bucket (RECOMMANDÉ)

C'est la **vraie solution** qui résout le problème à la source.

#### Avantages
- ✅ Résout le problème définitivement
- ✅ Utilise les vrais fichiers DOCX avec leur mise en forme
- ✅ Pas de changement de code nécessaire
- ✅ Simple et rapide

#### Comment faire

**Option A : Via Supabase Dashboard (PLUS SIMPLE)**

1. Aller dans Supabase Dashboard
2. Cliquer sur **Storage** dans le menu
3. Trouver le bucket **"modeles-contrats"**
4. Cliquer sur l'icône ⚙️ (Settings) du bucket
5. Cocher **"Public bucket"**
6. Sauvegarder

**Option B : Via SQL**

Exécuter le fichier SQL :
```bash
# Dans le SQL Editor de Supabase Dashboard
# Copier-coller le contenu de :
FIX-BUCKET-MODELES-CONTRATS-PERMISSIONS.sql
```

#### Vérification

Tester que les fichiers sont maintenant accessibles :
```bash
./TESTER-ACCES-FICHIERS-CDI.sh
```

Vous devriez voir :
```
✅ Fichiers accessibles: 3
❌ Fichiers inaccessibles: 0
🎉 TOUT FONCTIONNE !
```

### Solution 2 : Utiliser le fallback HTML→PDF (SECOURS)

J'ai créé un système de fallback automatique qui génère un PDF depuis HTML quand le DOCX n'est pas accessible.

#### Avantages
- ✅ Fonctionne même si le bucket n'est pas public
- ✅ Pas besoin de fichiers DOCX
- ✅ Génération automatique

#### Inconvénients
- ⚠️ Mise en forme simplifiée (pas celle du DOCX original)
- ⚠️ Variables limitées au template HTML

#### Comment activer

Déployer la fonction Edge avec le fallback :
```bash
./DEPLOYER-FIX-CDI-YOUSIGN-MAINTENANT.sh
```

## Recommandation : Solution 1 + Solution 2

**La meilleure approche** est de combiner les deux :

1. **D'abord** : Corriger les permissions du bucket (Solution 1)
   - Cela résout le problème pour tous les fichiers DOCX existants
   - Les contrats utiliseront la vraie mise en forme

2. **Ensuite** : Déployer quand même le fallback (Solution 2)
   - Comme filet de sécurité au cas où un fichier serait manquant
   - Garantit que l'envoi de contrats ne plante jamais

## Plan d'action complet

### Étape 1 : Tester l'accès actuel

```bash
./TESTER-ACCES-FICHIERS-CDI.sh
```

Si vous voyez des erreurs 400, passez à l'étape 2.

### Étape 2 : Corriger les permissions du bucket

**Via Dashboard (recommandé) :**
1. Supabase Dashboard → Storage
2. Bucket "modeles-contrats" → Settings ⚙️
3. Cocher "Public bucket"
4. Sauvegarder

**Ou via SQL :**
```sql
-- Copier-coller dans SQL Editor
-- Contenu de FIX-BUCKET-MODELES-CONTRATS-PERMISSIONS.sql
```

### Étape 3 : Re-tester l'accès

```bash
./TESTER-ACCES-FICHIERS-CDI.sh
```

Vous devriez maintenant voir :
```
✅ Fichiers accessibles: 3
🎉 TOUT FONCTIONNE !
```

### Étape 4 : Tester dans l'application

1. Aller dans l'app
2. Ouvrir un salarié (ex: WAJDI MADANI)
3. Créer un nouveau contrat
4. Sélectionner "CDD au CDI à l'issue de deux avenants"
5. Remplir les variables
6. Cliquer sur "Envoyer le contrat"
7. **Résultat attendu :** Le contrat s'envoie SANS erreur

### Étape 5 : (Optionnel) Déployer le fallback

Pour plus de sécurité :
```bash
./DEPLOYER-FIX-CDI-YOUSIGN-MAINTENANT.sh
```

Cela garantit que même si un fichier DOCX est manquant à l'avenir, le système continuera de fonctionner.

## Vérification dans les logs

Après avoir envoyé un contrat, vérifier dans :
**Supabase Dashboard → Functions → create-yousign-signature → Logs**

### Si le bucket est maintenant public (Solution 1 appliquée)

```
📄 Using DOCX URL: https://jnlvinwekqvkrywxrjgr.supabase.co/storage/v1/object/public/modeles-contrats/...
🔍 Vérification de l'URL DOCX...
✅ URL DOCX accessible
📄 Génération du PDF depuis DOCX...
```

### Si le fallback est utilisé (Solution 2)

```
📄 Using DOCX URL: https://...
🔍 Vérification de l'URL DOCX...
❌ URL DOCX inaccessible: 400 Bad Request
⚠️ Utilisation du fallback HTML→PDF au lieu du DOCX
📝 Génération du PDF depuis HTML (fallback)...
```

## Résumé des fichiers créés

### Pour la Solution 1 (Permissions)
- ✅ `FIX-BUCKET-MODELES-CONTRATS-PERMISSIONS.sql` - Script SQL de correction
- ✅ `TESTER-ACCES-FICHIERS-CDI.sh` - Script de test des URLs

### Pour la Solution 2 (Fallback)
- ✅ `supabase/functions/create-yousign-signature/index.ts` - Fonction modifiée avec fallback
- ✅ `DEPLOYER-FIX-CDI-YOUSIGN-MAINTENANT.sh` - Script de déploiement
- ✅ `FIX-CDI-YOUSIGN-HTML-FALLBACK.md` - Documentation du fallback

### Documentation
- ✅ `SOLUTION-COMPLETE-ERREUR-CDI-YOUSIGN.md` - Ce document
- ✅ `RESUME-FIX-CDI-YOUSIGN.txt` - Résumé rapide
- ✅ `ACTION-IMMEDIATE-CDI-YOUSIGN.txt` - Guide d'action

## Questions fréquentes

### Q: Pourquoi le bucket n'est-il pas public par défaut ?
**R:** Par sécurité, Supabase crée tous les buckets en mode privé. Il faut les rendre publics manuellement.

### Q: Est-ce dangereux de rendre le bucket public ?
**R:** Non, c'est sûr pour les modèles de contrats. Ce sont des templates génériques sans données personnelles.

### Q: Le fallback HTML est-il aussi bien que le DOCX ?
**R:** Le DOCX est préférable car il garde la mise en forme originale. Le fallback HTML est un plan B acceptable.

### Q: Dois-je vraiment déployer les deux solutions ?
**R:** La Solution 1 suffit, mais la Solution 2 en plus offre une sécurité supplémentaire.

### Q: Comment savoir quelle solution est utilisée ?
**R:** Regardez les logs de l'Edge Function après l'envoi d'un contrat (voir section "Vérification dans les logs" ci-dessus).

## Support

Si le problème persiste après avoir appliqué la Solution 1 :

1. Vérifier que le bucket est bien public :
   ```sql
   SELECT id, name, public FROM storage.buckets WHERE id = 'modeles-contrats';
   -- Le champ 'public' doit être 'true'
   ```

2. Vérifier les policies de storage :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%modeles-contrats%';
   ```

3. Tester manuellement une URL dans le navigateur :
   ```
   https://jnlvinwekqvkrywxrjgr.supabase.co/storage/v1/object/public/modeles-contrats/1766088241281_CDD_au_CDI___l_issue_de_deux_avenants.docx
   ```

   Le fichier devrait se télécharger directement.

4. Si rien ne fonctionne, déployer le fallback HTML (Solution 2) comme solution temporaire.
