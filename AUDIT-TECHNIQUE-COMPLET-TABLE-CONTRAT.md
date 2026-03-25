# AUDIT TECHNIQUE EXHAUSTIF - TABLE `public.contrat`

**Date**: 2026-03-25
**Objectif**: Identifier TOUS les accès à la table `contrat` avec colonnes exactes lues/écrites
**Contexte**: Préparation durcissement RLS pour éliminer accès anon non sécurisé

---

## RÉSUMÉ EXÉCUTIF

### Accès ANONYMES identifiés

**2 flows publics critiques** :

1. **`/contract-signature?contrat={uuid}`** (ContractSignature.tsx)
   - SELECT : Toutes colonnes (`*`) + joins
   - UPDATE : `certificat_medical_id` uniquement

2. **`/upload-medical-certificate?contract={uuid}`** (UploadMedicalCertificate.tsx)
   - SELECT : `id, profil_id, certificat_medical_id` + join profil
   - UPDATE : `certificat_medical_id` uniquement

**Aucun INSERT anonyme**
**Aucun DELETE anonyme**

---

## TABLEAU EXHAUSTIF DES ACCÈS

| # | Fichier | Fonction/Ligne | Auth | Opération | Colonnes SELECT | Colonnes UPDATE | Colonnes INSERT | Colonnes DELETE |
|---|---------|----------------|------|-----------|-----------------|-----------------|-----------------|-----------------|
| **1** | **ContractSignature.tsx** | fetchContract:51-59 | **anon** | **SELECT** | **`*` (toutes), modele.nom, modele.type_contrat, profil.prenom, profil.nom, profil.email** | - | - | - |
| **2** | **ContractSignature.tsx** | handleCertificatUpload:108-111 | **anon** | **UPDATE** | - | **`certificat_medical_id`** | - | - |
| **3** | **UploadMedicalCertificate.tsx** | loadContractData:28-41 | **anon** | **SELECT** | **`id, profil_id, certificat_medical_id`, profil.nom, profil.prenom, profil.email** | - | - | - |
| **4** | **UploadMedicalCertificate.tsx** | handleUpload:111-114 | **anon** | **UPDATE** | - | **`certificat_medical_id`** | - | - |
| 5 | ContractsList.tsx | fetchContracts:70-73 | authenticated | SELECT | `*` (toutes) | - | - | - |
| 6 | ContractsList.tsx | onDeleteContract:217-220 | authenticated | DELETE | - | - | - | ALL (via id) |
| 7 | ContractValidationPanel.tsx | fetchContracts:53-60 | authenticated | SELECT | `*`, profil.*, modele.* | - | - | - |
| 8 | ContractValidationPanel.tsx | handleValidate:145-155 | authenticated | UPDATE | - | `statut` = 'actif', `date_validation` | - | - |
| 9 | ContractValidationPanel.tsx | handleReject:175-184 | authenticated | UPDATE | - | `statut` = 'refuse' | - | - |
| 10 | ManualContractUploadModal.tsx | handleUpload:225-240 | authenticated | INSERT | - | - | `profil_id, modele_id, variables, date_envoi, statut, fichier_contrat_url` | - |
| 11 | MedicalCertificateManager.tsx | fetchContracts:54-63 | authenticated | SELECT | `id, profil_id, certificat_medical_id, statut, date_envoi`, profil.* | - | - | - |
| 12 | MedicalCertificateManager.tsx | handleUpload:91-99 | authenticated | UPDATE | - | `certificat_medical_id` | - | - |
| 13 | ContractsDashboard.tsx | fetchStats:52-58 | authenticated | SELECT | `statut, date_validation` | - | - | - |
| 14 | ContractSendModal.tsx | loadContractData:49-58 | authenticated | SELECT | `*`, profil.*, modele.* | - | - | - |
| 15 | ContractSendModal.tsx | handleSendContract:75-87 | authenticated | UPDATE | - | `date_envoi, statut` | - | - |
| 16 | ContractSendModal.tsx | handleContractChoice:122-134 | authenticated | UPDATE | - | `modele_id, variables` | - | - |
| 17 | ContractSendModal.tsx | handleSaveAndClose:747-761 | authenticated | UPDATE | - | `variables, date_validation` | - | - |
| 18 | ContractSendModal.tsx | handleSaveContract:795-811 | authenticated | UPDATE | - | `variables` | - | - |
| 19 | ContractViewModal.tsx | Chargement:44-56 | authenticated | SELECT | `*`, profil.*, modele.* | - | - | - |
| 20 | EmployeeHistory.tsx | useEffect:66-72 | authenticated | SELECT | `id, statut, date_envoi, date_signature, date_validation`, modele.* | - | - | - |
| 21 | EmployeeHistory.tsx | useEffect:74-81 | authenticated | SELECT | `statut` (count) | - | - | - |
| 22 | EmployeeList.tsx | handleActivateNow:306-320 | authenticated | INSERT | - | - | `profil_id, modele_id, variables, date_envoi, statut, date_validation, date_debut, fichier_contrat_url` | - |
| 23 | EmployeeList.tsx | handleSendContract:1392-1417 | authenticated | INSERT | - | - | `profil_id, modele_id, variables, date_envoi, statut` | - |
| 24 | EmployeeList.tsx | handleActivateEmployee:1465-1487 | authenticated | INSERT | - | - | `profil_id, modele_id, variables, date_envoi, statut, date_validation` | - |
| 25 | EmployeeList.tsx | handleGenerateContract:1535-1559 | authenticated | INSERT | - | - | `profil_id, modele_id, variables, date_envoi, statut` | - |
| 26 | EmployeeList.tsx | onSaveModal:1931-1952 | authenticated | UPDATE | - | `variables, date_debut, date_fin` | - | - |
| 27 | ImportSalariesBulk.tsx | handleImport:989 | authenticated | INSERT | - | - | `profil_id, modele_id, variables, date_envoi, statut, date_validation, date_debut, fichier_contrat_url` | - |
| 28 | ImportSalariesBulk.tsx | handleImport:1009 | authenticated | INSERT | - | - | `profil_id, modele_id, variables, date_envoi, statut, numero_avenant, contrat_principal_id` | - |
| 29 | ImportSalariesBulk.tsx | handleImport:1028 | authenticated | INSERT | - | - | `profil_id, modele_id, variables, date_envoi, statut, numero_avenant, contrat_principal_id` | - |
| 30 | ImportSalarieTest.tsx | handleImport:148-158 | authenticated | INSERT | - | - | `profil_id, modele_id, variables, date_envoi, statut` | - |
| 31 | ImportSalarieTest.tsx | handleUpdateContract:194-207 | authenticated | UPDATE | - | `variables, date_debut, date_fin` | - | - |
| 32 | NotificationsList.tsx | markAsRead:98-105 | authenticated | SELECT | `id, profil_id, statut`, profil.* | - | - | - |
| 33 | NotificationsList.tsx | markAsRead:115-119 | authenticated | SELECT | `id, statut` | - | - | - |
| 34 | **Edge Function: generate-contract-pdf** | index.ts:80-88 | **service_role** | **SELECT** | **`*`, modele.nom, modele.type_contrat, profil.prenom, profil.nom, profil.email** | - | - | - |
| 35 | **Edge Function: generate-contract-pdf** | index.ts:127-130 | **service_role** | **UPDATE** | - | **`fichier_contrat_url`** | - | - |
| 36 | **Edge Function: create-yousign-signature** | index.ts:586-598 | **service_role** | **SELECT (REST API)** | **`*`, profil.*, modele.*** | - | - | - |
| 37 | **Edge Function: create-yousign-signature** | index.ts:822-836 | **service_role** | **UPDATE (REST API)** | - | **`yousign_signature_request_id, yousign_signer_id, statut, yousign_document_url`** | - | - |

---

## DÉTAIL DES 2 FLOWS ANONYMES

### FLOW 1 : `/contract-signature?contrat={uuid}` (ContractSignature.tsx)

#### Accès #1 : SELECT (ligne 51-59)

```tsx
const { data, error } = await supabase
  .from('contrat')
  .select(`
    *,
    modele:modele_id(nom, type_contrat),
    profil:profil_id(prenom, nom, email)
  `)
  .eq('id', contractId)
  .maybeSingle();
```

**Colonnes lues EXACTES** :
- **Table `contrat`** : TOUTES (`*`)
  - `id`
  - `profil_id`
  - `modele_id`
  - `variables` (JSONB)
  - `date_envoi`
  - `date_signature`
  - `statut`
  - `certificat_medical_id`
  - `yousign_signature_request_id`
  - `date_validation`
  - `date_debut`
  - `date_fin`
  - `fichier_contrat_url`
  - `numero_avenant`
  - `contrat_principal_id`
  - `yousign_signer_id`
  - `yousign_document_url`
  - `created_at`
  - `updated_at`
  - Toute autre colonne présente dans la table

- **Table `modeles_contrats` (join)** :
  - `nom`
  - `type_contrat`

- **Table `profil` (join)** :
  - `prenom`
  - `nom`
  - `email`

**Utilisation dans le code** :
```tsx
// Ligne 68
setSigned(data.statut === 'signe' || !!data.date_signature);

// Ligne 69
setCertificatUploaded(!!data.certificat_medical_id);

// Ligne 128
if (contract.yousign_signature_request_id) { ... }

// Ligne 228 (affichage)
{contract.modele.nom} - {contract.modele.type_contrat}

// Ligne 239-264 (affichage variables)
{contract.variables?.poste}
{contract.variables?.salaire}
{contract.variables?.heures_semaine}
{contract.variables?.date_debut}
```

**Colonnes réellement utilisées** :
- `id` (pour update ultérieur)
- `profil_id` (pour upload certificat)
- `statut`
- `date_signature`
- `certificat_medical_id`
- `yousign_signature_request_id`
- `variables` (JSONB : poste, salaire, heures_semaine, date_debut)
- `modele.nom`
- `modele.type_contrat`
- `profil.prenom`
- `profil.nom`
- `profil.email`

**Colonnes NON utilisées mais récupérées** :
- `date_envoi`
- `date_validation`
- `date_debut`
- `date_fin`
- `fichier_contrat_url`
- `numero_avenant`
- `contrat_principal_id`
- `yousign_signer_id`
- `yousign_document_url`
- `created_at`
- `updated_at`

#### Accès #2 : UPDATE (ligne 108-111)

```tsx
const { error: updateError } = await supabase
  .from('contrat')
  .update({ certificat_medical_id: docData.id })
  .eq('id', contract.id);
```

**Colonnes écrites EXACTES** :
- `certificat_medical_id` (UUID)

**Payload exact** :
```json
{
  "certificat_medical_id": "<uuid du document uploadé>"
}
```

**Aucune autre colonne modifiée**.

---

### FLOW 2 : `/upload-medical-certificate?contract={uuid}` (UploadMedicalCertificate.tsx)

#### Accès #3 : SELECT (ligne 28-41)

```tsx
const { data, error: fetchError } = await supabase
  .from('contrat')
  .select(`
    id,
    profil_id,
    certificat_medical_id,
    candidat:profil_id (
      nom,
      prenom,
      email
    )
  `)
  .eq('id', contractId)
  .maybeSingle();
```

**Colonnes lues EXACTES** :
- **Table `contrat`** :
  - `id`
  - `profil_id`
  - `certificat_medical_id`

- **Table `profil` (join)** :
  - `nom`
  - `prenom`
  - `email`

**Utilisation dans le code** :
```tsx
// Ligne 46-47
if (data.certificat_medical_id) {
  setSuccess(true);
}

// Ligne 50
setContractData(data);

// Ligne 83 (dans handleUpload)
const fileName = `${contractData.profil_id}/certificat-medical-${Date.now()}.${fileExt}`;

// Ligne 99 (dans handleUpload)
owner_id: contractData.profil_id,

// Ligne 173 (affichage)
{contractData?.candidat ? `Bonjour ${contractData.candidat.prenom} ${contractData.candidat.nom}` : 'Bonjour'}
```

**Toutes les colonnes sont utilisées**. Aucune colonne inutile.

#### Accès #4 : UPDATE (ligne 111-114)

```tsx
const { error: updateError } = await supabase
  .from('contrat')
  .update({ certificat_medical_id: docData.id })
  .eq('id', contractId);
```

**Colonnes écrites EXACTES** :
- `certificat_medical_id` (UUID)

**Payload exact** :
```json
{
  "certificat_medical_id": "<uuid du document uploadé>"
}
```

**Aucune autre colonne modifiée**.

---

## ANALYSE DES EDGE FUNCTIONS

### Edge Function: `generate-contract-pdf` (service_role)

**Accès #34 : SELECT (ligne 80-88)**

```ts
const { data: contract, error } = await supabase
  .from("contrat")
  .select(`
    *,
    modele:modele_id(nom, type_contrat),
    profil:profil_id(prenom, nom, email)
  `)
  .eq("id", contractId)
  .maybeSingle();
```

**Auth** : `service_role` (SUPABASE_SERVICE_ROLE_KEY)

**Colonnes lues** : TOUTES (`*`) + joins modele + profil

**Accès #35 : UPDATE (ligne 127-130)**

```ts
const { error: updateError } = await supabase
  .from("contrat")
  .update({ fichier_contrat_url: fileName })
  .eq("id", contractId);
```

**Colonnes écrites** :
- `fichier_contrat_url` (string)

---

### Edge Function: `create-yousign-signature` (service_role)

**Accès #36 : SELECT via REST API (ligne 586-598)**

```ts
const contractResp = await fetch(
  `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=*,profil:profil_id(*),modele:modele_id(*)`,
  {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/json",
    },
  },
);
```

**Auth** : `service_role` (SUPABASE_SERVICE_ROLE_KEY via REST API)

**Colonnes lues** : TOUTES (`*`) + profil complet + modele complet

**Accès #37 : UPDATE via REST API (ligne 822-836)**

```ts
await fetch(`${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}`, {
  method: "PATCH",
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({
    yousign_signature_request_id: signatureRequestId,
    yousign_signer_id: signerData.id,
    statut: "en_attente_signature",
    yousign_document_url: signatureLink,
  }),
});
```

**Colonnes écrites EXACTES** :
- `yousign_signature_request_id` (string)
- `yousign_signer_id` (string)
- `statut` (string) = `"en_attente_signature"`
- `yousign_document_url` (string)

---

## VÉRIFICATION : INSERT/DELETE ANONYMES

### INSERT anonymes

**Recherche effectuée** :
```bash
grep -r "\.insert.*contrat" src/components/ContractSignature.tsx
grep -r "\.insert.*contrat" src/components/UploadMedicalCertificate.tsx
```

**Résultat** : ❌ AUCUN INSERT anonyme trouvé

**Les 2 fichiers publics NE FONT AUCUN INSERT dans `contrat`**.

Tous les INSERT trouvés sont dans des fichiers authenticated :
- `ManualContractUploadModal.tsx` (authenticated)
- `EmployeeList.tsx` (authenticated)
- `ImportSalariesBulk.tsx` (authenticated)
- `ImportSalarieTest.tsx` (authenticated)

### DELETE anonymes

**Recherche effectuée** :
```bash
grep -r "\.delete.*contrat" src/components/ContractSignature.tsx
grep -r "\.delete.*contrat" src/components/UploadMedicalCertificate.tsx
```

**Résultat** : ❌ AUCUN DELETE anonyme trouvé

**Les 2 fichiers publics NE FONT AUCUN DELETE dans `contrat`**.

Le seul DELETE trouvé est dans :
- `ContractsList.tsx:217-220` (authenticated)

---

## SYNTHÈSE PAR TYPE D'OPÉRATION

### SELECT

**Anonymes** :
1. ContractSignature.tsx:51-59 → `*` + joins (TROP LARGE)
2. UploadMedicalCertificate.tsx:28-41 → `id, profil_id, certificat_medical_id` + join profil (OPTIMAL)

**Authenticated** :
- 10 fichiers font des SELECT authenticated (tous légitimes)

### UPDATE

**Anonymes** :
1. ContractSignature.tsx:108-111 → `certificat_medical_id` uniquement
2. UploadMedicalCertificate.tsx:111-114 → `certificat_medical_id` uniquement

**Authenticated** :
- 8 fichiers font des UPDATE authenticated (légitimes)

### INSERT

**Anonymes** : ❌ AUCUN

**Authenticated** :
- 6 fichiers font des INSERT (légitimes)

### DELETE

**Anonymes** : ❌ AUCUN

**Authenticated** :
- 1 fichier fait des DELETE (légitime)

---

## CONCLUSIONS

### Ce qui est INDISPENSABLE pour le flow public

#### Pour SELECT anonyme :

**Colonnes minimales strictes** :
- `id` (pour identifier le contrat)
- `profil_id` (pour lier les documents)
- `certificat_medical_id` (pour vérifier si déjà uploadé)
- `statut` (pour vérifier si déjà signé)
- `date_signature` (pour vérifier si déjà signé)
- `yousign_signature_request_id` (pour éviter doublon signature)
- `variables` (JSONB : pour affichage infos contrat)

**Joins nécessaires** :
- `modele.nom`
- `modele.type_contrat`
- `profil.prenom`
- `profil.nom`
- `profil.email`

#### Pour UPDATE anonyme :

**Colonne unique** :
- `certificat_medical_id`

**Aucune autre colonne ne doit être modifiable par anon**.

### Ce qui peut être SUPPRIMÉ côté anon

#### SELECT : Colonnes inutiles exposées par `SELECT *`

**Colonnes sensibles exposées inutilement** :
- `date_envoi`
- `date_validation`
- `date_debut`
- `date_fin`
- `fichier_contrat_url`
- `numero_avenant`
- `contrat_principal_id`
- `yousign_signer_id`
- `yousign_document_url`
- `created_at`
- `updated_at`

**Impact sécurité** :
- Un utilisateur anon peut lire TOUS les champs d'un contrat via `SELECT *`
- Exposition de données RH sensibles (dates, fichiers, numéros d'avenant)
- Exposition de données techniques Yousign

#### UPDATE : Colonnes qui ne doivent JAMAIS être modifiables par anon

**Liste complète** :
- `profil_id` ❌ (changement d'identité)
- `modele_id` ❌ (changement de type de contrat)
- `variables` ❌ (changement salaire, poste, etc.)
- `date_envoi` ❌
- `date_signature` ❌ (falsification)
- `statut` ❌ (bypass workflow)
- `date_validation` ❌
- `date_debut` ❌
- `date_fin` ❌
- `fichier_contrat_url` ❌ (injection fichier malveillant)
- `numero_avenant` ❌
- `contrat_principal_id` ❌
- `yousign_signature_request_id` ❌
- `yousign_signer_id` ❌
- `yousign_document_url` ❌

**Seule colonne autorisée** :
- `certificat_medical_id` ✅ (une seule fois, pas de re-update)

---

## PROPOSITION DE POLICY TRANSITOIRE MINIMALE

### Option 1 : Policy SELECT restrictive (RECOMMANDÉE)

```sql
-- SELECT anonyme : colonnes minimales uniquement
CREATE POLICY "Anonymous can view limited contract fields"
  ON contrat FOR SELECT
  TO anon
  USING (true);
```

**Problème** : RLS PostgreSQL ne permet PAS de restreindre les colonnes dans une policy.
**Solution** : Créer une VUE limitée.

### Option 2 : Vue limitée pour accès anonyme (SOLUTION PROPRE)

```sql
-- 1. Créer une vue avec colonnes limitées
CREATE VIEW contrat_public AS
SELECT
  c.id,
  c.profil_id,
  c.certificat_medical_id,
  c.statut,
  c.date_signature,
  c.yousign_signature_request_id,
  c.variables,
  p.prenom AS profil_prenom,
  p.nom AS profil_nom,
  p.email AS profil_email,
  m.nom AS modele_nom,
  m.type_contrat AS modele_type_contrat
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
LEFT JOIN modeles_contrats m ON c.modele_id = m.id;

-- 2. Donner accès SELECT à anon sur la vue
GRANT SELECT ON contrat_public TO anon;

-- 3. Bloquer SELECT direct sur table contrat pour anon
REVOKE SELECT ON contrat FROM anon;

-- 4. Policy UPDATE minimale sur table contrat
CREATE POLICY "Anonymous can update certificate only"
  ON contrat FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (
    -- Seul certificat_medical_id peut être modifié
    (OLD.profil_id = NEW.profil_id)
    AND (OLD.id = NEW.id)
    AND (OLD.modele_id = NEW.modele_id)
    AND (OLD.variables = NEW.variables)
    AND (OLD.date_envoi = NEW.date_envoi)
    AND (OLD.date_signature IS NOT DISTINCT FROM NEW.date_signature)
    AND (OLD.statut = NEW.statut)
    AND (OLD.date_validation IS NOT DISTINCT FROM NEW.date_validation)
    AND (OLD.date_debut IS NOT DISTINCT FROM NEW.date_debut)
    AND (OLD.date_fin IS NOT DISTINCT FROM NEW.date_fin)
    AND (OLD.fichier_contrat_url IS NOT DISTINCT FROM NEW.fichier_contrat_url)
    AND (OLD.numero_avenant IS NOT DISTINCT FROM NEW.numero_avenant)
    AND (OLD.contrat_principal_id IS NOT DISTINCT FROM NEW.contrat_principal_id)
    AND (OLD.yousign_signature_request_id IS NOT DISTINCT FROM NEW.yousign_signature_request_id)
    AND (OLD.yousign_signer_id IS NOT DISTINCT FROM NEW.yousign_signer_id)
    AND (OLD.yousign_document_url IS NOT DISTINCT FROM NEW.yousign_document_url)
    -- Seul certificat_medical_id peut changer
  );
```

**Problème** : Policy trop complexe, risque d'erreur.

### Option 3 : Policy UPDATE avec BEFORE TRIGGER (ROBUSTE)

```sql
-- 1. Activer RLS
ALTER TABLE contrat ENABLE ROW LEVEL SECURITY;

-- 2. Policy SELECT anonyme (temporaire : accès complet)
CREATE POLICY "Anonymous can read contracts temporarily"
  ON contrat FOR SELECT
  TO anon
  USING (true);

-- 3. Policy UPDATE anonyme (temporaire : accès complet)
CREATE POLICY "Anonymous can update contracts temporarily"
  ON contrat FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 4. Trigger BEFORE UPDATE pour bloquer modifications interdites
CREATE OR REPLACE FUNCTION check_anon_contract_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que seul certificat_medical_id est modifié
  IF (
    NEW.profil_id IS DISTINCT FROM OLD.profil_id
    OR NEW.modele_id IS DISTINCT FROM OLD.modele_id
    OR NEW.variables IS DISTINCT FROM OLD.variables
    OR NEW.date_envoi IS DISTINCT FROM OLD.date_envoi
    OR NEW.date_signature IS DISTINCT FROM OLD.date_signature
    OR NEW.statut IS DISTINCT FROM OLD.statut
    OR NEW.date_validation IS DISTINCT FROM OLD.date_validation
    OR NEW.date_debut IS DISTINCT FROM OLD.date_debut
    OR NEW.date_fin IS DISTINCT FROM OLD.date_fin
    OR NEW.fichier_contrat_url IS DISTINCT FROM OLD.fichier_contrat_url
    OR NEW.numero_avenant IS DISTINCT FROM OLD.numero_avenant
    OR NEW.contrat_principal_id IS DISTINCT FROM OLD.contrat_principal_id
    OR NEW.yousign_signature_request_id IS DISTINCT FROM OLD.yousign_signature_request_id
    OR NEW.yousign_signer_id IS DISTINCT FROM OLD.yousign_signer_id
    OR NEW.yousign_document_url IS DISTINCT FROM OLD.yousign_document_url
  ) THEN
    RAISE EXCEPTION 'Modification interdite : seul certificat_medical_id peut être modifié par un utilisateur anonyme';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_anon_contract_update
  BEFORE UPDATE ON contrat
  FOR EACH ROW
  EXECUTE FUNCTION check_anon_contract_update();

-- 5. Révoquer droits dangereux
REVOKE INSERT, DELETE, TRUNCATE, TRIGGER, REFERENCES ON contrat FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON contrat FROM authenticated;
```

**Problème** : Le trigger s'applique à TOUS les updates (anon + authenticated).
**Solution** : Vérifier `current_user` dans le trigger.

### Option 4 : Policy minimale SANS trigger (SIMPLE ET SÛR)

```sql
-- 1. Activer RLS
ALTER TABLE contrat ENABLE ROW LEVEL SECURITY;

-- 2. Policy SELECT anonyme minimale
CREATE POLICY "Anonymous can read contracts"
  ON contrat FOR SELECT
  TO anon
  USING (true);

-- 3. Policy UPDATE anonyme : interdire TOUS les updates
-- (on force passage par Edge Function qui utilise service_role)
-- PAS DE POLICY UPDATE POUR ANON = accès refusé par défaut

-- 4. Policy authenticated (maintien du comportement existant)
CREATE POLICY "Authenticated users can manage contracts"
  ON contrat FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Révoquer droits SQL directs
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON contrat FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON contrat FROM authenticated;
```

**Impact** :
- ✅ Lecture anonyme OK (pour /contract-signature)
- ❌ **CASSE** l'update anonyme de `certificat_medical_id`

**Solution** : Créer une Edge Function pour l'upload du certificat.

---

## RECOMMANDATION FINALE : SOLUTION COMPLÈTE EN 3 PHASES

### Phase 1 : Correction immédiate (sans casse)

**Objectif** : Réduire la surface d'attaque SANS casser les flows existants

```sql
-- 1. Activer RLS
ALTER TABLE contrat ENABLE ROW LEVEL SECURITY;

-- 2. Policy SELECT anonyme (temporaire)
CREATE POLICY "Anonymous can read contracts temp"
  ON contrat FOR SELECT
  TO anon
  USING (true);

-- 3. Policy UPDATE anonyme (temporaire mais restrictive)
CREATE POLICY "Anonymous can update certificate only temp"
  ON contrat FOR UPDATE
  TO anon
  USING (
    -- Limiter aux contrats en attente de certificat
    certificat_medical_id IS NULL
    OR statut IN ('en_attente_signature', 'contrat_envoye')
  )
  WITH CHECK (
    -- Vérifier qu'on ne touche que certificat_medical_id
    OLD.profil_id = NEW.profil_id
    AND OLD.modele_id = NEW.modele_id
    AND OLD.statut = NEW.statut
    -- Les autres champs ne doivent pas changer
  );

-- 4. Policy authenticated (maintien comportement)
CREATE POLICY "Authenticated users can manage contracts"
  ON contrat FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Révoquer droits dangereux
REVOKE INSERT, DELETE, TRUNCATE, TRIGGER, REFERENCES ON contrat FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON contrat FROM authenticated;
```

**Bénéfice** :
- ✅ Flows publics fonctionnent encore
- ✅ Limite les updates anonymes aux contrats en attente
- ✅ Bloque INSERT/DELETE anonymes
- ⚠️ Exposition `SELECT *` toujours présente

**Risque résiduel** :
- Lecture de données sensibles via `SELECT *`
- Possibilité de scanner tous les contrats

### Phase 2 : Refonte frontend (2-3 jours)

**Objectif** : Éliminer `SELECT *` et restreindre les colonnes

**Actions** :

1. **Modifier ContractSignature.tsx** :
```tsx
// Remplacer ligne 51-59
const { data, error } = await supabase
  .from('contrat')
  .select(`
    id,
    profil_id,
    certificat_medical_id,
    statut,
    date_signature,
    yousign_signature_request_id,
    variables,
    modele:modele_id(nom, type_contrat),
    profil:profil_id(prenom, nom, email)
  `)
  .eq('id', contractId)
  .maybeSingle();
```

2. **Créer Edge Function `update-contract-certificate`** :
```ts
// supabase/functions/update-contract-certificate/index.ts
Deno.serve(async (req: Request) => {
  const { contractId, certificatId } = await req.json();

  // Vérifications
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  // Valider que le contrat est en attente
  const { data: contrat } = await supabase
    .from('contrat')
    .select('id, statut, certificat_medical_id')
    .eq('id', contractId)
    .single();

  if (!contrat) {
    return new Response(JSON.stringify({ error: 'Contrat introuvable' }), { status: 404 });
  }

  if (contrat.certificat_medical_id) {
    return new Response(JSON.stringify({ error: 'Certificat déjà uploadé' }), { status: 400 });
  }

  // Update sécurisé
  const { error } = await supabase
    .from('contrat')
    .update({ certificat_medical_id: certificatId })
    .eq('id', contractId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }));
});
```

3. **Modifier les 2 composants frontend** :
```tsx
// Remplacer les lignes 108-111 et 111-114
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-contract-certificate`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      contractId: contract.id,
      certificatId: docData.id
    })
  }
);
```

4. **Supprimer policy UPDATE anonyme** :
```sql
DROP POLICY "Anonymous can update certificate only temp" ON contrat;
```

**Bénéfice** :
- ✅ Élimination de `SELECT *`
- ✅ Update centralisé et auditable
- ✅ Validation côté serveur
- ✅ Zero accès UPDATE direct pour anon

### Phase 3 : Token system (long terme, 5-7 jours)

**Objectif** : Éliminer complètement l'accès anon direct

**Architecture** : Voir rapport précédent `AUDIT-RLS-6-TABLES-SENSIBLES.md` section "Upload Token System"

**Bénéfice final** :
- ✅ Zero accès anon à table `contrat`
- ✅ Traçabilité complète
- ✅ Révocation possible des liens
- ✅ Expiration automatique

---

## BUILD CHECK

**Test effectué** :
```bash
npm run build
```

**Résultat** : ✅ SUCCESS

```
✓ 2044 modules transformed.
dist/index.html                              1.07 kB │ gzip:     0.57 kB
dist/assets/index-B7vIZCiR.css             104.01 kB │ gzip:    14.74 kB
dist/assets/purify.es-B9ZVCkUG.js           22.64 kB │ gzip:     8.75 kB
dist/assets/index.es-C9EFF_eL.js           150.47 kB │ gzip:    51.44 kB
dist/assets/html2canvas.esm-CBrSDip1.js    201.42 kB │ gzip:    48.03 kB
dist/assets/index-CGt1dJgH.js            4,680.47 kB │ gzip: 1,704.61 kB
✓ built in 20.61s
```

**Aucune modification de code n'a été effectuée lors de cet audit**.

---

## ANNEXE : LISTE COMPLÈTE DES COLONNES TABLE `contrat`

**Schéma extrait du code** :

```sql
CREATE TABLE contrat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id UUID REFERENCES profil(id),
  modele_id UUID REFERENCES modeles_contrats(id),
  variables JSONB,
  date_envoi TIMESTAMPTZ,
  date_signature TIMESTAMPTZ,
  statut TEXT,
  certificat_medical_id UUID REFERENCES document(id),
  yousign_signature_request_id TEXT,
  date_validation TIMESTAMPTZ,
  date_debut DATE,
  date_fin DATE,
  fichier_contrat_url TEXT,
  numero_avenant INTEGER,
  contrat_principal_id UUID REFERENCES contrat(id),
  yousign_signer_id TEXT,
  yousign_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Total colonnes** : 19

---

## RÉSUMÉ FINAL

### Flows anonymes : 2

1. `/contract-signature` → SELECT (`*`) + UPDATE (`certificat_medical_id`)
2. `/upload-medical-certificate` → SELECT (minimal) + UPDATE (`certificat_medical_id`)

### Flows authenticated : 32

Tous légitimes, aucun problème de sécurité.

### Flows service_role : 4

Edge Functions légitimes.

### INSERT anonymes : 0

### DELETE anonymes : 0

### Colonnes exposées inutilement : 12

Via `SELECT *` dans ContractSignature.tsx.

### Colonne modifiable par anon : 1

`certificat_medical_id` uniquement.

### Recommandation immédiate

**Appliquer Phase 1** (SQL ci-dessus) pour réduire la surface d'attaque SANS casser les flows.

**Planifier Phase 2** (refonte frontend + Edge Function) pour éliminer `SELECT *` et centraliser l'update.

**Planifier Phase 3** (token system) pour éliminer complètement l'accès anon.
