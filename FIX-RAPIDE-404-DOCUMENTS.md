# ⚡ FIX RAPIDE : Erreur 404 sur documents existants

## 🔴 Situation
- Le bucket "documents" **existe déjà** dans Storage
- Mais erreur 404 quand vous cliquez sur "Voir"
- Cause : **Policies RLS manquantes ou mal configurées**

## ✅ Solution en 3 étapes (2 minutes)

### ÉTAPE 1 : Diagnostic (30 secondes)

Exécutez dans **SQL Editor** :
```sql
-- Vérifier les policies actuelles
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%documents%';
```

**Si vous voyez 0 résultats ou moins de 5 policies** → Passez à l'ÉTAPE 2

### ÉTAPE 2 : Fix des policies (1 minute)

Exécutez dans **SQL Editor** :
```sql
-- S'assurer que le bucket est public
UPDATE storage.buckets SET public = true WHERE id = 'documents';

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;

-- Créer les bonnes policies
CREATE POLICY "Allow public reads from documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow anonymous uploads to documents"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated deletes from documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');
```

### ÉTAPE 3 : Vérification (30 secondes)

```sql
-- Vérifier que les 5 policies sont créées
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%documents%';
```

**Résultat attendu : 5 policies**

## 🧪 Test immédiat

1. **Ouvrez l'app**
2. **Modal salarié** → Onglet Documents
3. **Cliquez sur "Voir"**
4. ✅ **Le document s'ouvre** (plus d'erreur 404 !)

## 🔍 Si ça ne marche toujours pas

### Vérifier que le fichier existe vraiment

```sql
-- Chercher le fichier
SELECT name, created_at
FROM storage.objects
WHERE bucket_id = 'documents'
  AND name LIKE '%permis_verso%'
ORDER BY created_at DESC
LIMIT 5;
```

### Vérifier dans la table document

```sql
SELECT
  id,
  type_document,
  storage_path,
  bucket,
  created_at
FROM document
WHERE type_document LIKE '%permis%'
ORDER BY created_at DESC
LIMIT 5;
```

## 📊 Résultat attendu

| Avant ❌ | Après ✅ |
|---------|---------|
| 404 Bucket not found | Document s'ouvre |
| 0-2 policies | 5 policies actives |
| Bucket privé | Bucket public |
| Pas de lecture publique | Lecture publique OK |

## 📋 Fichiers créés pour vous

1. **FIX-POLICIES-BUCKET-DOCUMENTS-SEULEMENT.sql** - Script complet
2. **DIAGNOSTIC-BUCKET-DOCUMENTS-POLICIES.sql** - Diagnostic approfondi
3. **TESTER-FICHIER-DOCUMENT-EXISTE.sql** - Vérifier si fichier existe
4. **FIX-RAPIDE-404-DOCUMENTS.md** - Ce guide

---

## ⚡ TL;DR (Version ultra-rapide)

**Exécutez ce SQL** :
```sql
UPDATE storage.buckets SET public = true WHERE id = 'documents';

DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
CREATE POLICY "Allow public reads from documents"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow anonymous uploads to documents" ON storage.objects;
CREATE POLICY "Allow anonymous uploads to documents"
ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from documents"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
```

**Testez** : Modal salarié → Documents → Voir → ✅

**Durée totale : 2 minutes** ⚡
