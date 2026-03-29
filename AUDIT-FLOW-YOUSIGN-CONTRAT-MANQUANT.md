# Audit : Flow Yousign → Création contrat manquant

## Contexte problème
**Salarié** : Gamra BENOSMANE (profil_id = `33876c75-d775-402a-ac99-bbb04fb82883`)

**Symptôme** :
- SQL montre **seulement 2 lignes manuelles** dans `public.contrat` :
  - 1 contrat manuel (`source = 'manuel'`)
  - 1 avenant manuel (`source = 'manuel'`)
- Aucune ligne Yousign trouvée (`yousign_signature_request_id = null`)
- Aucune trace de signature électronique
- Le modal salarié ne montre pas le contrat attendu

**Question** : Où le contrat Yousign a-t-il été perdu ?

---

## 1. Flow applicatif complet

### A. Création du contrat en base

**3 points d'entrée possibles :**

#### 1) `ContractSendModal.tsx` (ligne 746-750)
```typescript
const { data: contrat, error: contratError } = await supabase
  .from('contrat')
  .insert(contractData)
  .select()
  .single();
```

**Données insérées :**
```typescript
{
  profil_id: profilId,
  modele_id: selectedTemplate,
  type_document: 'contrat' | 'avenant',  // ✅ Type normalisé
  variables: { ...preparedVariables, nom_salarie, email_salarie },
  statut: 'en_attente_signature',
  date_debut: ...,
  date_fin: ...,
  avenant_num: ...  // Si avenant
}
```

**Sources : `ContractSendModal.tsx`**
- Pas de `source` envoyée → **NULL en base par défaut**
- Pas de `yousign_*` envoyés → **NULL en base**

#### 2) `ImportSalariesBulk.tsx` (lignes 989, 1009, 1028)
```typescript
await supabase.from('contrat').insert({
  profil_id: profil.id,
  type: contractType,  // 'cdi', 'cdd', ou 'avenant'
  date_debut: ...,
  date_fin: ...,
  esign: 'signed',
  statut: isContractSigned ? 'signe' : 'envoye',
  date_signature: isContractSigned ? ... : null,
  variables: { type_contrat: ... },
  source: 'import'  // ✅ SOURCE = 'import'
});
```

#### 3) `ImportSalarieTest.tsx` (ligne 148)
```typescript
await supabase.from('contrat').insert([{
  profil_id: employeeData.id,
  type: formData.contrat_type,
  date_debut: formData.contrat_date_debut,
  date_fin: formData.contrat_date_fin || null,
  remuneration_brut: ...,
  source: undefined  // ❌ Pas de source définie → NULL
}]);
```

---

### B. Envoi à Yousign

**Fonction Edge Function appelée :**
```
supabase/functions/create-yousign-signature/index.ts
```

**Appelants :**
1. `ContractSendModal.tsx` (ligne 768-778)
2. `ContractSignature.tsx` (ligne 137)
3. `EmployeeList.tsx` (ligne 2000) - dans `handleResendContract`

**Payload :**
```typescript
{
  contractId: contrat.id  // UUID du contrat en base
}
```

**Ce que fait `create-yousign-signature` :**

1. **Lecture contrat en base** (ligne 586-599) :
   ```typescript
   const contractResp = await fetch(
     `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=*,profil:profil_id(*),modele:modele_id(*)`,
     ...
   );
   const contract = arr?.[0];
   ```

2. **Génération du PDF** (lignes 706-714) :
   - Soit depuis DOCX (CloudConvert)
   - Soit depuis HTML (PDFShift fallback)

3. **Création signature request Yousign** (lignes 724-739)

4. **Upload PDF à Yousign** (lignes 742-753)

5. **Ajout du signataire** (lignes 802-809)

6. **Activation** (lignes 813-820)

7. **UPDATE du contrat en base** (lignes 822-836) :
   ```typescript
   await fetch(`${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}`, {
     method: "PATCH",
     body: JSON.stringify({
       yousign_signature_request_id: signatureRequestId,
       yousign_signer_id: signerData.id,
       statut: "en_attente_signature",
       yousign_document_url: signatureLink,
     }),
   });
   ```

**⚠️ POINT CRITIQUE :** Cet UPDATE ne crée PAS de nouveau contrat, il **met à jour le contrat existant** passé en `contractId`.

---

### C. Webhook Yousign (signature complétée)

**Fonction Edge Function :**
```
supabase/functions/yousign-webhook/index.ts
```

**Événements traités** (lignes 208-225) :
- `signature_request.done`
- `signature_request.completed`
- `signature_request.finished`
- `signer.done` (seulement si `signature_request.status === "done"`)

**Ce que fait le webhook :**

1. **Trouve le contrat** (lignes 237-254) :
   ```typescript
   const filter = signatureRequestId
     ? `yousign_signature_request_id=eq.${signatureRequestId}`
     : `id=eq.${externalId}`;

   const contractPatch = await restPatch(
     SUPABASE_URL,
     `contrat?${filter}&select=id,profil_id,modele_id,date_debut,date_fin,type,statut`,
     SERVICE_KEY,
     {
       statut: "signe",
       date_signature: nowIso,
       yousign_signed_at: nowIso,
     },
     "return=representation"
   );
   ```

2. **Remplit `contrat.type` si NULL** (lignes 293-342)

3. **Update profil** (lignes 344-428) :
   - `statut = 'contrat_signe'`
   - `date_entree` si NULL
   - `matricule_tca` si NULL (auto-incrémenté à partir de 1613)

**⚠️ POINT CRITIQUE :** Le webhook NE CRÉE PAS de contrat, il **met à jour le contrat existant**.

---

## 2. Cause racine probable

### Hypothèse 1 : Contrat créé mais Yousign jamais appelé
**Scénario :**
1. Utilisateur crée un contrat via `ContractSendModal`
2. Le contrat est inséré en base (`source = NULL`)
3. **L'appel à `create-yousign-signature` échoue silencieusement**
4. Le contrat reste en base avec `yousign_signature_request_id = NULL`
5. Le salarié ne reçoit jamais l'email de signature
6. Le contrat existe mais n'est jamais signé

**Erreurs silencieuses possibles :**
- Ligne 784-788 dans `ContractSendModal.tsx` :
  ```typescript
  if (yousignResponse.status === 0 || errorText.includes('CORS')) {
    console.warn('⚠️ Erreur CORS, on continue quand même');
  } else {
    throw new Error(`Yousign error: ${errorText}`);
  }
  ```
  **→ Une erreur CORS est IGNORÉE et le flow continue comme si tout allait bien !**

### Hypothèse 2 : Contrat jamais créé en base
**Scénario :**
1. Erreur lors de l'insertion en base (contrainte, permission, etc.)
2. Le `insert` échoue mais l'erreur n'est pas visible dans l'UI
3. Aucune ligne n'est créée dans `public.contrat`

**Vérification :**
- Ligne 752-755 dans `ContractSendModal.tsx` :
  ```typescript
  if (contratError) {
    console.error('❌ Erreur Supabase:', contratError);
    throw contratError;
  }
  ```
  **→ L'erreur devrait remonter, mais si elle est catchée plus haut sans affichage à l'utilisateur, elle est perdue**

### Hypothèse 3 : Contrat créé, Yousign réussi, mais profil_id incorrect
**Scénario :**
1. Contrat créé avec un `profil_id` différent de celui attendu
2. Yousign fonctionne normalement
3. Le webhook met à jour le contrat avec succès
4. Mais le contrat est lié au mauvais profil

**Vérification :**
```sql
-- Chercher tous les contrats avec yousign_signature_request_id
SELECT id, profil_id, yousign_signature_request_id, statut, source, created_at
FROM public.contrat
WHERE yousign_signature_request_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
```

### Hypothèse 4 : Contrats supprimés manuellement
**Scénario :**
1. Contrats Yousign créés et signés normalement
2. Un utilisateur ou un script les supprime manuellement
3. Seuls les contrats manuels restent (car sauvegardés différemment ou restaurés)

**Vérification :**
- Pas de soft-delete visible dans le schéma `contrat`
- Pas de colonne `deleted_at` ou `is_deleted`

---

## 3. Fichiers exacts impliqués

### Frontend (création contrat)
1. **`src/components/ContractSendModal.tsx`**
   - Ligne 746-750 : INSERT contrat
   - Ligne 768-792 : Appel `create-yousign-signature`
   - Ligne 784-788 : ⚠️ Erreur CORS ignorée

2. **`src/components/EmployeeList.tsx`**
   - Ligne 1999-2025 : Appel `create-yousign-signature` dans resend
   - Ligne 1930-1942 : Lecture dernier contrat

3. **`src/components/ContractSignature.tsx`**
   - Ligne 137 : Appel `create-yousign-signature`

4. **`src/components/ImportSalariesBulk.tsx`**
   - Lignes 989, 1009, 1028 : INSERT contrats (source = 'import')

5. **`src/components/ImportSalarieTest.tsx`**
   - Ligne 148 : INSERT contrat (source = undefined → NULL)

### Edge Functions (backend)
6. **`supabase/functions/create-yousign-signature/index.ts`**
   - Ligne 586-599 : Lecture contrat
   - Ligne 706-714 : Génération PDF
   - Ligne 724-820 : Création signature Yousign
   - Ligne 822-836 : UPDATE contrat avec yousign_signature_request_id

7. **`supabase/functions/yousign-webhook/index.ts`**
   - Ligne 237-254 : UPDATE contrat (statut = 'signe')
   - Ligne 344-428 : UPDATE profil (statut, matricule, date_entree)

---

## 4. Patch minimal recommandé

### A. Supprimer l'ignorance silencieuse des erreurs CORS

**Fichier :** `src/components/ContractSendModal.tsx`

**Ligne 784-788 (AVANT) :**
```typescript
if (yousignResponse.status === 0 || errorText.includes('CORS')) {
  console.warn('⚠️ Erreur CORS, on continue quand même');
} else {
  throw new Error(`Yousign error: ${errorText}`);
}
```

**APRÈS (patch minimal) :**
```typescript
// ❌ NE JAMAIS ignorer les erreurs Yousign
throw new Error(`Yousign error (${yousignResponse.status}): ${errorText}`);
```

### B. Ajouter un fallback robuste si Yousign échoue

**Ligne 780-792 (APRÈS) :**
```typescript
if (!yousignResponse.ok) {
  const errorText = await yousignResponse.text();
  console.error('❌ Yousign error (status ' + yousignResponse.status + '):', errorText);

  // ❌ Marquer le contrat comme "erreur_yousign" au lieu de le laisser en "en_attente_signature"
  await supabase
    .from('contrat')
    .update({
      statut: 'erreur_yousign',
      error_message: errorText.substring(0, 500)
    })
    .eq('id', contrat.id);

  throw new Error(`Impossible de créer la signature Yousign: ${errorText.substring(0, 200)}`);
}
```

### C. Ajouter une colonne `error_message` dans `contrat`

**Migration SQL :**
```sql
ALTER TABLE public.contrat
ADD COLUMN IF NOT EXISTS error_message TEXT;

COMMENT ON COLUMN public.contrat.error_message IS
'Message d''erreur si la création Yousign a échoué';
```

### D. Ajouter un statut `erreur_yousign` dans la contrainte

**Migration SQL :**
```sql
-- Vérifier la contrainte actuelle
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND table_name = 'contrat'
  AND constraint_name LIKE '%statut%';

-- Supprimer l'ancienne contrainte (exemple de nom)
ALTER TABLE public.contrat
DROP CONSTRAINT IF EXISTS contrat_statut_check;

-- Recréer avec le nouveau statut
ALTER TABLE public.contrat
ADD CONSTRAINT contrat_statut_check
CHECK (statut IN (
  'en_attente_signature',
  'envoye',
  'signe',
  'expire',
  'annule',
  'erreur_yousign'  -- ✅ AJOUT
));
```

### E. Ajouter logging explicite dans l'UI

**Ligne 757 (APRÈS) :**
```typescript
console.log('✅ Contrat créé en base:', {
  contrat_id: contrat.id,
  profil_id: contrat.profil_id,
  modele_id: contrat.modele_id,
  type_document: contrat.type_document,
  statut: contrat.statut,
  created_at: contrat.created_at
});
```

**Ligne 791 (APRÈS) :**
```typescript
const yousignData = await yousignResponse.json();
console.log('✅ Yousign signature créée:', {
  signatureRequestId: yousignData.signatureRequestId,
  signerId: yousignData.signerId,
  signatureLink: yousignData.signatureLink,
  contrat_id: contrat.id
});
```

---

## 5. Diff précis recommandé

### Fichier : `src/components/ContractSendModal.tsx`

```diff
@@ -780,13 +780,22 @@
       if (!yousignResponse.ok) {
         const errorText = await yousignResponse.text();
         console.error('⚠️ Yousign error (status ' + yousignResponse.status + '):', errorText);
-
-        if (yousignResponse.status === 0 || errorText.includes('CORS')) {
-          console.warn('⚠️ Erreur CORS, on continue quand même');
-        } else {
-          throw new Error(`Yousign error: ${errorText}`);
-        }
+
+        // ❌ Marquer le contrat comme erreur au lieu de l'ignorer
+        await supabase
+          .from('contrat')
+          .update({
+            statut: 'erreur_yousign',
+            error_message: errorText.substring(0, 500)
+          })
+          .eq('id', contrat.id);
+
+        throw new Error(
+          `Impossible de créer la signature Yousign (${yousignResponse.status}): ${errorText.substring(0, 200)}`
+        );
       } else {
         const yousignData = await yousignResponse.json();
-        console.log('✅ Yousign signature créée:', yousignData);
+        console.log('✅ Yousign signature créée:', {
+          signatureRequestId: yousignData.signatureRequestId,
+          contrat_id: contrat.id
+        });
       }
```

---

## 6. Plan de vérification

### A. Vérifier si le problème est déjà présent

```sql
-- 1. Chercher les contrats Yousign du profil
SELECT id, profil_id, yousign_signature_request_id, statut, source,
       type, type_document, created_at, date_signature
FROM public.contrat
WHERE profil_id = '33876c75-d775-402a-ac99-bbb04fb82883'
ORDER BY created_at DESC;

-- 2. Chercher tous les contrats sans yousign_signature_request_id mais statut "envoye" ou "signe"
SELECT id, profil_id, statut, source, yousign_signature_request_id, created_at
FROM public.contrat
WHERE yousign_signature_request_id IS NULL
  AND statut IN ('envoye', 'signe', 'en_attente_signature')
ORDER BY created_at DESC
LIMIT 100;

-- 3. Vérifier si d'autres profils ont le même problème
SELECT profil_id, COUNT(*) as nb_contrats_manuels,
       COUNT(CASE WHEN yousign_signature_request_id IS NOT NULL THEN 1 END) as nb_yousign
FROM public.contrat
GROUP BY profil_id
HAVING COUNT(*) > 0
   AND COUNT(CASE WHEN yousign_signature_request_id IS NOT NULL THEN 1 END) = 0
ORDER BY nb_contrats_manuels DESC
LIMIT 20;
```

### B. Tester le fix

1. Créer un nouveau contrat via `ContractSendModal`
2. Forcer une erreur Yousign (ex: mauvaise API key)
3. Vérifier que :
   - Le contrat est créé en base
   - Le statut devient `erreur_yousign`
   - Le message d'erreur est visible dans l'UI
   - Le contrat n'est PAS marqué comme "envoye" ou "signe"

---

## 7. Conclusion

### Cause racine probable
**Erreur Yousign silencieusement ignorée** (ligne 784-788 dans `ContractSendModal.tsx`)

Le contrat est créé en base avec `statut = 'en_attente_signature'`, mais si l'appel à `create-yousign-signature` échoue avec une erreur CORS ou autre, **le code continue sans remonter l'erreur**.

Résultat :
- Contrat en base avec `yousign_signature_request_id = NULL`
- Aucun email envoyé au salarié
- Aucune trace d'erreur dans l'UI
- Le salarié n'apparaît pas dans le modal avec son contrat Yousign

### Action immédiate
1. Appliquer le patch minimal (supprimer l'ignorance des erreurs CORS)
2. Ajouter la colonne `error_message` et le statut `erreur_yousign`
3. Vérifier les contrats orphelins existants
4. Notifier les salariés concernés pour renvoyer leurs contrats

### Prévention future
- Ajouter des logs Sentry/Rollbar pour tracker les erreurs Yousign
- Ajouter un dashboard admin pour voir les contrats en erreur
- Ajouter un cron job qui détecte les contrats bloqués en "en_attente_signature" depuis > 7 jours
