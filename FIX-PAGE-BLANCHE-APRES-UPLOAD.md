# 🐛 FIX: Page blanche après upload de document

## ❌ Problème

Après l'upload réussi d'un document anonyme (via lien avec token) :
- ✅ L'upload fonctionnait correctement
- ✅ Le document était bien enregistré
- ❌ La page devenait blanche après l'upload
- ❌ Le popup de succès ne s'affichait pas

## 🔍 Cause

Dans `UploadAllMissingDocuments.tsx`, après l'upload, la fonction `loadData()` rechargeait les documents pour mettre à jour la liste.

**Ligne 156 (AVANT)** :
```typescript
const { data: existingDocs, error: docsError } = await supabase
  .from('document')
  .select('type_document')
  .eq('profil_id', profilId)  // ❌ ERREUR: cette colonne n'existe pas !
  .in('type_document', requestedDocsList);
```

**Problème** : La table `document` n'a pas de colonne `profil_id`. Elle utilise :
- `owner_id` (l'ID du propriétaire)
- `owner_type` (le type : 'profil' ou 'candidat')

Cette erreur SQL silencieuse faisait planter le rechargement, ce qui causait la page blanche.

## ✅ Solution appliquée

**Ligne 156 (APRÈS)** :
```typescript
const { data: existingDocs, error: docsError } = await supabase
  .from('document')
  .select('type_document')
  .eq('owner_type', 'profil')  // ✅ Filtrer par type
  .eq('owner_id', profilId)    // ✅ Puis par ID
  .in('type_document', requestedDocsList);
```

## 🧪 Test

1. **Envoyez un lien de rappel** à un employé
2. **Ouvrez le lien** (navigation privée)
3. **Uploadez un document**
4. ✅ Le document doit s'uploader
5. ✅ La liste se met à jour (le document disparaît)
6. ✅ Le popup de succès s'affiche
7. ✅ La page reste affichée (pas de page blanche)

## 📊 Comportement attendu

Après l'upload d'un document :

```
✅ Upload terminé avec succès
🔄 Rechargement des données du profil...
📊 Documents déjà uploadés: Array(1)  // Le document uploadé
📊 Documents à afficher: 0            // Si tous uploadés
✅ Message de succès affiché
✅ Page reste fonctionnelle
```

## 🎯 Fichiers modifiés

- ✅ `src/components/UploadAllMissingDocuments.tsx` (ligne 156-157)
- ✅ Build réussi sans erreurs

---

**Déployez et testez** → Tout devrait fonctionner correctement maintenant ! 🚀
