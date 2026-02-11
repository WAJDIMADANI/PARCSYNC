# ✅ RÉSUMÉ : Fix Erreur 404 Bucket Documents

## 🔴 Problème
Erreur 404 "Bucket not found" quand vous cliquez sur "Voir" un document dans la modal salarié.

## ✅ Solution
Le bucket **"documents"** n'existe pas dans Supabase Storage.

## ⚡ Action immédiate (15 secondes)

### Dans Supabase SQL Editor :

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', true, 104857600,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
        'image/webp', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Policies
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow public reads from documents" ON storage.objects;
CREATE POLICY "Allow public reads from documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');
```

## 🧪 Test
1. Modal salarié → Onglet Documents → Bouton "Voir"
2. ✅ Document s'ouvre (plus d'erreur 404)

## 📋 Fichiers créés
- **SQL complet** : `CREER-BUCKET-DOCUMENTS-MAINTENANT.sql`
- **Guide détaillé** : `FIX-BUCKET-DOCUMENTS-404.md`
- **Guide rapide** : `LANCER-FIX-BUCKET-MAINTENANT.md`
- **Vérification** : `VERIFIER-TOUS-LES-BUCKETS.sql`

## 🎯 Impact
| Avant | Après |
|-------|-------|
| ❌ 404 Bucket not found | ✅ Documents visibles |
| ❌ Rien ne s'affiche | ✅ Tout fonctionne |

**Durée totale : 15 secondes** ⚡

---

**EXÉCUTEZ LE SQL CI-DESSUS ET TESTEZ !**
