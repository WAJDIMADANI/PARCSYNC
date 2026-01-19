# Fix Emails RH - Création batches CRM + Popup moderne

## ✅ Modifications effectuées

### 1. Popup de succès moderne (CRMEmailsNew.tsx)
- Ajout d'une popup fluide et moderne avec animations
- Affichage du nombre de destinataires
- Fermeture automatique après 5 secondes
- Design avec gradient vert et icône animée
- Backdrop blur pour l'effet premium

### 2. Edge Function send-simple-email (MODIFIÉE)
La fonction a été complètement refactorisée pour:

✅ **Créer des batches CRM:**
- Insertion dans `crm_email_batches` avec `created_by`, `mode`, `status`, etc.
- Récupération du `batchId` pour traçabilité

✅ **Créer des recipients:**
- Insertion dans `crm_email_recipients` pour chaque destinataire
- Statuts: `pending` → `sent` ou `failed`

✅ **Logger dans email_logs:**
- Historique complet dans `email_logs` pour compatibilité

✅ **Utiliser JWT + RLS:**
- Import de `@supabase/supabase-js@2`
- Authentification via JWT Bearer token
- Respect des RLS policies

✅ **Logs détaillés:**
- Console logs à chaque étape avec prefix `[send-simple-email]`
- Logs frontend avec prefix `[Emails]`

### 3. Frontend - Logs de debug (CRMEmailsNew.tsx)
Ajout de logs console pour tracer:
- Le payload envoyé
- La réponse de la function
- Les erreurs éventuelles
- Le batchId reçu

## 🚨 DEPLOIEMENT REQUIS

La fonction `send-simple-email` doit être redéployée pour que les changements prennent effet.

### Option A: Via Dashboard Supabase (RECOMMANDÉ)
1. Aller sur: https://supabase.com/dashboard/project/YOUR_PROJECT/functions
2. Sélectionner la fonction `send-simple-email`
3. Copier le contenu de: `supabase/functions/send-simple-email/index.ts`
4. Coller dans l'éditeur
5. Cliquer sur "Deploy"

### Option B: Via Supabase CLI
Si vous avez le CLI configuré:
```bash
npx supabase functions deploy send-simple-email --no-verify-jwt
```

## 🧪 Test après déploiement

1. Ouvrir la console du navigateur (F12)
2. Aller dans RH > Emails > Nouveau
3. Sélectionner un salarié
4. Remplir sujet + message
5. Cliquer "Envoyer"

**Vérifier dans la console:**
```
[Emails] Payload envoyé: { mode, subject, profilIds }
[Emails] Réponse function: { data, error }
[Emails] Succès! BatchId: xxx, Envoyés: 1
```

**Vérifier en base:**
```sql
-- Vérifier que le batch est créé
SELECT * FROM crm_email_batches ORDER BY created_at DESC LIMIT 1;

-- Vérifier les recipients
SELECT * FROM crm_email_recipients
WHERE batch_id = 'BATCH_ID_ICI';

-- Vérifier l'historique
SELECT * FROM email_logs
WHERE type_email = 'crm_simple'
ORDER BY sent_at DESC LIMIT 5;
```

## 🎯 Résultats attendus

Après déploiement:
1. ✅ Les emails s'envoient normalement
2. ✅ Un batch est créé dans `crm_email_batches`
3. ✅ Les recipients sont créés dans `crm_email_recipients`
4. ✅ L'historique est dans `email_logs`
5. ✅ La popup moderne s'affiche avec le nombre d'envois
6. ✅ L'onglet "Historique" affiche les envois

## 📊 Structure des tables attendues

### crm_email_batches
```
id, created_by, mode, brevo_template_id, params, tags, status,
total_recipients, sent_count, failed_count, sent_at, created_at
```

### crm_email_recipients
```
batch_id, profil_id, email, full_name, status, error, created_at
```

### email_logs
```
profil_id, email_to, subject, sent_at, statut, type_email
```

## 🔍 Troubleshooting

**Si aucun batch n'est créé:**
- Vérifier que la fonction est bien déployée
- Vérifier les logs dans Supabase Functions Logs
- Vérifier les RLS policies sur `crm_email_batches`

**Si erreur RLS:**
```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'crm_email_batches';
SELECT * FROM pg_policies WHERE tablename = 'crm_email_recipients';
```

**Si pas de popup:**
- Vérifier que `data.successCount` et `data.total` sont renvoyés
- Vérifier la console pour voir la réponse
