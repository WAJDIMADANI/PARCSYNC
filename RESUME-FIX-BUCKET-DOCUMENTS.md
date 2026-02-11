# ⚡ FIX BUCKET "documents" - Erreur 404

## 🔴 Problème trouvé

Le bucket "documents" existe mais est **privé** :
```json
{
  "id": "documents",
  "public": false  ← ❌ Cause de l'erreur 404
}
```

## ✅ Solution simple

### Exécutez le fichier SQL : `FIX-BUCKET-DOCUMENTS-PUBLIC-MAINTENANT.sql`

Ou copiez-collez ce SQL dans Supabase SQL Editor :

```sql
-- Rendre le bucket public
UPDATE storage.buckets SET public = true WHERE id = 'documents';

-- Policy lecture publique
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
CREATE POLICY "Allow public reads from documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');

-- Policy upload authentifié
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy upload anonyme
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;
CREATE POLICY "Allow anonymous uploads to documents"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'documents');

-- Policy update
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

-- Policy delete
DROP POLICY IF EXISTS "Allow authenticated deletes to documents" ON storage.objects;
CREATE POLICY "Allow authenticated deletes to documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');
```

## 🧪 Test

1. Rafraîchir la page
2. Modal salarié → Onglet Documents
3. Cliquer sur "Voir"
4. ✅ Le document s'ouvre

## 📊 Résultat

| Avant | Après |
|-------|-------|
| Bucket privé | Bucket public |
| Erreur 404 | Document accessible |
| 0 policies | 5 policies actives |

**Durée : 30 secondes** ⚡
