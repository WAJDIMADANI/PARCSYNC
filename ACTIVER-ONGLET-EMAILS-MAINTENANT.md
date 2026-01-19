# ⚡ ACTIVATION RAPIDE - Onglet Emails CRM

## Problème
L'onglet "Emails" n'apparaît pas dans le menu RH car la permission n'est pas encore activée dans la base de données.

## Solution en 2 minutes

### Étape 1 : Exécuter le script SQL

1. Ouvrez votre **dashboard Supabase**
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu du fichier **`add-permission-rh-emails.sql`**
4. Cliquez sur **Run** (ou appuyez sur Ctrl+Enter)

Le script va automatiquement :
- ✅ Ajouter la permission `rh/emails` à tous les utilisateurs qui ont accès à "Salariés" ou "Utilisateurs"
- ✅ Afficher la liste des utilisateurs qui ont reçu la permission

### Étape 2 : Rafraîchir l'application

1. **Déconnectez-vous** de l'application (bouton de déconnexion en haut à droite)
2. **Reconnectez-vous**

**L'onglet "Emails" apparaîtra maintenant dans le menu RH !**

---

## Gestion ultérieure des permissions

### Via l'interface (méthode recommandée)

1. Allez dans **Administration > Utilisateurs**
2. Cliquez sur un utilisateur
3. Cochez/décochez "Emails CRM" dans la liste des permissions

### Via SQL (méthode avancée)

Consultez le fichier **`LIRE-MOI-PERMISSION-EMAILS.md`** pour des exemples de requêtes SQL.

---

## Vérification

Pour vérifier que tout fonctionne :

```sql
-- Voir qui a accès à l'onglet Emails
SELECT
  au.prenom,
  au.nom,
  au.email,
  up.actif
FROM public.utilisateur_permissions up
JOIN public.app_utilisateur au ON up.utilisateur_id = au.id
WHERE up.section_id = 'rh/emails';
```

---

## En cas de problème

Si l'onglet n'apparaît toujours pas après avoir suivi ces étapes :

1. Vérifiez que le script SQL s'est bien exécuté (pas d'erreur)
2. Vérifiez que votre utilisateur a bien la permission (requête ci-dessus)
3. Videz le cache de votre navigateur (Ctrl+Shift+R)
4. Reconnectez-vous à l'application
