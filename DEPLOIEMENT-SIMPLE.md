# 🚀 Déploiement Simple - 3 Étapes

## ✅ Actuellement Fait

- ✅ Nouveau menu "Documents Manquants v2" ajouté dans la sidebar
- ✅ Composants React créés
- ✅ Route configurée dans App.tsx
- ✅ Build réussi sans erreur
- ✅ **L'ancien code n'a PAS été touché**

---

## 🔧 Ce Qu'il Reste à Faire (3 Étapes)

### Étape 1 : Créer les Tables SQL dans Supabase

**Temps estimé : 2 minutes**

1. Ouvrez votre **Supabase Dashboard**
2. Allez dans **"SQL Editor"** (dans le menu de gauche)
3. Cliquez sur **"New query"**

#### A. Première table : `upload_tokens`

Copiez-collez le contenu du fichier `create-upload-tokens-table.sql` et cliquez sur **"Run"**

Vous devriez voir :
```
✅ Success. No rows returned
```

#### B. Deuxième table : `email_logs`

Cliquez à nouveau sur **"New query"**, copiez-collez le contenu du fichier `create-email-logs-table.sql` et cliquez sur **"Run"**

Vous devriez voir :
```
✅ Success. No rows returned
```

#### ✅ Vérification

Pour vérifier que les tables sont créées, exécutez :
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('upload_tokens', 'email_logs');
```

Vous devriez voir 2 lignes :
- upload_tokens
- email_logs

---

### Étape 2 : Déployer l'Edge Function

**Temps estimé : 3-5 minutes**

#### Option A : Via Supabase Dashboard (Recommandé)

1. Dans Supabase Dashboard, allez dans **"Edge Functions"**
2. Cliquez sur **"Create Function"** ou **"Deploy new function"**
3. **Nom de la fonction** : `send-all-missing-documents-reminder`
4. Copiez le contenu de `supabase/functions/send-all-missing-documents-reminder/index.ts`
5. Collez-le dans l'éditeur
6. Cliquez sur **"Deploy"**

#### Option B : Via Supabase CLI

Si vous avez la CLI installée :

```bash
supabase functions deploy send-all-missing-documents-reminder
```

#### ✅ Vérification

Pour tester que la fonction est déployée :

1. Allez dans **Edge Functions** > **send-all-missing-documents-reminder**
2. Vous devriez voir le statut : **"Active"** ou **"Deployed"**
3. Notez l'URL de la fonction (elle ressemble à : `https://xxx.supabase.co/functions/v1/send-all-missing-documents-reminder`)

---

### Étape 3 : Vérifier les Variables d'Environnement

**Temps estimé : 1 minute**

#### Variables Frontend (Déjà configurées normalement)

Dans votre fichier `.env` local :
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

#### Variables Edge Function (À vérifier)

Dans Supabase Dashboard :

1. Allez dans **"Project Settings"** > **"Edge Functions"**
2. Section **"Secrets"**
3. Vérifiez que ces variables existent :
   - `BREVO_API_KEY` (votre clé API Brevo)
   - `APP_URL` (l'URL de votre application, ex: https://votre-app.com)

**Si elles n'existent pas, ajoutez-les :**

```bash
# Via CLI (si installée)
supabase secrets set BREVO_API_KEY=votre_clé_brevo
supabase secrets set APP_URL=https://votre-app.com
```

Ou via le Dashboard : Cliquez sur **"Add Secret"** et entrez les valeurs.

**Note :** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_DB_URL` sont déjà automatiquement disponibles dans les Edge Functions, pas besoin de les ajouter.

---

## ✅ Test Final

Une fois les 3 étapes terminées :

### 1. Test Backend (Tables + Function)

Dans Supabase SQL Editor :

```sql
-- Vérifier que les tables existent
SELECT * FROM upload_tokens LIMIT 1;
SELECT * FROM email_logs LIMIT 1;
```

### 2. Test Frontend

1. Ouvrez votre application
2. Allez dans la sidebar > Section RH
3. Vous devriez voir **"Documents Manquants v2"** avec l'icône 📧
4. Cliquez dessus
5. Si vous voyez un tableau avec les salariés ayant des documents manquants, c'est bon !

### 3. Test d'Envoi d'Email (Optionnel mais recommandé)

1. Dans "Documents Manquants v2", trouvez un salarié avec documents manquants
2. Cliquez sur **"Envoyer rappel"** (bouton orange)
3. Dans le modal, cliquez sur **"Envoyer le rappel"**
4. Attendez 2-3 secondes
5. Si vous voyez "✅ Email envoyé avec succès", c'est parfait !

### 4. Vérifier l'Email (Si vous avez accès)

Ouvrez la boîte mail du salarié et vérifiez :
- Email reçu avec le bon objet
- Bouton orange "Télécharger mes documents" présent
- Lien cliquable qui mène à la page d'upload

---

## 🔍 Troubleshooting

### Problème 1 : "Edge Function not found"

**Solution :**
- Vérifiez que la fonction est bien déployée dans Supabase Dashboard > Edge Functions
- Vérifiez le nom exact : `send-all-missing-documents-reminder`

### Problème 2 : "Brevo API error"

**Solution :**
- Vérifiez que `BREVO_API_KEY` est bien configurée dans les secrets Supabase
- Testez votre clé API Brevo dans leur interface

### Problème 3 : "Table does not exist"

**Solution :**
- Retournez dans SQL Editor
- Exécutez à nouveau les scripts SQL de création des tables
- Vérifiez avec `SELECT * FROM information_schema.tables WHERE table_name = 'upload_tokens';`

### Problème 4 : "Invalid token" lors de l'upload

**Solution :**
- Vérifiez que les RLS policies sont bien créées sur les tables
- Exécutez cette requête pour vérifier :
```sql
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('upload_tokens', 'email_logs');
```

---

## 📊 Récapitulatif des Fichiers

### Fichiers SQL à exécuter dans Supabase :
1. ✅ `create-upload-tokens-table.sql`
2. ✅ `create-email-logs-table.sql`

### Edge Function à déployer :
1. ✅ `supabase/functions/send-all-missing-documents-reminder/index.ts`

### Composants React créés (déjà dans le code) :
1. ✅ `src/components/UploadAllMissingDocuments.tsx`
2. ✅ `src/components/SendMissingDocumentsReminderModal.tsx`
3. ✅ `src/components/MissingDocumentsWithReminder.tsx`

### Modifications du code existant :
1. ✅ `src/components/Sidebar.tsx` (ajout de 1 import + 1 ligne dans View + 1 ligne dans menu)
2. ✅ `src/components/Dashboard.tsx` (ajout de 1 import + 1 case)
3. ✅ `src/App.tsx` (déjà modifié pour la route `/upload-all-documents`)

---

## 🎉 C'est Tout !

Après ces 3 étapes simples, vous pourrez :
- ✅ Voir le nouveau menu "Documents Manquants v2"
- ✅ Cliquer sur "Envoyer rappel" pour chaque salarié
- ✅ Les salariés recevront un email avec lien sécurisé
- ✅ Ils pourront uploader leurs documents depuis leur mobile avec capture photo
- ✅ L'ancien menu continue de fonctionner normalement

**Aucun risque pour l'existant !** 🚀

---

## ⏱️ Temps Total Estimé

- Étape 1 (Tables SQL) : 2 minutes
- Étape 2 (Edge Function) : 3-5 minutes
- Étape 3 (Variables) : 1 minute
- Test final : 2 minutes

**Total : ~10 minutes** ⚡

---

## 📞 Besoin d'Aide ?

Si vous rencontrez un problème :

1. Consultez `GUIDE-VISUEL-ENVOI-RAPPEL.md` pour voir exactement où cliquer
2. Consultez `GUIDE-ENVOI-RAPPEL-DOCUMENTS.md` pour la documentation complète
3. Vérifiez les logs Supabase (Edge Functions > Logs)
4. Vérifiez que l'ancien menu "Documents Manquants" fonctionne toujours

Bon déploiement ! 🎉
