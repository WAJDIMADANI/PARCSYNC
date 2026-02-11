# ✅ FIX: Erreur 404 "Bucket not found" pour les documents

## 🔴 Problème identifié

Quand vous cliquez sur "Voir" un document depuis la modal salarié :

```
URL: https://jnlvinwekqvkrywxrjgr.supabase.co/storage/v1/object/public/documents/...
Message: {"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}
```

### Cause
Le bucket **"documents"** n'existe pas dans Supabase Storage !

## ✅ Solution : Créer le bucket

### Étape 1 : Exécuter le SQL

1. Ouvrez Supabase Dashboard
2. Allez dans **SQL Editor**
3. Copiez et exécutez le fichier : **`CREER-BUCKET-DOCUMENTS-MAINTENANT.sql`**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  104857600, -- 100MB
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

-- + Policies RLS (voir fichier complet)
```

### Étape 2 : Vérifier dans Storage

1. Allez dans **Storage** dans le menu Supabase
2. Vous devriez voir le bucket **"documents"**
3. Il sera marqué comme "Public"

### Étape 3 : Tester

1. Ouvrez la modal d'un salarié
2. Allez dans l'onglet **Documents**
3. Cliquez sur **Voir** pour un document
4. ✅ Le document s'ouvre dans un nouvel onglet

## 📊 Structure du bucket créé

```
documents/
├── documents-importants/     # Documents du profil (CI, permis, etc.)
│   └── {profil_id}_{type}_{timestamp}.pdf
├── contrats/                 # Contrats manuels uploadés
│   └── {profil_id}/
│       └── contrat.pdf
├── courriers/                # Courriers générés
│   └── {courrier_id}.pdf
└── vehicules/                # Documents véhicules
    └── {vehicule_id}/
        └── assurance.pdf
```

## 🔐 Policies RLS créées

1. **INSERT** : Utilisateurs authentifiés peuvent uploader
2. **SELECT** : Lecture publique (affichage des documents)
3. **UPDATE** : Utilisateurs authentifiés peuvent modifier
4. **DELETE** : Utilisateurs authentifiés peuvent supprimer

## 🧪 Vérification après déploiement

### SQL de vérification
```sql
-- Vérifier que le bucket existe
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'documents';

-- Vérifier les policies
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%documents%';
```

### Test visuel
1. **Modal salarié** → Onglet Documents → Bouton "Voir"
   - ✅ Document PDF s'ouvre
   - ✅ Plus d'erreur 404

2. **Upload de document**
   - ✅ Upload réussit
   - ✅ Document visible immédiatement

## 📋 Pourquoi ce problème ?

Le code utilise le bucket "documents" (voir `src/lib/documentStorage.ts:84`) :

```typescript
// Tous les contrats sont stockés dans le bucket 'documents'
const bucket = 'documents';
const relativePath = url;

const { data, error } = await supabase
  .storage
  .from(bucket)
  .createSignedUrl(relativePath, 300);
```

Mais le bucket n'avait jamais été créé dans Supabase ! C'est pour ça que toutes les tentatives d'affichage échouaient avec "Bucket not found".

## 🎯 Impact de la correction

### Avant ❌
- Aucun document visible
- Erreur 404 sur tous les documents
- Upload impossible

### Après ✅
- Documents visibles immédiatement
- URLs publiques fonctionnelles
- URLs signées fonctionnelles
- Upload de documents OK

## 🚀 Déployer maintenant

**Fichier à exécuter** : `CREER-BUCKET-DOCUMENTS-MAINTENANT.sql`

**Temps estimé** : 30 secondes

**Test immédiat** : Modal salarié → Documents → Voir

---

**Une fois déployé, tous vos documents seront accessibles !** ✅
