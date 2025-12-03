# Guide de déploiement - Correction envoi email contrat

## Contexte
Le problème était que l'email de contrat utilisait la fonction `generate-contract-pdf` qui nécessitait PDFShift (non configuré).

## Solution implémentée
La fonction `send-contract-pdf-simple` a été modifiée pour utiliser le même mécanisme que le bouton "Télécharger" :
1. Télécharger le PDF signé depuis Yousign via la fonction `download-signed-contract`
2. Stocker le PDF dans Supabase Storage
3. Envoyer un email avec un lien direct vers le fichier stocké

## Étapes de déploiement

### 1. Vérifier que la fonction `download-signed-contract` est déployée
Cette fonction doit être déjà déployée car elle est utilisée par le bouton "Télécharger".

### 2. Redéployer la fonction `send-contract-pdf-simple`

```bash
# Utiliser l'outil de déploiement Supabase MCP
```

**OU via Supabase CLI (si disponible):**
```bash
supabase functions deploy send-contract-pdf-simple
```

### 3. Vérifier les variables d'environnement

Les variables suivantes doivent être configurées dans Supabase Dashboard > Edge Functions > Secrets:

- `BREVO_API_KEY` - Clé API Brevo pour l'envoi d'emails
- `YOUSIGN_API_KEY` - Clé API Yousign (déjà configurée)
- `SUPABASE_URL` - URL du projet Supabase (auto-configuré)
- `SUPABASE_SERVICE_ROLE_KEY` - Clé service role (auto-configuré)

### 4. Vérifier que le bucket `documents` est public

Le bucket doit être configuré comme public pour permettre l'accès direct aux PDFs.

Vérifier dans Supabase Dashboard > Storage > documents > Settings:
- "Public bucket" doit être activé

### 5. Tester l'envoi

1. Aller dans l'interface "Liste des employés"
2. Cliquer sur "Envoyer le contrat" pour un contrat signé
3. Vérifier les logs dans Supabase Dashboard > Edge Functions > send-contract-pdf-simple > Logs

## Flux de la fonction

```
1. Réception de la requête avec contractId, employeeEmail, employeeName, variables
   ↓
2. Appel de download-signed-contract pour télécharger le PDF depuis Yousign
   ↓
3. Récupération du contrat avec le champ fichier_signe_url mis à jour
   ↓
4. Construction de l'URL publique: {SUPABASE_URL}/storage/v1/object/public/documents/{fichier_signe_url}
   ↓
5. Envoi de l'email Brevo avec le lien direct
   ↓
6. Retour du succès avec messageId et pdfUrl
```

## Avantages de cette approche

- ✅ Pas besoin de PDFShift (plus d'erreur de clé API manquante)
- ✅ Utilise le PDF authentique signé via Yousign
- ✅ Cohérence avec le bouton "Télécharger" existant
- ✅ Lien direct vers le fichier (pas d'appel à une fonction Edge)
- ✅ Téléchargement rapide pour l'utilisateur

## Messages de log attendus

```
Step 1: Downloading signed contract from Yousign...
Step 2: Retrieving contract with storage path...
Step 3: Building public storage URL...
Email sent successfully with signed contract PDF link
```

## Résolution des erreurs

### Erreur: "Failed to download signed contract"
- Vérifier que `YOUSIGN_API_KEY` est configurée
- Vérifier que le contrat a bien un `yousign_signature_request_id`

### Erreur: "Contract file not found in storage"
- Vérifier que le contrat a bien été signé
- Vérifier que le champ `fichier_signe_url` n'est pas null

### Erreur: "Brevo API error"
- Vérifier que `BREVO_API_KEY` est configurée
- Vérifier que l'email de destination est valide
