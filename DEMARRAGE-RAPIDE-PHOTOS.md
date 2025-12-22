# Démarrage rapide - Photos de profil

## Installation en 3 étapes

### 1️⃣ Exécuter le SQL

```bash
# Copier le contenu de setup-profile-photos-bucket.sql
# Aller sur Supabase Dashboard > SQL Editor
# Coller et exécuter
```

### 2️⃣ Vérifier le bucket

```
Supabase Dashboard > Storage
→ Vérifier que "profile-photos" existe et est PUBLIC
```

### 3️⃣ Tester

```bash
npm run dev
# Aller dans Salariés > Cliquer sur un salarié
# Vous devriez voir l'avatar en haut du modal
# Drag & drop une image ou cliquer pour upload
```

---

## Fichiers créés

- ✅ `/src/hooks/useProfilePhoto.ts` - Hook pour l'upload
- ✅ `/src/components/ProfileAvatar.tsx` - Composant avatar
- ✅ `/setup-profile-photos-bucket.sql` - Configuration Storage

## Fichiers modifiés

- ✅ `/src/components/EmployeeList.tsx` - Intégration de l'avatar

---

## Fonctionnalités

- ✅ Avatar circulaire GRAND (320px desktop / 256px mobile) avec gradient coloré
- ✅ Affichage photo ou initiales bien visibles
- ✅ Drag & drop pour upload
- ✅ Clic pour sélectionner un fichier
- ✅ Validation : JPG/PNG/WebP, max 5MB
- ✅ Suppression avec confirmation
- ✅ Animations fluides
- ✅ Toast de notification
- ✅ Responsive et bien rond

---

## Dépannage rapide

**Photo ne s'upload pas ?**
→ Vérifier que le script SQL a été exécuté

**Permission denied ?**
→ Vérifier dans Storage > Policies que les 4 politiques existent

**Photo ne s'affiche pas ?**
→ Vérifier que le bucket est PUBLIC dans Storage

---

Pour plus de détails, voir **GUIDE-PHOTOS-PROFIL.md**
