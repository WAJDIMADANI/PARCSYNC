# Résolution Erreur 403 - Modification Profil Salarié

## Problème
Lorsque vous essayez de modifier l'adresse ou d'autres informations d'un salarié dans le modal, vous recevez une erreur 403 (Forbidden).

## Cause
Les politiques RLS (Row Level Security) sur la table `profil` bloquent les opérations UPDATE pour les utilisateurs authentifiés.

## Solution en 3 étapes

### Étape 1: Améliorer les messages d'erreur (Déjà fait ✅)
Les messages d'erreur ont été améliorés. Maintenant, quand vous essayez de modifier l'adresse, vous verrez le message d'erreur complet au lieu d'un simple "403".

### Étape 2: Corriger les policies RLS dans Supabase

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir SQL Editor**
   - Dans le menu de gauche, cliquer sur "SQL Editor"
   - Cliquer sur "New query"

3. **Exécuter le script de correction**
   - Ouvrir le fichier `FIX-RLS-PROFIL-UPDATE-MAINTENANT.sql`
   - Copier tout le contenu
   - Coller dans l'éditeur SQL
   - Cliquer sur **"Run"** (bouton en bas à droite)

4. **Vérifier les résultats**
   Le script va :
   - Afficher l'état actuel des policies
   - Supprimer les policies restrictives
   - Créer les bonnes policies pour SELECT, INSERT, UPDATE, DELETE
   - Afficher un message de confirmation

### Étape 3: Tester la correction

1. **Rafraîchir l'application**
   - Appuyer sur `Ctrl+Shift+R` (ou `Cmd+Shift+R` sur Mac) pour rafraîchir complètement
   - Cela force le rechargement de la session

2. **Réessayer la modification**
   - Ouvrir le modal d'un salarié
   - Cliquer sur "Modifier" dans la section Adresse
   - Modifier les champs
   - Cliquer sur "Enregistrer"

3. **Vérifier le message**
   - Si ça fonctionne : Les données sont sauvegardées ✅
   - Si erreur : Vous verrez maintenant le message d'erreur complet

## Messages d'erreur possibles après correction

### "new row violates row-level security policy"
**Cause**: La policy WITH CHECK bloque toujours
**Solution**: Relancer le script SQL, il supprime toutes les policies restrictives

### "permission denied for table profil"
**Cause**: L'utilisateur n'a pas les permissions de base
**Solution**: Vérifier que l'utilisateur est bien authentifié (regarder dans la console navigateur)

### "no policy allowing row access"
**Cause**: Aucune policy n'autorise l'accès
**Solution**: Le script SQL n'a pas été exécuté ou n'a pas fonctionné

## Vérification des policies après correction

Pour vérifier que les policies sont bien en place, exécuter cette requête dans SQL Editor :

```sql
SELECT
  policyname,
  cmd as operation,
  roles,
  (qual IS NOT NULL) as has_using,
  (with_check IS NOT NULL) as has_with_check
FROM pg_policies
WHERE tablename = 'profil'
ORDER BY cmd;
```

**Résultat attendu** : Vous devriez voir 4 policies
- `Authenticated users can view all profiles` (SELECT)
- `Authenticated users can insert profiles` (INSERT)
- `Authenticated users can update profiles` (UPDATE) ← **CRITIQUE**
- `Authenticated users can delete profiles` (DELETE)

## Debug avancé

Si le problème persiste après avoir exécuté le script SQL :

1. **Vérifier l'authentification**
   - Ouvrir la console du navigateur (F12)
   - Aller dans l'onglet "Application" → "Local Storage"
   - Vérifier qu'il y a une clé `supabase.auth.token`

2. **Vérifier le token**
   ```javascript
   // Dans la console du navigateur
   const { data: { session } } = await supabase.auth.getSession()
   console.log('Session:', session)
   ```

3. **Tester directement dans Supabase**
   ```sql
   -- Dans SQL Editor, tester un UPDATE simple
   UPDATE profil
   SET ville = 'Test'
   WHERE id = 'REMPLACER_PAR_UN_ID_REEL'
   RETURNING *;
   ```

## Contact support

Si le problème persiste après toutes ces étapes :
1. Copier le message d'erreur complet
2. Faire une capture d'écran du résultat de la requête de vérification des policies
3. Partager ces informations

## Fichiers impliqués
- `src/components/EmployeeList.tsx` (messages d'erreur améliorés)
- `FIX-RLS-PROFIL-UPDATE-MAINTENANT.sql` (script de correction)
