# Guide de résolution : Accès refusé aux pages Demandes et Utilisateurs

## Problème

Vous voyez le message "Accès refusé - Vous n'avez pas les permissions nécessaires" lorsque vous essayez d'accéder aux nouvelles pages (Demandes, Utilisateurs).

## Cause

Votre compte Supabase Auth (`admin@test.com`) n'est pas encore lié au système de permissions interne de l'application. Le système nécessite que chaque utilisateur soit enregistré dans la table `app_utilisateur` avec des permissions spécifiques.

---

## ✅ SOLUTION 1 : Utiliser FirstAdminSetup (RECOMMANDÉ)

Cette solution est la plus simple et la plus sûre.

### Étapes :

1. **Aller dans Supabase SQL Editor**
   - Ouvrir votre projet Supabase
   - Aller dans l'onglet "SQL Editor"

2. **Exécuter le script de réinitialisation**
   ```sql
   -- Supprimer toutes les permissions existantes
   DELETE FROM utilisateur_permissions;

   -- Supprimer tous les utilisateurs existants
   DELETE FROM app_utilisateur;
   ```

3. **Se déconnecter de l'application**
   - Cliquer sur "Déconnexion" dans l'application

4. **Se reconnecter**
   - Se reconnecter avec vos identifiants Supabase Auth

5. **Remplir le formulaire FirstAdminSetup**
   - L'écran de configuration initiale devrait apparaître automatiquement
   - Remplir votre prénom et nom
   - Cliquer sur "Créer mon compte administrateur"
   - ✅ Vous obtiendrez automatiquement TOUTES les permissions

### Résultat

Vous aurez accès à :
- ✅ Toutes les pages RH (Candidats, Salariés, Demandes, etc.)
- ✅ Toutes les pages Parc (Véhicules, Maintenance, etc.)
- ✅ Toutes les pages Admin (Sites, Secteurs, Utilisateurs, etc.)

---

## ✅ SOLUTION 2 : Importer depuis l'interface Admin

Si d'autres utilisateurs existent déjà et que vous ne voulez pas les supprimer.

### Prérequis

Un autre utilisateur doit vous donner accès à la page "Utilisateurs" OU vous devez utiliser le script SQL de la Solution 3.

### Étapes :

1. **Accéder à la page "Gestion des Utilisateurs"**
   - Aller dans Administration > Utilisateurs

2. **Cliquer sur "Importer depuis Auth"**
   - Un modal s'ouvrira avec la liste des utilisateurs Supabase Auth

3. **Cliquer sur "Charger les utilisateurs"**
   - La liste de tous les utilisateurs Auth apparaîtra

4. **Importer les utilisateurs**
   - Cliquer sur "Importer tous les utilisateurs" OU
   - Cliquer sur "Importer" pour chaque utilisateur individuellement

5. **Permissions attribuées automatiquement**
   - **Premier utilisateur importé** : Reçoit TOUTES les permissions (admin complet)
   - **Autres utilisateurs** : Reçoivent les permissions de base (Candidats, Salariés, Demandes)

### Résultat

Les utilisateurs Supabase Auth seront maintenant dans le système de permissions et pourront accéder aux pages selon leurs droits.

---

## ✅ SOLUTION 3 : Migration SQL automatique

Cette solution migre automatiquement TOUS les utilisateurs Supabase Auth vers le système de permissions.

### Étapes :

1. **Ouvrir Supabase SQL Editor**

2. **Exécuter le script de migration**

   Le script `migrate-auth-users-to-app-users.sql` se trouve à la racine du projet.

   Copier-coller son contenu dans le SQL Editor et l'exécuter.

3. **Vérifier les résultats**

   Le script affichera :
   - Le nombre d'utilisateurs migrés
   - Les permissions attribuées à chaque utilisateur
   - Les erreurs éventuelles

4. **Se déconnecter et se reconnecter**

### Résultat

- Le premier utilisateur créé obtient TOUTES les permissions
- Les autres utilisateurs obtiennent les permissions de base (Candidats, Salariés, Demandes)
- Tous les utilisateurs peuvent maintenant se connecter et accéder aux pages selon leurs permissions

---

## 🔧 SOLUTION 4 : Création manuelle via SQL

Si vous voulez créer votre utilisateur manuellement avec des permissions spécifiques.

### Étapes :

1. **Récupérer votre ID Auth**
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'admin@test.com';
   ```
   Copier l'ID retourné.

2. **Créer votre utilisateur dans app_utilisateur**
   ```sql
   INSERT INTO app_utilisateur (auth_user_id, email, nom, prenom, actif)
   VALUES (
     'VOTRE_ID_AUTH_ICI',  -- Remplacer par l'ID de l'étape 1
     'admin@test.com',
     'Votre Nom',
     'Votre Prénom',
     true
   )
   RETURNING id;
   ```
   Copier l'ID retourné.

3. **Attribuer TOUTES les permissions**
   ```sql
   INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
   VALUES
     ('VOTRE_USER_ID', 'rh/candidats', true),
     ('VOTRE_USER_ID', 'rh/salaries', true),
     ('VOTRE_USER_ID', 'rh/contrats', true),
     ('VOTRE_USER_ID', 'rh/courriers', true),
     ('VOTRE_USER_ID', 'rh/alertes', true),
     ('VOTRE_USER_ID', 'rh/notifications', true),
     ('VOTRE_USER_ID', 'rh/incidents', true),
     ('VOTRE_USER_ID', 'rh/incidents-historique', true),
     ('VOTRE_USER_ID', 'rh/vivier', true),
     ('VOTRE_USER_ID', 'rh/demandes', true),
     ('VOTRE_USER_ID', 'parc/vehicules', true),
     ('VOTRE_USER_ID', 'parc/ct-assurance', true),
     ('VOTRE_USER_ID', 'parc/maintenance', true),
     ('VOTRE_USER_ID', 'admin/sites', true),
     ('VOTRE_USER_ID', 'admin/secteurs', true),
     ('VOTRE_USER_ID', 'admin/postes', true),
     ('VOTRE_USER_ID', 'admin/modeles', true),
     ('VOTRE_USER_ID', 'admin/modeles-contrats', true),
     ('VOTRE_USER_ID', 'admin/utilisateurs', true);
   ```

4. **Se déconnecter et se reconnecter**

---

## 📊 Vérifier que tout fonctionne

### Vérifier votre utilisateur

```sql
SELECT
  au.nom,
  au.prenom,
  au.email,
  au.actif,
  COUNT(up.id) as nombre_permissions
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON up.utilisateur_id = au.id AND up.actif = true
WHERE au.email = 'admin@test.com'
GROUP BY au.id, au.nom, au.prenom, au.email, au.actif;
```

Vous devriez voir :
- Votre nom et prénom
- Votre email
- `actif = true`
- `nombre_permissions = 19` (si admin complet) ou `3` (si permissions de base)

### Vérifier vos permissions

```sql
SELECT
  up.section_id,
  up.actif
FROM utilisateur_permissions up
JOIN app_utilisateur au ON au.id = up.utilisateur_id
WHERE au.email = 'admin@test.com'
ORDER BY up.section_id;
```

Vous devriez voir la liste de toutes vos permissions actives.

---

## 🎯 Quelle solution choisir ?

| Solution | Avantages | Inconvénients | Recommandé pour |
|----------|-----------|---------------|-----------------|
| **1. FirstAdminSetup** | ✅ Simple<br>✅ Interface graphique<br>✅ Sécurisé | ❌ Supprime les utilisateurs existants | Premier utilisateur ou reset complet |
| **2. Import via interface** | ✅ Ne supprime rien<br>✅ Interface graphique | ❌ Nécessite déjà un accès admin | Ajouter des utilisateurs Auth existants |
| **3. Migration SQL** | ✅ Automatique<br>✅ Migre tous les utilisateurs | ❌ Requiert accès SQL | Migration en masse |
| **4. SQL manuel** | ✅ Contrôle total | ❌ Plus complexe<br>❌ Risque d'erreur | Cas très spécifiques |

---

## ❓ Questions fréquentes

### Q: Pourquoi ce système de permissions ?

**R:** Le système de permissions permet de :
- Contrôler qui peut accéder à quelles pages
- Gérer finement les droits de chaque utilisateur
- Séparer l'authentification (Supabase Auth) de l'autorisation (app_utilisateur)

### Q: Puis-je me connecter sans permissions ?

**R:** Oui, vous pouvez vous connecter avec Supabase Auth, mais vous verrez "Accès refusé" sur toutes les pages protégées jusqu'à ce qu'on vous attribue des permissions.

### Q: Comment ajouter un nouvel utilisateur ?

**R:** 3 méthodes :
1. Créer un compte Supabase Auth puis importer via l'interface Admin
2. Créer directement depuis la page "Gestion des Utilisateurs"
3. Créer via SQL dans `app_utilisateur`

### Q: Puis-je modifier mes propres permissions ?

**R:** Non, pour des raisons de sécurité. Un autre administrateur doit modifier vos permissions.

---

## 🆘 Support

Si vous rencontrez toujours des problèmes après avoir suivi ce guide :

1. Vérifier les logs du navigateur (Console)
2. Vérifier les logs Supabase
3. Exécuter les requêtes de vérification ci-dessus
4. Contacter le support technique
