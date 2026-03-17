# Correction : Import sans table user_permissions

## Changements appliqués

### Edge Function corrigée

**Fichier** : `supabase/functions/import-vehicle-references/index.ts`

#### Avant (avec user_permissions)
```typescript
const { data: permissions } = await supabase
  .from('user_permissions')
  .select('permission')
  .eq('user_id', user.id);

const hasPermission = permissions?.some(
  p => p.permission === 'manage_vehicle_references' || p.permission === 'super_admin'
);

if (!hasPermission) {
  return new Response(
    JSON.stringify({ error: 'Permission denied. Requires manage_vehicle_references or super_admin.' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### Après (authentification JWT uniquement)
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser(token);

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized. Please login.' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

console.log(`[Import] User authenticated: ${user.email}`);
```

### Comportement

✅ **Tout utilisateur authentifié** peut maintenant utiliser l'import massif
✅ **Pas de dépendance** à la table `user_permissions`
✅ **Authentification JWT** standard Supabase
✅ **Aucune modification frontend** nécessaire

### Sécurité

L'authentification JWT vérifie que :
- L'utilisateur est connecté
- Le token est valide
- La session n'est pas expirée

Si besoin de restreindre l'accès plus tard, vous pouvez :
1. Créer une table `user_permissions`
2. Ajouter la vérification dans la fonction
3. Ou utiliser les RLS policies sur les tables de référence

### Déploiement

La fonction doit être déployée avec :
```bash
supabase functions deploy import-vehicle-references
```

Ou via Supabase Dashboard :
1. Edge Functions > Deploy new function
2. Nom : `import-vehicle-references`
3. Upload : `supabase/functions/import-vehicle-references/index.ts`
4. Verify JWT : ✅ Activé

### Test

```bash
curl -X POST \
  'https://VOTRE_PROJECT.supabase.co/functions/v1/import-vehicle-references' \
  -H 'Authorization: Bearer VOTRE_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"mode":"status"}'
```

Doit retourner :
```json
{
  "totalBrands": 0,
  "totalModels": 0,
  "nhtsaBrands": 0,
  "nhtsaModels": 0
}
```

### Build

✅ `npm run build` réussi sans erreur

### Documentation mise à jour

Les fichiers de documentation mentionnant `user_permissions` restent informatifs mais la fonction fonctionne désormais sans.

---

**Status** : ✅ Corrigé et prêt pour déploiement
**Build** : ✅ Réussi
**Frontend** : ✅ Aucune modification nécessaire
