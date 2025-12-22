# SOLUTION SIMPLE - Photo ne s'affiche pas

## Le problème

Vous avez chargé une photo mais elle ne s'affiche pas. C'est un problème de permissions Storage.

## La solution (2 minutes)

### ÉTAPE 1 : Exécuter le script SQL

1. Allez sur **Supabase Dashboard** → **SQL Editor**
2. Créez une nouvelle query
3. Copiez-collez le contenu du fichier `FIX-PHOTO-PROFILE-URGENT.sql`
4. Cliquez sur **Run**

### ÉTAPE 2 : Vider le cache

**Sur votre navigateur :**
- Chrome/Edge : F12 → Clic droit sur Actualiser → "Vider le cache et actualiser"
- Firefox : Ctrl+Shift+Suppr → Cocher "Cache" → Effacer

### ÉTAPE 3 : Recharger la photo

1. Retournez sur votre application
2. Supprimez la photo actuelle (bouton rouge)
3. Rechargez la même photo
4. Elle devrait maintenant s'afficher !

## Vérification rapide

Ouvrez la console du navigateur (F12) et cherchez :
- ❌ Erreurs 403/404 → Exécutez le script SQL
- ✅ Pas d'erreur → Videz le cache

## Si ça ne marche toujours pas

Vérifiez que le bucket est public :

```sql
SELECT id, public FROM storage.buckets WHERE id = 'profile-photos';
```

Si `public = false` → Le script SQL n'a pas été exécuté correctement.

---

**C'est tout !** Après ces 3 étapes, votre photo devrait s'afficher.
