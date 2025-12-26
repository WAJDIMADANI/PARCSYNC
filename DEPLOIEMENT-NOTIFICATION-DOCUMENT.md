# Déploiement de la notification automatique d'upload

## 📋 Résumé des modifications

Après chaque upload réussi d'un document via `UploadAllMissingDocuments.tsx`, une notification inbox est automatiquement créée pour les pôles **Accueil/Recrutement** et **Comptabilité**.

## 🔧 Fichiers modifiés

1. **`src/components/UploadAllMissingDocuments.tsx`**
   - Appelle `notify-document-uploaded` après chaque upload
   - Passe le token d'upload pour l'authentification anonyme

2. **`supabase/functions/notify-document-uploaded/index.ts`**
   - Accepte 2 modes d'authentification :
     - Bearer token (utilisateurs connectés)
     - Upload token dans le body (accès anonyme)
   - Valide le token depuis la table `upload_tokens`

## 🚀 Déploiement

### Option 1 : Via Supabase Dashboard

1. Va dans ton projet Supabase
2. Menu **Edge Functions**
3. Trouve la fonction `notify-document-uploaded`
4. Clique sur **Deploy new version**
5. Copie-colle le contenu de `supabase/functions/notify-document-uploaded/index.ts`
6. Clique sur **Deploy**

### Option 2 : Via CLI Supabase

```bash
supabase functions deploy notify-document-uploaded --project-ref TON_PROJECT_REF
```

## ✅ Vérification

Une fois déployé, teste en :

1. Accédant à un lien d'upload : `https://ton-app.com/upload-missing-documents?profil=XXX&token=YYY`
2. Uploadant un document
3. Vérifiant dans l'onglet **Inbox** que la notification apparaît

### Logs à surveiller

Dans la console navigateur, tu devrais voir :
```
📬 Envoi de la notification inbox...
✅ notify-document-uploaded OK { profil_id: "...", document_label: "..." }
```

Le message de succès affiché sera :
```
[Nom du document] a été envoyé avec succès ! Notification envoyée au pôle concerné.
```

## 🔍 En cas d'erreur

Si la notification échoue, le message sera :
```
[Nom du document] a été envoyé avec succès ! (notification non envoyée)
```

L'upload du document n'est PAS bloqué en cas d'échec de la notification.

## 📝 Format du message Inbox

Les notifications créées auront ce format :

- **Titre** : "Document reçu"
- **Description** : "[Prénom Nom] (matricule XXX) a téléversé : [Type de document]"
- **Type** : "demande_externe"
- **Statut** : "nouveau"
- **Non lu** : `true`

## 🎯 Destinataires

Les notifications sont envoyées à tous les utilisateurs ayant :
- `pole_id` = "788db7fd-eee5-41fd-b548-a0853e4bea93" (Accueil/Recrutement)
- OU `pole_id` = "0dcd78ec-d5f8-4a68-b6a7-8b69b044286e" (Comptabilité)
- ET `auth_user_id IS NOT NULL`
