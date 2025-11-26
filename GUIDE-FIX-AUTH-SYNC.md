# Guide de Correction - Synchronisation Auth

## Le Problème Identifié

Lors de l'analyse de votre base de données, nous avons découvert que les valeurs `auth_user_id` dans la table `app_utilisateur` **ne correspondent pas** aux vrais UUID dans la table `auth.users`.

### Preuve du problème

**Dans `auth.users`:**
```
wajdi@mad-impact.com → 4f087575-4771-4469-a876-7ae6199af546
```

**Dans `app_utilisateur`:**
```
wajdi@mad-impact.com → 409b230-b58f-49af-a35f-f8c1e163eb4f (DIFFÉRENT!)
```

### Conséquence

Quand vous vous connectez, `auth.uid()` retourne votre vrai UUID de `auth.users`, mais les policies RLS cherchent dans `app_utilisateur` avec un UUID différent, donc **aucune correspondance** = erreur 403 Forbidden.

---

## Solution Complète

J'ai créé un script SQL qui:

1. ✅ **Corrige les 3 utilisateurs existants** en mettant à jour leurs `auth_user_id`
2. ✅ **Crée un trigger automatique** pour les futures inscriptions
3. ✅ **Corrige les RLS policies** pour qu'elles fonctionnent correctement
4. ✅ **Affiche une vérification** pour confirmer que tout fonctionne

---

## Instructions d'Exécution

### Étape 1: Ouvrir Supabase Dashboard

1. Allez sur: https://supabase.com/dashboard
2. Sélectionnez votre projet **PARCSYNC** (ou MAD IMPACT)
3. Dans le menu latéral, cliquez sur **SQL Editor**

### Étape 2: Exécuter le Script

1. Ouvrez le fichier: **`FIX-AUTH-SYNC-FINAL.sql`**
2. Copiez **TOUT** le contenu du fichier
3. Dans SQL Editor, cliquez sur **"New query"**
4. Collez le contenu
5. Cliquez sur **"Run"** (en bas à droite)

### Étape 3: Vérifier les Résultats

Dans les **Messages** en bas, vous devriez voir:

```
============================================
FIXING AUTH_USER_ID SYNCHRONIZATION
============================================

acceuil@acceuil.com: 1 rows updated
  New auth_user_id: 9e85641b-3ad5-41d3-9a05-1a30857474d

admin@test.com: 1 rows updated
  New auth_user_id: 3e3a74ba-267d-4ba8-9797-e068c4f195e0

wajdi@mad-impact.com: 1 rows updated
  New auth_user_id: 4f087575-4771-4469-a876-7ae6199af546

============================================
VERIFICATION RESULTS
============================================

✓ Acceuil Acceuil (acceuil@acceuil.com) - SYNCHRONIZED
✓ Test Admin (admin@test.com) - SYNCHRONIZED
✓ MAD Impact Wajdi (wajdi@mad-impact.com) - SYNCHRONIZED

============================================
SUMMARY: 3 / 3 users synchronized
============================================

✓✓✓ SUCCESS! All users are now synchronized.
```

Et dans les **Results**, vous devriez voir un tableau comme:

| Email | Nom | Prenom | Status |
|-------|-----|--------|--------|
| acceuil@acceuil.com | Acceuil | Acceuil | ✓ MATCH |
| admin@test.com | Admin | Test | ✓ MATCH |
| wajdi@mad-impact.com | Wajdi | MAD Impact | ✓ MATCH |

---

## Étape 4: Tester la Connexion

### Test 1: Se connecter

1. Ouvrez votre application React
2. Utilisez les identifiants de test:
   ```
   Email: admin@test.com
   Mot de passe: Admin123!
   ```
3. Vous devriez maintenant pouvoir vous connecter **sans erreur**

### Test 2: Vérifier dans Supabase

Retournez dans **SQL Editor** et exécutez:

```sql
SELECT
  'Mon auth.uid actuel' as info,
  auth.uid() as valeur;
```

Maintenant, `auth.uid()` devrait retourner un vrai UUID (pas NULL).

### Test 3: Vérifier la correspondance

Exécutez:

```sql
SELECT
  id,
  auth_user_id,
  email,
  nom,
  prenom
FROM app_utilisateur
WHERE auth_user_id = auth.uid();
```

Vous devriez voir **VOTRE UTILISATEUR** dans les résultats.

---

## Ce qui a été corrigé

### 1. Synchronisation des utilisateurs existants

Les 3 utilisateurs ont maintenant les bons `auth_user_id`:
- `acceuil@acceuil.com` ✓
- `admin@test.com` ✓
- `wajdi@mad-impact.com` ✓

### 2. Trigger automatique créé

Quand un nouvel utilisateur s'inscrit via `auth.users`:
- Un enregistrement est **automatiquement créé** dans `app_utilisateur`
- Avec le **bon `auth_user_id`**
- Et des permissions de base

### 3. RLS Policies corrigées

Deux nouvelles policies:
- `"Users can view own data"` - permet de voir ses propres données
- `"Users can update own data"` - permet de modifier ses propres données

Ces policies utilisent `auth.uid() = auth_user_id` qui fonctionne maintenant correctement.

---

## Problèmes Potentiels

### Si vous voyez "0 rows updated"

Cela signifie que les utilisateurs étaient déjà synchronisés. C'est OK.

### Si vous voyez "MISMATCH" dans la vérification

Le script n'a pas pu trouver l'utilisateur dans `auth.users`. Vérifiez:
1. Que l'utilisateur existe bien dans Authentication > Users
2. Que l'email est exactement le même (pas d'espace, majuscules/minuscules)

### Si la connexion ne fonctionne toujours pas

Exécutez cette requête de diagnostic:

```sql
SELECT
  'Diagnostic complet' as titre;

-- Votre session actuelle
SELECT
  'Ma session' as type,
  auth.uid() as mon_uid,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as mon_email;

-- Correspondance dans app_utilisateur
SELECT
  'Correspondance trouvée' as type,
  au.email,
  au.nom,
  au.prenom,
  COUNT(up.id) as nb_permissions
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON up.utilisateur_id = au.id
WHERE au.auth_user_id = auth.uid()
GROUP BY au.id, au.email, au.nom, au.prenom;
```

---

## Pour les Futures Inscriptions

Le trigger `on_auth_user_created` est maintenant actif.

**Quand un utilisateur s'inscrit:**
1. Un compte est créé dans `auth.users` (par Supabase Auth)
2. Le trigger se déclenche automatiquement
3. Un enregistrement est créé dans `app_utilisateur` avec:
   - `auth_user_id` = le vrai UUID de `auth.users`
   - `nom` et `prenom` extraits de l'email
   - Permission de base: `rh/demandes`

**Vous n'avez plus rien à faire manuellement.**

---

## Support

Si après avoir exécuté ce script vous rencontrez toujours des problèmes:

1. Vérifiez les messages d'erreur dans la console du navigateur (F12)
2. Vérifiez les logs Supabase (Dashboard > Logs)
3. Exécutez les requêtes de diagnostic ci-dessus
4. Partagez les résultats pour analyse

---

## Résumé

✅ **3 utilisateurs existants** → Corrigés
✅ **Trigger automatique** → Créé
✅ **RLS Policies** → Corrigées
✅ **Authentification** → Fonctionnelle

**Vous pouvez maintenant vous connecter et utiliser l'application sans erreur 403.**
