# Correction Complète - Erreur FK courrier_genere.created_by

## Problème Identifié

Erreur FK 23503 : `courrier_genere_created_by_fkey` violation

**Cause racine :**
- La colonne `courrier_genere.created_by` référence `app_utilisateur.id`
- Le code essayait d'insérer `auth.uid()` (qui est l'UUID de `auth.users.id`)
- Ces deux UUIDs sont différents, d'où la violation de contrainte FK

## Solution Appliquée

### 1. Correction du Code TypeScript

**Fichier modifié :** `src/lib/letterTemplateGenerator.ts`

La fonction `saveGeneratedLetter` a été modifiée pour :

1. Récupérer l'utilisateur auth avec `supabase.auth.getUser()`
2. Récupérer l'`app_utilisateur.id` correspondant via `auth_user_id`
3. Insérer avec `created_by = appUser.id` (et non `auth.uid()`)
4. Ajouter des logs clairs pour faciliter le debug

**Logs ajoutés :**
- `[courrier] Auth user ID: xxx` - Montre l'auth.uid()
- `[courrier] app_utilisateur.id: xxx` - Montre l'ID qui sera inséré
- `[courrier] Insertion avec created_by: xxx` - Confirme l'ID utilisé
- `[courrier] Erreur insertion DB: xxx` - Affiche les erreurs DB

### 2. Correction des Policies RLS

**Problème :** Les policies comparaient `created_by = auth.uid()`, mais `created_by` stocke `app_utilisateur.id`, pas `auth.uid()`.

**Solution :** Utiliser une subquery pour faire le lien entre les deux tables via `auth_user_id`.

## Instructions de Déploiement

### Étape 1 : Appliquer les Policies RLS Corrigées

Dans Supabase Dashboard > SQL Editor, exécuter :

```sql
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Authenticated users can create generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Users can update their generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Users can delete their generated letters" ON courrier_genere;

-- Créer les nouvelles policies corrigées
CREATE POLICY "Users can view generated letters"
  ON courrier_genere FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create generated letters"
  ON courrier_genere FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.id = courrier_genere.created_by
      AND app_utilisateur.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their generated letters"
  ON courrier_genere FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.id = courrier_genere.created_by
      AND app_utilisateur.auth_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'gestion_utilisateurs'
      AND up.actif = true
    )
  );

CREATE POLICY "Users can delete their generated letters"
  ON courrier_genere FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.id = courrier_genere.created_by
      AND app_utilisateur.auth_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM utilisateur_permissions up
      JOIN app_utilisateur au ON au.id = up.utilisateur_id
      WHERE au.auth_user_id = auth.uid()
      AND up.section_id = 'gestion_utilisateurs'
      AND up.actif = true
    )
  );
```

### Étape 2 : Tester

1. Ouvrir la console développeur du navigateur (F12)
2. Aller dans l'application et générer un courrier
3. Vérifier les logs dans la console :
   - `[courrier] Auth user ID: xxx`
   - `[courrier] app_utilisateur.id: xxx`
   - `[courrier] Insertion avec created_by: xxx`
   - `[courrier] Courrier enregistré avec succès, ID: xxx`

4. Si erreur, vérifier les logs d'erreur :
   - `[courrier] Auth error: xxx`
   - `[courrier] app_utilisateur introuvable: xxx`
   - `[courrier] Erreur insertion DB: xxx`

## Vérifications Post-Déploiement

### Vérifier qu'un utilisateur existe dans app_utilisateur

```sql
SELECT
  au.id as app_user_id,
  au.auth_user_id,
  u.email
FROM app_utilisateur au
JOIN auth.users u ON u.id = au.auth_user_id
WHERE u.email = 'votre.email@exemple.com';
```

### Vérifier les courriers générés

```sql
SELECT
  cg.id,
  cg.created_by,
  au.nom,
  au.prenom,
  u.email
FROM courrier_genere cg
JOIN app_utilisateur au ON au.id = cg.created_by
JOIN auth.users u ON u.id = au.auth_user_id
ORDER BY cg.created_at DESC
LIMIT 10;
```

## En Cas d'Erreur "app_utilisateur introuvable"

Si vous voyez `[courrier] app_utilisateur introuvable`, cela signifie que l'utilisateur auth n'a pas d'entrée dans `app_utilisateur`.

**Solution :** Créer l'entrée manquante

```sql
INSERT INTO app_utilisateur (auth_user_id, email, nom, prenom)
SELECT
  id,
  email,
  'NOM',
  'PRENOM'
FROM auth.users
WHERE id = 'XXX-auth-user-id-XXX'
AND NOT EXISTS (
  SELECT 1 FROM app_utilisateur WHERE auth_user_id = 'XXX-auth-user-id-XXX'
);
```

## Résumé des Changements

### Code TypeScript
- ✅ `saveGeneratedLetter` récupère maintenant `app_utilisateur.id` en interne
- ✅ Logs clairs ajoutés pour faciliter le debug
- ✅ Erreurs explicites si l'utilisateur n'est pas trouvé
- ✅ Paramètre `userId` supprimé (récupération automatique)

### Policies RLS
- ✅ Policy INSERT : Vérifie que `created_by` correspond à l'`app_utilisateur.id` du user connecté
- ✅ Policy UPDATE : Vérifie ownership via subquery
- ✅ Policy DELETE : Vérifie ownership via subquery
- ✅ Policy SELECT : Tous les users authentifiés peuvent voir tous les courriers

## Notes Importantes

1. **Logs de Debug** : Les logs `[courrier]` sont essentiels pour diagnostiquer les problèmes. Ne les supprimez pas.

2. **app_utilisateur obligatoire** : Chaque utilisateur auth DOIT avoir une entrée dans `app_utilisateur` avec `auth_user_id` correctement configuré.

3. **FK vs RLS** : Les deux doivent être cohérents :
   - FK : `created_by` → `app_utilisateur.id`
   - RLS : Vérifie via `app_utilisateur.auth_user_id = auth.uid()`

4. **Migration des données** : Si vous avez des courriers existants avec `created_by = auth.uid()`, ils doivent être migrés :

```sql
-- ATTENTION : À adapter selon votre situation
UPDATE courrier_genere cg
SET created_by = au.id
FROM app_utilisateur au
WHERE au.auth_user_id = cg.created_by::uuid
AND EXISTS (SELECT 1 FROM auth.users WHERE id = cg.created_by::uuid);
```
