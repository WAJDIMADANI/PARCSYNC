# 🚨 EXECUTER MAINTENANT : Fix Bucket Documents

## ❌ Le problème
Quand vous cliquez sur "Voir" un document :
```
Erreur 404: Bucket not found
```

## ✅ La solution (30 secondes)

### Option 1 : Via SQL Editor (RECOMMANDÉ)

1. **Ouvrez Supabase Dashboard**
   - https://supabase.com/dashboard

2. **Allez dans SQL Editor**
   - Menu de gauche → SQL Editor
   - Ou cliquez sur "New Query"

3. **Copiez-collez ce SQL**
   ```sql
   -- Créer le bucket documents
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'documents',
     'documents',
     true,
     104857600,
     ARRAY[
       'application/pdf',
       'image/jpeg',
       'image/jpg',
       'image/png',
       'image/webp',
       'application/msword',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
     ]
   )
   ON CONFLICT (id) DO NOTHING;

   -- Policy: Upload
   DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
   CREATE POLICY "Allow authenticated uploads to documents"
   ON storage.objects FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'documents');

   -- Policy: Lecture publique
   DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
   CREATE POLICY "Allow public reads from documents"
   ON storage.objects FOR SELECT TO public
   USING (bucket_id = 'documents');

   -- Policy: Update
   DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
   CREATE POLICY "Allow authenticated updates to documents"
   ON storage.objects FOR UPDATE TO authenticated
   USING (bucket_id = 'documents')
   WITH CHECK (bucket_id = 'documents');

   -- Policy: Delete
   DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;
   CREATE POLICY "Allow authenticated deletes from documents"
   ON storage.objects FOR DELETE TO authenticated
   USING (bucket_id = 'documents');
   ```

4. **Cliquez sur "Run"** ⚡

5. **Vérifiez**
   ```sql
   SELECT id, name, public FROM storage.buckets WHERE id = 'documents';
   ```
   Vous devriez voir :
   ```
   id         | name      | public
   documents  | documents | true
   ```

### Option 2 : Via Storage Dashboard

1. **Allez dans Storage**
   - Menu de gauche → Storage

2. **Créez le bucket**
   - Cliquez sur "New bucket"
   - Name: `documents`
   - Public bucket: ✅ **OUI** (important!)
   - Cliquez sur "Create bucket"

3. **PUIS exécutez quand même les policies ci-dessus** dans SQL Editor

## 🧪 Test immédiat

1. **Ouvrez l'app**

2. **Allez sur un salarié**
   - Cliquez sur un employé dans la liste

3. **Onglet Documents**
   - Vous voyez des documents uploadés

4. **Cliquez sur "Voir"**
   - ✅ Le document s'ouvre dans un nouvel onglet
   - ✅ Plus d'erreur 404

## 📊 Ce qui est corrigé

| Avant ❌ | Après ✅ |
|---------|---------|
| Erreur 404 "Bucket not found" | Documents visibles |
| Aucun document ne s'affiche | Tous les documents accessibles |
| URL publiques cassées | URLs fonctionnelles |
| Upload impossible | Upload OK |

## 🔍 Pourquoi ce problème ?

Le code utilise le bucket "documents" mais il n'existait pas :

```typescript
// src/lib/documentStorage.ts:84
const bucket = 'documents';
const { data, error } = await supabase
  .storage
  .from(bucket)  // ← Ce bucket n'existait pas !
  .createSignedUrl(relativePath, 300);
```

## ⚡ Temps d'exécution

- **SQL Editor** : 10 secondes
- **Test** : 5 secondes
- **Total** : 15 secondes

---

## 🎯 Fichiers de référence

- **SQL complet** : `CREER-BUCKET-DOCUMENTS-MAINTENANT.sql`
- **Documentation** : `FIX-BUCKET-DOCUMENTS-404.md`

**Exécutez maintenant et testez !** 🚀
