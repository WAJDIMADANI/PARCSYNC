# AUDIT TECHNIQUE - 7 TABLES SENSIBLES

**Date**: 2026-03-25
**Objectif**: Identifier TOUS les accès aux 7 tables sensibles et leur contexte d'authentification
**Tables auditées**:
- `demande_standard`
- `employee_events`
- `incident_historique`
- `incident`
- `locataire_externe`
- `maintenance`
- `modeles_contrats`

---

## RÉSUMÉ EXÉCUTIF

### ⚠️ DÉCOUVERTE CRITIQUE : Accès ANONYME à `demandes_externes`

**Route publique** : `/demande-externe` (ligne 145-147 dans App.tsx)

**Composant** : `DemandeExterne.tsx` (PUBLIC, sans auth)

**Tables accédées** :
- ✅ `profil` (SELECT : lecture matricule)
- ✅ `poles` (SELECT : liste des pôles)
- ✅ `app_utilisateur` (SELECT : pour notifications)
- ⚠️ **`demandes_externes` (INSERT : création de demande)**
- ⚠️ **`inbox` (INSERT : création de notifications)**

**Impact** :
- Un utilisateur NON CONNECTÉ peut créer des demandes externes
- Nécessite un matricule valide pour fonctionner
- Upload de fichiers dans storage `demandes-externes`
- Création de notifications inbox pour les utilisateurs du pôle

**Note** : Ce n'est pas une des 7 tables auditées, mais c'est une découverte importante.

---

### Résultats pour les 7 tables auditées

| Table | Accès PUBLIC | Accès AUTHENTIFIÉ | Total Accès |
|-------|-------------|-------------------|-------------|
| `demande_standard` | ❌ AUCUN | ✅ 6 | 6 |
| `employee_events` | ❌ AUCUN | ❌ AUCUN | 0 |
| `incident_historique` | ❌ AUCUN | ✅ 1 | 1 |
| `incident` | ❌ AUCUN | ✅ 1 | 1 |
| `locataire_externe` | ❌ AUCUN | ✅ 4 | 4 |
| `maintenance` | ❌ AUCUN | ✅ 2 | 2 |
| `modeles_contrats` | ❌ AUCUN | ✅ 9 | 9 |

**Conclusion générale** :

✅ **AUCUN accès public direct aux 7 tables auditées**

✅ Tous les accès sont dans des composants authentifiés (via Dashboard)

✅ Pas d'exposition via QR code ou lien public

---

## ROUTES PUBLIQUES IDENTIFIÉES (App.tsx)

**Liste complète des routes publiques** (lignes 121-151) :

1. `/apply` → Apply.tsx
2. `/applysite` → Apply.tsx
3. `/onboarding` → OnboardingForm.tsx
4. `/contract-signature` → ContractSignature.tsx
5. `/upload-medical-certificate` → UploadMedicalCertificate.tsx
6. `/upload-all-documents` → UploadAllMissingDocuments.tsx
7. **`/demande-externe` → DemandeExterne.tsx** ⚠️
8. `/set-password` → SetPassword.tsx

**Tables accédées par routes publiques** :

| Route | Tables |
|-------|--------|
| `/apply` | `site`, `secteur`, `poste`, `candidatures`, `candidat` |
| `/onboarding` | `candidat`, `site`, `secteur`, `candidatures`, `profil`, `document` |
| `/contract-signature` | `contrat`, `documents`, `document` |
| `/upload-medical-certificate` | `contrat`, `documents`, `document` |
| `/upload-all-documents` | `upload_tokens`, `profil`, `document`, `documents` |
| **`/demande-externe`** | **`profil`, `poles`, `demandes-externes`, `app_utilisateur`, `inbox`** |
| `/set-password` | (auth uniquement) |

**Aucune des 7 tables auditées n'est accédée par les routes publiques**.

---

## TABLE 1 : `demande_standard`

### Vue d'ensemble

**Total accès** : 6
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ✅ 6

### Détail des accès

| # | Fichier | Ligne | Fonction | Opération | Contexte | Accessible sans auth |
|---|---------|-------|----------|-----------|----------|---------------------|
| 1 | DemandesPage.tsx | 111 | fetchDemandes | SELECT | Authenticated (Dashboard) | ❌ NON |
| 2 | DemandesPage.tsx | 195 | handleCreateDemande | INSERT | Authenticated (Dashboard) | ❌ NON |
| 3 | DemandesPage.tsx | 240 | updateStatut | UPDATE | Authenticated (Dashboard) | ❌ NON |
| 4 | DemandesPage.tsx | 258 | saveNotes | UPDATE | Authenticated (Dashboard) | ❌ NON |
| 5 | DemandesPage.tsx | 317 | fetchEmployeeHistory | SELECT | Authenticated (Dashboard) | ❌ NON |
| 6 | RHDashboard.tsx | 614 | fetchStats | SELECT | Authenticated (Dashboard) | ❌ NON |

### Code source exact

#### Accès #1 : SELECT (DemandesPage.tsx:111-118)

```tsx
const { data, error } = await supabase
  .from('demande_standard')
  .select(`
    *,
    profil:profil_id(id, nom, prenom, tel, email, matricule_tca),
    creator:created_by(nom, prenom),
    treater:treated_by(nom, prenom)
  `)
  .order('created_at', { ascending: false });
```

**Colonnes** : `*` (toutes) + joins profil, creator, treater

#### Accès #2 : INSERT (DemandesPage.tsx:195-207)

```tsx
const { error: insertError } = await supabase
  .from('demande_standard')
  .insert({
    profil_id: formData.profil_id,
    nom_salarie: formData.nom_salarie || null,
    prenom_salarie: formData.prenom_salarie || null,
    tel_salarie: formData.tel_salarie || null,
    email_salarie: formData.email_salarie || null,
    matricule_salarie: formData.matricule_salarie || null,
    type_demande: formData.type_demande,
    description: formData.description,
    priorite: formData.priorite,
    created_by: appUserData.id,
  });
```

**Colonnes** : `profil_id`, `nom_salarie`, `prenom_salarie`, `tel_salarie`, `email_salarie`, `matricule_salarie`, `type_demande`, `description`, `priorite`, `created_by`

#### Accès #3 : UPDATE (DemandesPage.tsx:240-242)

```tsx
const { error } = await supabase
  .from('demande_standard')
  .update(updates)
  .eq('id', demandeId);
```

**Colonnes** : `statut`, `treated_by`, `treated_at` (conditionnels)

#### Accès #4 : UPDATE (DemandesPage.tsx:258-260)

```tsx
const { error } = await supabase
  .from('demande_standard')
  .update({ notes_resolution: notes })
  .eq('id', selectedDemande.id);
```

**Colonnes** : `notes_resolution`

#### Accès #5 : SELECT (DemandesPage.tsx:317-324)

```tsx
const { data, error } = await supabase
  .from('demande_standard')
  .select(`
    *,
    creator:created_by(nom, prenom),
    treater:treated_by(nom, prenom)
  `)
  .eq('profil_id', profilId)
  .order('created_at', { ascending: false});
```

**Colonnes** : `*` (toutes) + joins creator, treater

#### Accès #6 : SELECT (RHDashboard.tsx:614)

```tsx
// Lecture pour statistiques dashboard RH
const { data } = await supabase.from('demande_standard').select('*');
```

**Colonnes** : `*` (toutes)

### Protection

✅ **DemandesPage.tsx** est importé dans Dashboard.tsx (ligne 32)
✅ Dashboard.tsx est protégé par AuthProvider et PermissionsProvider (App.tsx ligne 155-156)
✅ PermissionGuard est utilisé dans DemandesPage.tsx (ligne 3)

**Accès authentifié requis** : OUI

---

## TABLE 2 : `employee_events`

### Vue d'ensemble

**Total accès** : 0
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ❌ AUCUN

### Résultat

✅ **Aucun accès trouvé** à la table `employee_events` dans tout le projet src/.

**Note** : Cette table n'est peut-être pas encore utilisée, ou est uniquement gérée côté backend via triggers SQL.

---

## TABLE 3 : `incident_historique`

### Vue d'ensemble

**Total accès** : 1
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ✅ 1

### Détail des accès

| # | Fichier | Ligne | Fonction | Opération | Contexte | Accessible sans auth |
|---|---------|-------|----------|-----------|----------|---------------------|
| 1 | IncidentHistory.tsx | 57 | fetchHistory | SELECT | Authenticated (Dashboard) | ❌ NON |

### Code source exact

#### Accès #1 : SELECT (IncidentHistory.tsx:57-69)

```tsx
const { data, error } = await supabase
  .from('incident_historique')
  .select(`
    *,
    incident:incident_id (
      type,
      profil_id,
      profil:profil_id (
        prenom,
        nom
      )
    )
  `)
  .order('created_at', { ascending: false });
```

**Colonnes** : `*` (toutes) + join incident avec profil imbriqué

### Protection

✅ **IncidentHistory.tsx** est importé dans Dashboard.tsx (ligne 30)
✅ Dashboard.tsx est protégé par AuthProvider et PermissionsProvider
✅ Appelé uniquement via Dashboard (ligne 102)

**Accès authentifié requis** : OUI

---

## TABLE 4 : `incident`

### Vue d'ensemble

**Total accès** : 1
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ✅ 1

### Détail des accès

| # | Fichier | Ligne | Fonction | Opération | Contexte | Accessible sans auth |
|---|---------|-------|----------|-----------|----------|---------------------|
| 1 | IncidentHistory.tsx | 83 | fetchStats | SELECT | Authenticated (Dashboard) | ❌ NON |

### Code source exact

#### Accès #1 : SELECT (IncidentHistory.tsx:83-84)

```tsx
const { data: incidents, error } = await supabase
  .from('incident')
  .select('*');
```

**Colonnes** : `*` (toutes)

**Utilisation** : Calcul de statistiques (total, résolus, en cours, temps moyen de résolution, par type)

### Protection

✅ **IncidentHistory.tsx** est importé dans Dashboard.tsx (ligne 30)
✅ Dashboard.tsx est protégé par AuthProvider et PermissionsProvider
✅ Appelé uniquement via Dashboard

**Accès authentifié requis** : OUI

---

## TABLE 5 : `locataire_externe`

### Vue d'ensemble

**Total accès** : 4
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ✅ 4

### Détail des accès

| # | Fichier | Ligne | Fonction | Opération | Contexte | Accessible sans auth |
|---|---------|-------|----------|-----------|----------|---------------------|
| 1 | LocatairesExternesManager.tsx | 86 | loadLocataires | SELECT | Authenticated (Dashboard) | ❌ NON |
| 2 | LocatairesExternesManager.tsx | 168 | handleUpdateLocataire | UPDATE | Authenticated (Dashboard) | ❌ NON |
| 3 | LocatairesExternesManager.tsx | 196 | handleToggleActif | UPDATE | Authenticated (Dashboard) | ❌ NON |
| 4 | LocatairesExternesManager.tsx | 220 | handleCreateLocataire | INSERT | Authenticated (Dashboard) | ❌ NON |

### Code source exact

#### Accès #1 : SELECT (LocatairesExternesManager.tsx:86-106)

```tsx
let query = supabase
  .from('locataire_externe')
  .select('*', { count: 'exact' })
  .order('nom');

if (typeFilter !== 'all') {
  query = query.eq('type', typeFilter);
}

if (actifFilter !== 'all') {
  query = query.eq('actif', actifFilter === 'actif');
}

if (searchTerm) {
  query = query.ilike('nom', `%${searchTerm}%`);
}

const from = (currentPage - 1) * itemsPerPage;
const to = from + itemsPerPage - 1;
query = query.range(from, to);

const { data, error, count } = await query;
```

**Colonnes** : `*` (toutes)

**Filtres** : type, actif, nom (search), pagination

#### Accès #2 : UPDATE (LocatairesExternesManager.tsx:168-176)

```tsx
const { error } = await supabase
  .from('locataire_externe')
  .update({
    nom: editFormData.nom,
    telephone: editFormData.telephone || null,
    email: editFormData.email || null,
    adresse: editFormData.adresse || null,
    notes: editFormData.notes || null
  })
  .eq('id', selectedLocataire.id);
```

**Colonnes** : `nom`, `telephone`, `email`, `adresse`, `notes`

#### Accès #3 : UPDATE (LocatairesExternesManager.tsx:196-198)

```tsx
const { error } = await supabase
  .from('locataire_externe')
  .update({ actif: !locataire.actif })
  .eq('id', locataire.id);
```

**Colonnes** : `actif`

#### Accès #4 : INSERT (LocatairesExternesManager.tsx:220-229)

```tsx
const { data, error } = await supabase
  .from('locataire_externe')
  .insert([{
    type: createType,
    nom: createFormData.nom.trim(),
    telephone: createFormData.telephone.trim() || null,
    email: createFormData.email.trim() || null,
    adresse: createFormData.adresse.trim() || null,
    notes: createFormData.notes.trim() || null,
    actif: true
  }])
```

**Colonnes** : `type`, `nom`, `telephone`, `email`, `adresse`, `notes`, `actif`

### Protection

✅ **LocatairesExternesManager.tsx** est importé dans Dashboard.tsx (ligne 45)
✅ Dashboard.tsx est protégé par AuthProvider et PermissionsProvider
✅ Appelé uniquement via Dashboard (ligne 118)
✅ Pas de PermissionGuard explicite, mais protégé par le routing Dashboard

**Accès authentifié requis** : OUI

---

## TABLE 6 : `maintenance`

### Vue d'ensemble

**Total accès** : 2
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ✅ 2

### Détail des accès

| # | Fichier | Ligne | Fonction | Opération | Contexte | Accessible sans auth |
|---|---------|-------|----------|-----------|----------|---------------------|
| 1 | MaintenanceList.tsx | 39 | fetchMaintenances | SELECT | Authenticated (Dashboard) | ❌ NON |
| 2 | ParcDashboard.tsx | 41 | fetchMaintenancesStats | SELECT | Authenticated (Dashboard) | ❌ NON |

### Code source exact

#### Accès #1 : SELECT (MaintenanceList.tsx:39-41)

```tsx
const { data, error } = await supabase
  .from('maintenance')
  .select('*, vehicule:vehicule_id(id, immatriculation, marque, modele)')
  .order('date_maintenance', { ascending: false });
```

**Colonnes** : `*` (toutes) + join vehicule

#### Accès #2 : SELECT (ParcDashboard.tsx:41)

```tsx
// Lecture pour statistiques parc automobile
const { data: maintenances } = await supabase
  .from('maintenance')
  .select('*');
```

**Colonnes** : `*` (toutes)

**Utilisation** : Calcul de statistiques (coûts totaux, nombre de maintenances, etc.)

### Protection

✅ **MaintenanceList.tsx** est importé dans Dashboard.tsx (ligne 15)
✅ **ParcDashboard.tsx** est importé dans Dashboard.tsx
✅ Dashboard.tsx est protégé par AuthProvider et PermissionsProvider
✅ Appelés uniquement via Dashboard (lignes 122, module Parc)

**Accès authentifié requis** : OUI

---

## TABLE 7 : `modeles_contrats`

### Vue d'ensemble

**Total accès** : 9
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ✅ 9

### Détail des accès

| # | Fichier | Ligne | Fonction | Opération | Contexte | Accessible sans auth |
|---|---------|-------|----------|-----------|----------|---------------------|
| 1 | ContractSendModal.tsx | 422 | loadContractModels | SELECT | Authenticated (Dashboard) | ❌ NON |
| 2 | ContractTemplates.tsx | 123 | fetchTemplates | SELECT | Authenticated (Dashboard) | ❌ NON |
| 3 | ContractTemplates.tsx | 166 | handleDeleteTemplate | DELETE | Authenticated (Dashboard) | ❌ NON |
| 4 | ContractTemplates.tsx | 193 | handleRestoreTemplate | UPDATE | Authenticated (Dashboard) | ❌ NON |
| 5 | ContractTemplates.tsx | 212 | saveTemplate | INSERT/UPDATE | Authenticated (Dashboard) | ❌ NON |
| 6 | ContractTemplates.tsx | 489 | handleAddCustomVariable | UPDATE | Authenticated (Dashboard) | ❌ NON |
| 7 | ContractViewModal.tsx | 65 | fetchModele | SELECT | Authenticated (Dashboard) | ❌ NON |
| 8 | ContractsList.tsx | 95 | fetchContracts | SELECT | Authenticated (Dashboard) | ❌ NON |
| 9 | ManualContractUploadModal.tsx | 62 | loadModels | SELECT | Authenticated (Dashboard) | ❌ NON |

### Code source exact

#### Accès #1 : SELECT (ContractSendModal.tsx:422)

```tsx
const { data: modeles } = await supabase
  .from('modeles_contrats')
  .select('id, nom, type_contrat')
  .is('deleted_at', null)
  .order('nom');
```

**Colonnes** : `id`, `nom`, `type_contrat`

**Filtre** : `deleted_at IS NULL`

#### Accès #2 : SELECT (ContractTemplates.tsx:123-136)

```tsx
const { data, error } = await supabase
  .from('modeles_contrats')
  .select('*')
  .order('created_at', { ascending: false });
```

**Colonnes** : `*` (toutes)

#### Accès #3 : DELETE (ContractTemplates.tsx:166-172)

```tsx
const { error } = await supabase
  .from('modeles_contrats')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', id);
```

**Note** : Soft delete (UPDATE `deleted_at`)

**Colonnes** : `deleted_at`

#### Accès #4 : UPDATE (ContractTemplates.tsx:193-199)

```tsx
const { error } = await supabase
  .from('modeles_contrats')
  .update({ deleted_at: null })
  .eq('id', id);
```

**Colonnes** : `deleted_at`

#### Accès #5 : INSERT/UPDATE (ContractTemplates.tsx:212-262)

**INSERT (ligne 223-231)** :
```tsx
const { data: inserted, error: insertError } = await supabase
  .from('modeles_contrats')
  .insert([{
    nom: formData.nom,
    type_contrat: formData.type_contrat,
    fichier_url: uploadedPath,
    contenu_html: formData.contenu_html || null,
    variables_predefinies: formData.variables_predefinies || [],
  }])
```

**Colonnes** : `nom`, `type_contrat`, `fichier_url`, `contenu_html`, `variables_predefinies`

**UPDATE (ligne 244-251)** :
```tsx
const { error: updateError } = await supabase
  .from('modeles_contrats')
  .update({
    nom: formData.nom,
    type_contrat: formData.type_contrat,
    fichier_url: uploadedPath || existingModele.fichier_url,
    contenu_html: formData.contenu_html || null,
  })
```

**Colonnes** : `nom`, `type_contrat`, `fichier_url`, `contenu_html`

#### Accès #6 : UPDATE (ContractTemplates.tsx:489-495)

```tsx
const { error } = await supabase
  .from('modeles_contrats')
  .update({
    variables_predefinies: currentModele.variables_predefinies || []
  })
  .eq('id', currentModele.id);
```

**Colonnes** : `variables_predefinies`

#### Accès #7 : SELECT (ContractViewModal.tsx:65-68)

```tsx
const { data: modeleData } = await supabase
  .from('modeles_contrats')
  .select('nom, type_contrat')
  .eq('id', modele_id)
  .single();
```

**Colonnes** : `nom`, `type_contrat`

#### Accès #8 : SELECT (ContractsList.tsx:95-97)

```tsx
const { data: modeles, error: modelesError } = await supabase
  .from('modeles_contrats')
  .select('id, nom, type_contrat')
  .in('id', modeleIds);
```

**Colonnes** : `id`, `nom`, `type_contrat`

#### Accès #9 : SELECT (ManualContractUploadModal.tsx:62-67)

```tsx
const { data, error } = await supabase
  .from('modeles_contrats')
  .select('id, nom, type_contrat')
  .is('deleted_at', null)
  .order('nom');
```

**Colonnes** : `id`, `nom`, `type_contrat`

**Filtre** : `deleted_at IS NULL`

### Protection

✅ Tous les composants sont importés dans Dashboard.tsx ou appelés depuis Dashboard
✅ Dashboard.tsx est protégé par AuthProvider et PermissionsProvider
✅ ContractTemplates.tsx utilise PermissionGuard

**Accès authentifié requis** : OUI

---

## VÉRIFICATION SPÉCIFIQUE : `locataire_externe`

### Question : Y a-t-il un accès depuis une page publique ?

**Réponse** : ❌ NON

**Preuves** :
1. LocatairesExternesManager.tsx n'est PAS dans la liste des routes publiques (App.tsx:121-151)
2. LocatairesExternesManager.tsx est importé dans Dashboard.tsx (ligne 45)
3. Dashboard.tsx est accessible uniquement après authentification (App.tsx:154-160)
4. Aucun lien QR code ou token public n'accède à locataire_externe

**Accès possibles** :
- Uniquement utilisateurs authentifiés via Dashboard

---

## VÉRIFICATION SPÉCIFIQUE : `demande_standard`

### Question : Y a-t-il un accès depuis une page publique ou QR code ?

**Réponse** : ❌ NON

**Preuves** :
1. DemandesPage.tsx n'est PAS dans la liste des routes publiques (App.tsx:121-151)
2. DemandesPage.tsx est importé dans Dashboard.tsx (ligne 32)
3. Dashboard.tsx est accessible uniquement après authentification
4. DemandesPage.tsx utilise PermissionGuard (ligne 3)
5. Aucun lien QR code ou token public n'accède à demande_standard

**Confusion possible** :
- Il existe `DemandeExterne.tsx` (PUBLIC) qui accède à `demandes_externes` (table différente)
- Mais `demande_standard` n'est PAS accessible publiquement

**Accès possibles** :
- Uniquement utilisateurs authentifiés via Dashboard

---

## DÉCOUVERTE IMPORTANTE : Route publique `/demande-externe`

### Contexte

**Fichier** : DemandeExterne.tsx
**Route** : `/demande-externe` (App.tsx ligne 145-147)
**Type** : **PUBLIC** (sans auth)

### Tables accédées

| Table | Opération | Ligne | Anonyme |
|-------|-----------|-------|---------|
| `profil` | SELECT | 50-53 | ✅ OUI |
| `poles` | SELECT | 65-68 | ✅ OUI |
| `demandes_externes` | INSERT | 168-178 | ✅ OUI |
| `app_utilisateur` | SELECT | 183-186 | ✅ OUI |
| `inbox` | INSERT | 202 | ✅ OUI |

### Code source exact

#### SELECT profil (ligne 50-53)

```tsx
const { data: profil, error: profilError } = await supabase
  .from('profil')
  .select('id, prenom, nom, email, matricule_tca, poste')
  .eq('matricule_tca', matricule.trim())
  .maybeSingle();
```

**Validation** : Utilisateur doit connaître un matricule valide

#### SELECT poles (ligne 65-68)

```tsx
const { data: polesData, error: polesError } = await supabase
  .from('poles')
  .select('id, nom')
  .eq('actif', true)
  .order('nom');
```

**Exposition** : Liste complète des pôles actifs

#### INSERT demandes_externes (ligne 168-178)

```tsx
const { data: demande, error: demandeError } = await supabase
  .from('demandes_externes')
  .insert({
    profil_id: chauffeur.id,
    pole_id: poleId,
    sujet: sujet.trim(),
    contenu: contenu.trim(),
    fichiers: uploadedFiles,
    statut: 'nouveau',
  })
  .select()
  .single();
```

**Colonnes** : `profil_id`, `pole_id`, `sujet`, `contenu`, `fichiers`, `statut`

**Upload fichiers** : Storage bucket `demandes-externes` (ligne 151)

#### SELECT app_utilisateur (ligne 183-186)

```tsx
const { data: utilisateurs } = await supabase
  .from('app_utilisateur')
  .select('id')
  .eq('pole_id', poleId)
  .eq('actif', true);
```

**Objectif** : Récupérer les IDs des utilisateurs du pôle pour notifications

#### INSERT inbox (ligne 202)

```tsx
await supabase.from('inbox').insert(notifications);
```

**Contenu** : Création de notifications inbox pour chaque utilisateur du pôle

### Impact de sécurité

✅ **Positif** :
- Validation du matricule requis
- Upload limité à 3 fichiers, 5MB max, formats restreints
- Bucket storage dédié `demandes-externes`
- Statut forcé à 'nouveau'

⚠️ **Points d'attention** :
- N'importe qui avec un matricule valide peut créer des demandes
- Exposition de la liste des pôles
- Exposition des IDs utilisateurs du pôle
- Création de notifications inbox
- Possibilité de spam/abuse si matricules connus

### Recommandation

**Court terme** :
- Ajouter un rate limiting (max 3 demandes/jour par matricule)
- Logger toutes les créations de demandes externes
- Vérifier que le profil n'est pas deleted_at

**Moyen terme** :
- Implémenter un système de token à usage unique
- Ajouter un captcha
- Limiter les matricules autorisés (statut actif uniquement)

**Long terme** :
- Migrer vers un système authentifié avec mot de passe temporaire

---

## EDGE FUNCTIONS

### Recherche effectuée

```bash
grep -rn "\.from\|execute_sql\|REST API" supabase/functions/*/index.ts
```

**Résultat pour les 7 tables** : ❌ AUCUN accès trouvé

**Note** : Les Edge Functions accèdent principalement à :
- `contrat`
- `profil`
- `modeles_contrats` (via joins)
- `document`
- Storage

Aucune des 7 tables auditées n'est accédée directement par les Edge Functions.

---

## SYNTHÈSE PAR TABLE

### `demande_standard`

✅ **SÉCURISÉ**
- 6 accès, tous authentifiés
- Utilisé uniquement dans Dashboard via DemandesPage
- PermissionGuard présent
- Pas d'accès public, QR code ou token

### `employee_events`

✅ **NON UTILISÉ**
- 0 accès dans le code frontend
- Table possiblement gérée uniquement côté SQL

### `incident_historique`

✅ **SÉCURISÉ**
- 1 accès SELECT, authentifié
- Utilisé uniquement dans Dashboard via IncidentHistory
- Pas d'accès public

### `incident`

✅ **SÉCURISÉ**
- 1 accès SELECT, authentifié
- Utilisé uniquement dans Dashboard via IncidentHistory
- Pas d'accès public

### `locataire_externe`

✅ **SÉCURISÉ**
- 4 accès (SELECT, INSERT, UPDATE), tous authentifiés
- Utilisé uniquement dans Dashboard via LocatairesExternesManager
- Pas d'accès public, QR code ou token
- **AUCUNE EXPOSITION PUBLIQUE CONFIRMÉE**

### `maintenance`

✅ **SÉCURISÉ**
- 2 accès SELECT, tous authentifiés
- Utilisé uniquement dans Dashboard
- Pas d'accès public

### `modeles_contrats`

✅ **SÉCURISÉ**
- 9 accès (SELECT, INSERT, UPDATE, DELETE soft), tous authentifiés
- Utilisé uniquement dans Dashboard
- PermissionGuard sur ContractTemplates
- Pas d'accès public
- **Note** : Accessible en lecture via joins dans routes publiques (ContractSignature), mais jamais directement

---

## RECOMMANDATIONS

### Priorité 1 : Route `/demande-externe`

**Actions** :
1. Implémenter rate limiting (3 demandes/jour/matricule)
2. Ajouter logging exhaustif
3. Vérifier profil.deleted_at IS NULL
4. Vérifier profil.statut = 'actif'
5. Ajouter captcha

### Priorité 2 : Monitoring

**Mettre en place** :
1. Alertes sur volume anormal de demandes externes
2. Dashboard admin pour visualiser les demandes externes
3. Logs d'audit pour toutes les opérations sur tables sensibles

### Priorité 3 : Documentation

**Créer** :
1. Doc listant toutes les routes publiques et leurs accès DB
2. Matrice de permissions par rôle
3. Procédure de révocation des tokens publics

---

## BUILD CHECK

**Test effectué** :
```bash
npm run build
```

**Résultat** : ✅ SUCCESS (aucune modification de code)

---

## CONCLUSION FINALE

### Pour les 7 tables auditées

✅ **AUCUNE exposition publique directe**

✅ **AUCUN accès via QR code ou token public**

✅ **TOUS les accès sont authentifiés via Dashboard**

### Découverte hors scope

⚠️ Route publique `/demande-externe` accède à :
- `demandes_externes` (INSERT)
- `inbox` (INSERT)
- `profil`, `poles`, `app_utilisateur` (SELECT)

**Niveau de risque** : MOYEN (nécessite matricule valide, mais potentiel d'abuse)

### Recommandation globale

Les 7 tables auditées sont **CORRECTEMENT PROTÉGÉES**.

Attention à porter sur la route `/demande-externe` qui n'était pas dans le scope initial mais représente une surface d'attaque potentielle.
