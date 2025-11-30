# 📧 Guide : Comment Envoyer un Rappel de Documents Manquants

## ✅ Configuration Terminée

Vous avez maintenant **2 menus** dans votre application :
1. **"Documents Manquants"** (ancien) - Fonctionne comme avant
2. **"Documents Manquants v2"** (nouveau) - Avec bouton d'envoi de rappel

---

## 🚀 Comment Envoyer un Rappel - Guide Pas à Pas

### Étape 1 : Aller dans le Menu

1. Connectez-vous à votre application PARC SYNC
2. Dans la sidebar gauche, section **RH**, cliquez sur :
   - **"Documents Manquants v2"** (avec l'icône d'enveloppe)

### Étape 2 : Voir la Liste des Salariés

Vous verrez un tableau avec :
- Nom et prénom du salarié
- Email
- Poste
- Site
- **Liste des documents manquants** (badges rouges)

### Étape 3 : Envoyer le Rappel

Pour chaque salarié, vous avez **2 boutons** dans la colonne "Actions" :

1. **"Voir le profil"** (bleu) → Pour consulter le profil complet
2. **"Envoyer rappel"** (orange) → **CLIQUEZ ICI** pour envoyer l'email

### Étape 4 : Confirmer l'Envoi

Un **modal de confirmation** s'ouvre et affiche :
- Le nom du salarié
- Son email
- La liste complète des documents manquants
- Une information sur le contenu de l'email

**Cliquez sur "Envoyer le rappel"** pour confirmer.

### Étape 5 : Confirmation de Succès

Après quelques secondes :
- ✅ Un message de succès s'affiche
- ✅ L'email est envoyé au salarié
- ✅ Un lien d'upload sécurisé est généré

---

## 📱 Ce Que le Salarié Reçoit

### Email Brevo (Thème Orange/Rouge)

Le salarié reçoit un email contenant :

1. **Sujet** : "📋 Documents obligatoires manquants - PARC SYNC"

2. **Contenu** :
   - Message de bienvenue personnalisé
   - Liste complète des documents manquants
   - Astuce : mention de la capture photo mobile
   - **Gros bouton orange** : "📸 Télécharger mes documents"
   - Formats acceptés (PDF, JPG, PNG)
   - Validité du lien : 7 jours

3. **Lien sécurisé** :
   ```
   https://votre-app.com/upload-all-documents?profil=XXX&token=YYY
   ```

---

## 📸 Expérience du Salarié (Upload des Documents)

### Sur Mobile (Recommandé)

1. Clic sur le lien dans l'email
2. Page s'ouvre avec son nom en haut
3. Liste des documents manquants affichés
4. Pour chaque document :
   - **Gros bouton orange** : "Prendre une photo"
   - Clic → Demande d'autorisation caméra (popup du navigateur)
   - Accepter → Caméra arrière s'active
   - Cadrer le document
   - Clic sur "Capturer" → Photo prise
   - Clic sur "Envoyer" → Upload automatique
   - ✅ Le document disparaît de la liste

5. Quand tous les documents sont uploadés :
   - Message de succès final
   - "Tous les documents sont complets !"

### Sur Desktop

1. Même page mais avec :
   - Bouton "Choisir un fichier" en premier
   - Bouton "Prendre une photo" (si webcam disponible)
   - **Drag & drop** : Glisser-déposer le fichier directement

---

## 🔒 Sécurité

### Token Sécurisé
- Généré avec UUID cryptographique
- Unique par salarié et par envoi
- **Expire après 7 jours**
- Vérifié côté serveur avant upload

### Upload Sécurisé
- Formats acceptés : PDF, JPG, PNG uniquement
- Taille maximale : 10 Mo par fichier
- Upload dans Supabase Storage (bucket `documents`)
- RLS policies automatiquement appliquées

---

## 📊 Traçabilité

### Logs d'Envoi
Chaque email envoyé est enregistré dans la table `email_logs` avec :
- ID du profil
- Email destinataire
- Liste des documents manquants
- Message ID Brevo
- Token utilisé
- Date et heure d'envoi

### Historique des Tokens
Tous les tokens créés sont dans la table `upload_tokens` avec :
- Date de création
- Date d'expiration (7 jours)
- Date d'utilisation (quand le salarié ouvre le lien)

---

## ⚙️ Prérequis Techniques (À Faire Une Seule Fois)

Avant d'utiliser cette fonctionnalité, vous devez :

### 1. Créer les Tables SQL

Dans Supabase, onglet **SQL Editor**, exécutez ces 2 fichiers :

```bash
1. create-upload-tokens-table.sql
2. create-email-logs-table.sql
```

**Comment faire :**
- Ouvrez Supabase Dashboard
- Allez dans "SQL Editor"
- Cliquez sur "New query"
- Copiez le contenu du fichier SQL
- Cliquez sur "Run"
- Répétez pour le 2ème fichier

### 2. Déployer l'Edge Function

L'Edge Function `send-all-missing-documents-reminder` doit être déployée.

**Options de déploiement :**

**Option A - Via Supabase Dashboard :**
- Allez dans "Edge Functions"
- Créez une nouvelle fonction nommée `send-all-missing-documents-reminder`
- Copiez le code de `supabase/functions/send-all-missing-documents-reminder/index.ts`
- Déployez

**Option B - Via Supabase CLI :**
```bash
supabase functions deploy send-all-missing-documents-reminder
```

### 3. Vérifier les Variables d'Environnement

Ces variables doivent être configurées (normalement déjà fait) :
- ✅ `VITE_SUPABASE_URL` (frontend)
- ✅ `VITE_SUPABASE_ANON_KEY` (frontend)
- ✅ `BREVO_API_KEY` (Edge Function - dans Supabase secrets)
- ✅ `APP_URL` (Edge Function - URL de votre app)

---

## 🧪 Test de la Fonctionnalité

### Test Complet

1. **Test d'envoi d'email :**
   - Allez dans "Documents Manquants v2"
   - Sélectionnez un salarié avec documents manquants
   - Cliquez sur "Envoyer rappel"
   - Vérifiez la réception de l'email

2. **Test d'upload mobile :**
   - Ouvrez l'email sur votre téléphone
   - Cliquez sur le lien
   - Testez "Prendre une photo"
   - Uploadez un document
   - Vérifiez qu'il apparaît dans le profil du salarié

3. **Test d'upload desktop :**
   - Ouvrez l'email sur votre ordinateur
   - Cliquez sur le lien
   - Testez "Choisir un fichier"
   - Testez le drag & drop
   - Vérifiez l'upload

4. **Vérification dans Supabase :**
   ```sql
   -- Voir les emails envoyés
   SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;

   -- Voir les tokens créés
   SELECT * FROM upload_tokens ORDER BY created_at DESC LIMIT 10;

   -- Voir les documents uploadés
   SELECT * FROM document WHERE owner_type = 'profil' ORDER BY created_at DESC LIMIT 10;
   ```

---

## 🔄 Comparaison Ancien vs Nouveau

### Menu "Documents Manquants" (Ancien)
- ✅ Voir la liste des salariés avec documents manquants
- ✅ Voir les documents manquants par salarié
- ✅ Cliquer sur "Voir le profil"
- ❌ **PAS de bouton d'envoi de rappel**

### Menu "Documents Manquants v2" (Nouveau)
- ✅ Tout ce que fait l'ancien
- ✅ **Bouton "Envoyer rappel" sur chaque ligne**
- ✅ Modal de confirmation avant envoi
- ✅ Email automatique avec lien sécurisé
- ✅ Page d'upload optimisée mobile avec capture photo
- ✅ Traçabilité complète (logs d'envoi)

---

## ❓ FAQ

### Q1 : Le lien expire quand ?
**R :** Après 7 jours. Le salarié voit un message "Ce lien a expiré" s'il essaie après.

### Q2 : Puis-je renvoyer un rappel ?
**R :** Oui ! Vous pouvez cliquer sur "Envoyer rappel" autant de fois que nécessaire. Un nouveau lien sera généré à chaque fois.

### Q3 : Comment savoir si le salarié a ouvert l'email ?
**R :** Consultez Brevo Dashboard > Transactional emails pour voir le statut (Delivered, Opened, Clicked).

### Q4 : Que se passe-t-il si le salarié n'a pas d'email ?
**R :** Le bouton "Envoyer rappel" n'apparaîtra pas ou affichera une erreur si l'email n'est pas valide.

### Q5 : Les documents uploadés apparaissent où ?
**R :** Dans la section "Documents" du profil du salarié (section orange), exactement comme les autres documents.

### Q6 : Puis-je personnaliser l'email ?
**R :** Oui, éditez le fichier `supabase/functions/send-all-missing-documents-reminder/index.ts` et redéployez la fonction.

### Q7 : Puis-je supprimer l'ancien menu ?
**R :** Oui, une fois que vous êtes satisfait du nouveau, vous pouvez :
1. Supprimer la ligne dans Sidebar.tsx : `{ id: 'rh/documents-manquants', ... }`
2. Supprimer le case dans Dashboard.tsx : `case 'rh/documents-manquants': ...`
3. Renommer "Documents Manquants v2" en "Documents Manquants"

---

## 🎉 Avantages de cette Nouvelle Fonctionnalité

### Pour les RH
- ⚡ **Gain de temps** : Email envoyé en 2 clics
- 📊 **Traçabilité** : Savoir qui a reçu quoi et quand
- 🔄 **Automatisation** : Plus besoin d'envoyer manuellement
- 📧 **Email professionnel** : Template Brevo personnalisé

### Pour les Salariés
- 📱 **Capture photo mobile** : Upload en 3 clics
- ⚡ **Rapidité** : Plus besoin de scanner
- 🎯 **Clarté** : Liste précise des documents manquants
- 🔒 **Sécurité** : Lien unique et temporaire

---

## 📞 Support

Si vous rencontrez un problème :

1. **Vérifiez les prérequis** (tables SQL + Edge Function déployée)
2. **Consultez les logs Supabase** (Edge Functions > Logs)
3. **Vérifiez les tables** (`email_logs` et `upload_tokens`)
4. **Testez l'ancien menu** pour confirmer que l'existant fonctionne

---

## ✅ Résumé Ultra-Rapide

**Pour envoyer un rappel :**
1. Menu **"Documents Manquants v2"**
2. Bouton **"Envoyer rappel"** (orange)
3. Confirmer
4. ✅ Email envoyé !

**L'ancien menu continue de fonctionner normalement.**

Aucun risque de casser l'existant ! 🎉
