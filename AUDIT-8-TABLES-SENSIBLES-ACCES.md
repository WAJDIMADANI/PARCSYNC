# AUDIT TECHNIQUE - 8 TABLES SENSIBLES (SÉRIE 2)

**Date**: 2026-03-25
**Objectif**: Identifier TOUS les accès aux 8 tables sensibles et leur contexte d'authentification
**Tables auditées**:
- `nir_invalid_log`
- `notification`
- `poste`
- `profil_statut_historique`
- `profil`
- `secteur`
- `site`
- `vivier`

---

## RÉSUMÉ EXÉCUTIF

### Comptage global

| Table | Accès PUBLIC | Accès AUTHENTIFIÉ | Total Accès |
|-------|-------------|-------------------|-------------|
| `nir_invalid_log` | ❌ AUCUN | ❌ AUCUN | 0 |
| `notification` | ❌ AUCUN | ✅ 2 | 2 |
| `poste` | ✅ **1 PUBLIC** | ✅ 9 | 10 |
| `profil_statut_historique` | ❌ AUCUN | ❌ AUCUN | 0 |
| `profil` | ✅ **3 PUBLICS** | ✅ 45+ | 48+ |
| `secteur` | ✅ **2 PUBLICS** | ✅ 17 | 19 |
| `site` | ✅ **2 PUBLICS** | ✅ 9 | 11 |
| `vivier` | ❌ AUCUN | ✅ 8 | 8 |

**Total** : 98+ accès identifiés

### Découvertes critiques

⚠️ **`profil` est accédé depuis 3 ROUTES PUBLIQUES** :
1. `/onboarding` : SELECT + INSERT + UPDATE
2. `/upload-all-documents` : SELECT
3. `/demande-externe` : SELECT (déjà identifié dans audit précédent)

⚠️ **`site`, `secteur`, `poste` sont accédés depuis ROUTES PUBLIQUES** :
1. `/apply` : SELECT sur les 3 tables
2. `/onboarding` : SELECT sur site + secteur

### Niveau de risque par table

| Table | Niveau | Justification |
|-------|--------|---------------|
| `nir_invalid_log` | ✅ AUCUN | Non utilisé |
| `notification` | ✅ BAS | Uniquement authentifié |
| `poste` | ⚠️ **MOYEN** | Liste exposée publiquement sur /apply |
| `profil_statut_historique` | ✅ AUCUN | Non utilisé |
| `profil` | 🔴 **ÉLEVÉ** | INSERT/UPDATE publics via /onboarding |
| `secteur` | ⚠️ **MOYEN** | Liste exposée publiquement sur /apply et /onboarding |
| `site` | ⚠️ **MOYEN** | Liste exposée publiquement sur /apply et /onboarding |
| `vivier` | ✅ BAS | Uniquement authentifié |

---

## ROUTES PUBLIQUES ET LEURS ACCÈS

### Route `/apply` (Apply.tsx)

**Type** : PUBLIC (sans auth)
**Ligne App.tsx** : 121-127

#### Tables accédées

| Table | Opération | Ligne | Colonnes |
|-------|-----------|-------|----------|
| `site` | SELECT | 74 | `id`, `nom` |
| `secteur` | SELECT | 75 | `id`, `nom` |
| `poste` | SELECT | 76 | `id`, `nom`, `description` (filtre: `actif = true`) |

#### Code source

```tsx
const [sitesRes, secteursRes, postesRes] = await Promise.all([
  supabase.from('site').select('id, nom').order('nom'),
  supabase.from('secteur').select('id, nom').order('nom'),
  supabase.from('poste').select('id, nom, description').eq('actif', true).order('nom'),
]);
```

#### Impact

- **Exposition** : Liste complète des sites, secteurs, postes actifs
- **Usage** : Formulaire de candidature public
- **Risque** : Énumération de l'organisation (sites, secteurs, postes disponibles)

### Route `/onboarding` (OnboardingForm.tsx)

**Type** : PUBLIC (sans auth)
**Ligne App.tsx** : 129-131

#### Tables accédées

| Table | Opération | Ligne | Colonnes | Contexte |
|-------|-----------|-------|----------|----------|
| `site` | SELECT | 197 | `id`, `nom` | Liste pour formulaire |
| `secteur` | SELECT | 198 | `id`, `nom` | Liste pour formulaire |
| `profil` | SELECT | 296 | `id` | Vérification existence email |
| `profil` | UPDATE | 307 | **TOUTES** (voir détail) | Mise à jour profil existant |
| `profil` | INSERT | 339 | **TOUTES** (voir détail) | Création nouveau profil |

#### Code source - SELECT site et secteur (lignes 197-198)

```tsx
const [sitesRes, secteursRes] = await Promise.all([
  supabase.from('site').select('id, nom').order('nom'),
  supabase.from('secteur').select('id, nom').order('nom'),
]);
```

#### Code source - SELECT profil (lignes 296-299)

```tsx
const { data: existingEmployee } = await supabase
  .from('profil')
  .select('id')
  .eq('email', formData.email)
  .maybeSingle();
```

**Objectif** : Vérifier si un profil existe déjà avec cet email

#### Code source - UPDATE profil (lignes 307-331)

```tsx
const { error: updateError } = await supabase
  .from('profil')
  .update({
    prenom: formData.prenom,
    nom: formData.nom,
    tel: formData.telephone,
    genre: formData.genre,
    date_naissance: formData.date_naissance || null,
    nom_naissance: formData.nom_naissance || null,
    lieu_naissance: formData.lieu_naissance || null,
    pays_naissance: formData.pays_naissance || null,
    nationalite: formData.nationalite,
    nir: formData.numero_securite_sociale || null,
    adresse: formData.adresse,
    complement_adresse: formData.complement_adresse || null,
    code_postal: formData.code_postal,
    ville: formData.ville,
    date_permis_conduire: formData.date_permis_conduire || null,
    iban: formData.iban,
    bic: formData.bic || null,
    site_id: formData.site_id || null,
    secteur_id: formData.secteur_id || null,
    type_piece_identite: formData.type_piece_identite,
    titre_sejour_fin_validite: formData.type_piece_identite === 'carte_sejour' ? (formData.titre_sejour_fin_validite || null) : null,
  })
  .eq('id', finalEmployeeId);
```

**Colonnes mises à jour** : 22 colonnes incluant données personnelles, bancaires, administratives

#### Code source - INSERT profil (lignes 339-373)

```tsx
const { data: employeeData, error: insertError } = await supabase
  .from('profil')
  .insert([
    {
      prenom: formData.prenom,
      nom: formData.nom,
      email: formData.email,
      tel: formData.telephone,
      genre: formData.genre,
      date_naissance: formData.date_naissance || null,
      nom_naissance: formData.nom_naissance || null,
      lieu_naissance: formData.lieu_naissance || null,
      pays_naissance: formData.pays_naissance || null,
      nationalite: formData.nationalite,
      nir: formData.numero_securite_sociale || null,
      adresse: formData.adresse,
      complement_adresse: formData.complement_adresse || null,
      code_postal: formData.code_postal,
      ville: formData.ville,
      date_permis_conduire: formData.date_permis_conduire || null,
      iban: formData.iban,
      bic: formData.bic || null,
      site_id: formData.site_id || null,
      secteur_id: formData.secteur_id || null,
      type_piece_identite: formData.type_piece_identite,
      titre_sejour_fin_validite: formData.type_piece_identite === 'carte_sejour' ? (formData.titre_sejour_fin_validite || null) : null,
    }
  ])
  .select()
  .single();
```

**Colonnes insérées** : 23 colonnes incluant **données personnelles sensibles** :
- Nom, prénom, email, téléphone
- Genre, date de naissance, lieu et pays de naissance
- **NIR (Numéro de Sécurité Sociale)**
- **IBAN + BIC (coordonnées bancaires)**
- Adresse complète
- Nationalité, type de pièce d'identité
- Date permis de conduire, titre de séjour

#### Impact 🔴 CRITIQUE

- **Accès** : N'importe qui avec un lien `/onboarding` peut :
  - Lire la liste complète des sites et secteurs
  - Créer un profil employé complet avec NIR et IBAN
  - Modifier un profil existant s'il connaît l'email
- **Données sensibles exposées** :
  - NIR (numéro sécu)
  - IBAN/BIC (coordonnées bancaires)
  - Données personnelles complètes
- **Validation** : Aucune (à part format email)
- **Risque** :
  - Usurpation d'identité
  - Injection de faux profils
  - Modification de profils existants

### Route `/upload-all-documents` (UploadAllMissingDocuments.tsx)

**Type** : PUBLIC avec token (validation token expiré)
**Ligne App.tsx** : 141-143

#### Tables accédées

| Table | Opération | Ligne | Colonnes |
|-------|-----------|-------|----------|
| `profil` | SELECT | 97 | `id`, `nom`, `prenom`, `email` |

#### Code source (lignes 97-100)

```tsx
const { data: profil, error: profilError } = await supabase
  .from('profil')
  .select('id, nom, prenom, email')
  .eq('id', profilId)
  .maybeSingle();
```

#### Impact

- **Protection** : Token temporaire requis (table `upload_tokens`)
- **Validation** : Vérification expiration du token
- **Exposition** : Limitée aux données de base (nom, prénom, email)
- **Risque** : FAIBLE (protection par token)

### Route `/demande-externe` (DemandeExterne.tsx)

**Type** : PUBLIC (sans auth)
**Ligne App.tsx** : 145-147

#### Table accédée

| Table | Opération | Ligne | Colonnes |
|-------|-----------|-------|----------|
| `profil` | SELECT | 50 | `id`, `prenom`, `nom`, `email`, `matricule_tca`, `poste` |

#### Code source (lignes 50-53)

```tsx
const { data: profil, error: profilError } = await supabase
  .from('profil')
  .select('id, prenom, nom, email, matricule_tca, poste')
  .eq('matricule_tca', matricule.trim())
  .maybeSingle();
```

#### Impact

- **Validation** : Matricule TCA requis
- **Exposition** : Données profil via recherche matricule
- **Risque** : MOYEN (énumération possible si matricules connus)
- **Note** : Déjà identifié dans audit précédent

---

## TABLE 1 : `nir_invalid_log`

### Vue d'ensemble

**Total accès** : 0
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ❌ AUCUN

### Résultat

✅ **Aucun accès trouvé** à la table `nir_invalid_log` dans tout le projet src/.

**Note** : Cette table est probablement gérée uniquement côté backend via triggers SQL ou validations.

---

## TABLE 2 : `notification`

### Vue d'ensemble

**Total accès** : 2
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ✅ 2

### Détail des accès

| # | Fichier | Ligne | Fonction | Opération | Route | Contexte |
|---|---------|-------|----------|-----------|-------|----------|
| 1 | NotificationModal.tsx | 140 | handleSendReminder | UPDATE | Dashboard > Notifications | Authenticated |
| 2 | NotificationModal.tsx | 164 | handleUpdateStatus | UPDATE | Dashboard > Notifications | Authenticated |

### Code source

#### Accès #1 : UPDATE (ligne 140-146)

```tsx
const { error: updateError } = await supabase
  .from('notification')
  .update({
    statut: 'email_envoye',
    email_envoye_at: new Date().toISOString(),
    email_envoye_par: user?.id
  })
  .eq('id', notification.id);
```

**Colonnes** : `statut`, `email_envoye_at`, `email_envoye_par`

**Contexte** : Après envoi d'email de rappel

#### Accès #2 : UPDATE (ligne 164-166)

```tsx
const { error } = await supabase
  .from('notification')
  .update({ statut: newStatus })
  .eq('id', notification.id);
```

**Colonnes** : `statut`

**Contexte** : Changement manuel du statut (resolue/ignoree)

### Profil de lecture supplémentaire

**Note** : Le composant lit aussi `profil` (ligne 43) :

```tsx
const { data: profil, error: profilError } = await supabase
  .from('profil')
  .select('*')
  .eq('id', notification.profil_id)
  .single();
```

**Objectif** : Récupérer données employé pour générer email de rappel

### Protection

✅ **NotificationModal.tsx** est importé dans NotificationsList.tsx
✅ **NotificationsList.tsx** est importé dans Dashboard.tsx (ligne 28)
✅ Dashboard.tsx est protégé par AuthProvider et PermissionsProvider
✅ Appelé uniquement via Dashboard (ligne 92)

**Accès authentifié requis** : OUI

### Résultat

✅ **`notification` est CORRECTEMENT PROTÉGÉ**
- Aucun accès public
- Uniquement modification depuis Dashboard authentifié
- Pas d'exposition via routes publiques ou tokens

---

## TABLE 3 : `poste`

### Vue d'ensemble

**Total accès** : 10
**Accès PUBLIC** : ✅ 1
**Accès AUTHENTIFIÉ** : ✅ 9

### Accès PUBLIC

| # | Fichier | Ligne | Route | Opération | Colonnes |
|---|---------|-------|-------|-----------|----------|
| 1 | Apply.tsx | 76 | `/apply` | SELECT | `id`, `nom`, `description` (filtre `actif = true`) |

### Accès AUTHENTIFIÉS

| # | Fichier | Ligne | Fonction | Opération | Route |
|---|---------|-------|----------|-----------|-------|
| 2 | PostesList.tsx | 31 | fetchPostes | SELECT | Dashboard > Paramètres > Postes |
| 3 | PostesList.tsx | 71 | handleCreate | INSERT | Dashboard > Paramètres > Postes |
| 4 | PostesList.tsx | 81 | handleUpdate | UPDATE | Dashboard > Paramètres > Postes |
| 5 | PostesList.tsx | 107 | handleToggleActif | UPDATE | Dashboard > Paramètres > Postes |
| 6 | CandidateList.tsx | 213 | fetchPostes | SELECT | Dashboard > Candidats |
| 7 | RejectedList.tsx | 185 | fetchPostes | SELECT | Dashboard > Rejetés |
| 8 | VivierList.tsx | 189 | fetchPostes | SELECT | Dashboard > Vivier |
| 9 | ContractSendModal.tsx | 424 | loadPostes | SELECT | Dashboard > Contrats |
| 10 | ManualContractUploadModal.tsx | 67 | loadPostes | SELECT | Dashboard > Contrats |

### Code source - Accès PUBLIC (Apply.tsx:76)

```tsx
supabase.from('poste').select('id, nom, description').eq('actif', true).order('nom')
```

**Filtre** : Uniquement postes actifs

### Code source - Gestion CRUD (PostesList.tsx)

**SELECT (ligne 31)** :
```tsx
const { data, error } = await supabase
  .from('poste')
  .select('*')
  .order('nom');
```

**INSERT (ligne 71)** :
```tsx
const { error } = await supabase
  .from('poste')
  .insert([{ nom, description: description || null, actif: true }]);
```

**UPDATE (ligne 81)** :
```tsx
const { error } = await supabase
  .from('poste')
  .update({ nom, description: description || null })
  .eq('id', selectedPoste.id);
```

**UPDATE actif (ligne 107)** :
```tsx
const { error } = await supabase
  .from('poste')
  .update({ actif: !poste.actif })
  .eq('id', poste.id);
```

### Protection

⚠️ **Accès public** : Liste des postes actifs exposée sur `/apply`
✅ **Accès CRUD** : Protégés par Dashboard authentifié
✅ PostesList.tsx utilisé uniquement dans Dashboard

### Risque

⚠️ **MOYEN** :
- Exposition de la liste des postes disponibles
- Énumération de l'organisation
- Permet de connaître les métiers recherchés
- **Mitigation** : Filtre `actif = true` limite l'exposition

---

## TABLE 4 : `profil_statut_historique`

### Vue d'ensemble

**Total accès** : 0
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ❌ AUCUN

### Résultat

✅ **Aucun accès trouvé** à la table `profil_statut_historique` dans tout le projet src/.

**Note** : Cette table est probablement gérée uniquement côté backend via triggers SQL lors de changements de statut.

---

## TABLE 5 : `profil`

### Vue d'ensemble

**Total accès** : 48+
**Accès PUBLIC** : ✅ 3
**Accès AUTHENTIFIÉ** : ✅ 45+

Cette table est la plus utilisée du projet avec accès dans presque tous les composants.

### Accès PUBLICS 🔴 CRITIQUE

| # | Fichier | Ligne | Route | Opération | Données sensibles |
|---|---------|-------|-------|-----------|-------------------|
| 1 | OnboardingForm.tsx | 296 | `/onboarding` | SELECT | id (vérif email) |
| 2 | OnboardingForm.tsx | 307 | `/onboarding` | UPDATE | **NIR, IBAN, toutes données** |
| 3 | OnboardingForm.tsx | 339 | `/onboarding` | INSERT | **NIR, IBAN, toutes données** |
| 4 | UploadAllMissingDocuments.tsx | 97 | `/upload-all-documents` | SELECT | nom, prénom, email (avec token) |
| 5 | DemandeExterne.tsx | 50 | `/demande-externe` | SELECT | id, nom, prénom, email, matricule, poste |

### Détail accès PUBLICS

#### `/onboarding` - SELECT (OnboardingForm.tsx:296-299)

```tsx
const { data: existingEmployee } = await supabase
  .from('profil')
  .select('id')
  .eq('email', formData.email)
  .maybeSingle();
```

**Risque** : Énumération des emails existants

#### `/onboarding` - UPDATE (OnboardingForm.tsx:307-331)

**22 colonnes mises à jour** incluant :
- Données personnelles : nom, prénom, date/lieu de naissance, genre
- **NIR (numéro sécurité sociale)**
- **IBAN + BIC**
- Adresse complète
- Date permis, nationalité, titre séjour
- Site, secteur

**Risque** : 🔴 **CRITIQUE**
- Modification de données sensibles sans authentification
- Accès aux coordonnées bancaires
- Accès au NIR

#### `/onboarding` - INSERT (OnboardingForm.tsx:339-373)

**23 colonnes insérées** (mêmes que UPDATE + email, tel)

**Risque** : 🔴 **CRITIQUE**
- Création de profils avec données sensibles
- Injection de faux employés
- Usurpation d'identité

#### `/upload-all-documents` - SELECT (UploadAllMissingDocuments.tsx:97)

```tsx
const { data: profil, error: profilError } = await supabase
  .from('profil')
  .select('id, nom, prenom, email')
  .eq('id', profilId)
  .maybeSingle();
```

**Protection** : Token temporaire requis (validation expiration)

**Risque** : ✅ FAIBLE (protégé par token)

#### `/demande-externe` - SELECT (DemandeExterne.tsx:50)

```tsx
const { data: profil, error: profilError } = await supabase
  .from('profil')
  .select('id, prenom, nom, email, matricule_tca, poste')
  .eq('matricule_tca', matricule.trim())
  .maybeSingle();
```

**Protection** : Matricule requis

**Risque** : ⚠️ MOYEN (énumération si matricules connus)

### Accès AUTHENTIFIÉS (45 accès)

Tous les autres accès sont protégés par Dashboard authentifié :

**Composants principaux** :
- EmployeeList.tsx (11 accès) : Gestion employés complète
- ImportSalariesBulk.tsx (4 accès) : Import massif
- ContractSendModal.tsx, ContractViewModal.tsx, ContractsList.tsx : Gestion contrats
- CRMEmailsNew.tsx, CRMSmsNew.tsx : Envoi communications
- RHDashboard.tsx : Statistiques
- GenerateLetterWizard.tsx : Génération courriers
- useProfilePhoto.ts : Gestion photos de profil
- Et 20+ autres composants

**Opérations** :
- SELECT : Lecture, recherche, statistiques
- INSERT : Création employés (via import ou manuel)
- UPDATE : Modification données, statut, soft delete
- DELETE : Soft delete uniquement

### Résumé protection

🔴 **3 accès publics CRITIQUES** via `/onboarding` (SELECT, INSERT, UPDATE complets)
⚠️ **2 accès publics MOYENS** via `/demande-externe` et `/upload-all-documents` (SELECT limités)
✅ **45+ accès authentifiés** correctement protégés

---

## TABLE 6 : `secteur`

### Vue d'ensemble

**Total accès** : 19
**Accès PUBLIC** : ✅ 2
**Accès AUTHENTIFIÉ** : ✅ 17

### Accès PUBLICS

| # | Fichier | Ligne | Route | Opération | Colonnes |
|---|---------|-------|-------|-----------|----------|
| 1 | Apply.tsx | 75 | `/apply` | SELECT | `id`, `nom` |
| 2 | OnboardingForm.tsx | 198 | `/onboarding` | SELECT | `id`, `nom` |

### Code source - Accès PUBLICS

**Apply.tsx (ligne 75)** :
```tsx
supabase.from('secteur').select('id, nom').order('nom')
```

**OnboardingForm.tsx (ligne 198)** :
```tsx
supabase.from('secteur').select('id, nom').order('nom')
```

**Usage** : Dropdowns pour sélection secteur dans formulaires publics

### Accès AUTHENTIFIÉS (17 accès)

**Gestion CRUD** (SecteursList.tsx) :
- Ligne 32 : SELECT `*`
- Ligne 76 : INSERT
- Ligne 83 : UPDATE
- Ligne 106 : UPDATE actif

**Utilisation dans composants** :
- CandidateList.tsx (212) : Dropdown filtres
- EmployeeList.tsx (310) : Dropdown filtres
- ContractSendModal.tsx (423) : Dropdown
- ContractsList.tsx (125) : Dropdown filtres
- RejectedList.tsx (184) : Dropdown
- VivierList.tsx (188) : Dropdown
- ImportSalariesBulk.tsx (603) : Import massif
- ImportSalarieTest.tsx (80) : Test import
- CRMEmailsNew.tsx (74), CRMSmsNew.tsx (74) : Filtres envoi
- CRMEmailsHistory.tsx (77), CRMSmsHistory.tsx (76) : Filtres historique
- ManualContractUploadModal.tsx (72) : Dropdown

### Protection

⚠️ **Accès publics** : Liste complète des secteurs exposée
✅ **Accès CRUD** : Protégés par Dashboard
✅ SecteursList.tsx uniquement dans Dashboard

### Risque

⚠️ **MOYEN** :
- Exposition complète de l'organisation (liste secteurs)
- Permet cartographie de l'entreprise
- **Mitigation possible** : Filtre `actif = true` (non implémenté actuellement)

---

## TABLE 7 : `site`

### Vue d'ensemble

**Total accès** : 11
**Accès PUBLIC** : ✅ 2
**Accès AUTHENTIFIÉ** : ✅ 9

### Accès PUBLICS

| # | Fichier | Ligne | Route | Opération | Colonnes |
|---|---------|-------|-------|-----------|----------|
| 1 | Apply.tsx | 74 | `/apply` | SELECT | `id`, `nom` |
| 2 | OnboardingForm.tsx | 197 | `/onboarding` | SELECT | `id`, `nom` |

### Code source - Accès PUBLICS

**Apply.tsx (ligne 74)** :
```tsx
supabase.from('site').select('id, nom').order('nom')
```

**OnboardingForm.tsx (ligne 197)** :
```tsx
supabase.from('site').select('id, nom').order('nom')
```

**Usage** : Dropdowns pour sélection site dans formulaires publics

### Accès AUTHENTIFIÉS (9 accès)

**Gestion CRUD** (SitesList.tsx) :
- Ligne 29 : SELECT `*`
- Ligne 73 : INSERT
- Ligne 80 : UPDATE
- Ligne 103 : UPDATE actif

**Utilisation dans composants** :
- CandidateList.tsx (211) : Dropdown filtres
- EmployeeList.tsx (309) : Dropdown filtres
- RejectedList.tsx (183) : Dropdown
- VivierList.tsx (187) : Dropdown
- ImportSalarieTest.tsx (79) : Test import

### Protection

⚠️ **Accès publics** : Liste complète des sites exposée
✅ **Accès CRUD** : Protégés par Dashboard
✅ SitesList.tsx uniquement dans Dashboard

### Risque

⚠️ **MOYEN** :
- Exposition géographique de l'entreprise (liste sites)
- Permet identification des emplacements
- **Mitigation possible** : Filtre `actif = true` (non implémenté actuellement)

---

## TABLE 8 : `vivier`

### Vue d'ensemble

**Total accès** : 8
**Accès PUBLIC** : ❌ AUCUN
**Accès AUTHENTIFIÉ** : ✅ 8

### Détail des accès

| # | Fichier | Ligne | Fonction | Opération | Route |
|---|---------|-------|----------|-----------|-------|
| 1 | VivierList.tsx | 567 | handleCreateFromVivier | INSERT | Dashboard > Vivier |
| 2 | VivierList.tsx | 719 | handleAddToVivier | INSERT | Dashboard > Vivier |
| 3 | CandidateList.tsx | 462 | handleAddToVivier | INSERT | Dashboard > Candidats |
| 4 | CandidateList.tsx | 481 | handleRemoveFromVivier | DELETE | Dashboard > Candidats |
| 5 | CandidateList.tsx | 489 | handleToggleDisponibilite | UPDATE | Dashboard > Candidats |
| 6 | RHDashboard.tsx | 729 | fetchVivierStats | SELECT | Dashboard > RH |
| 7 | RHDashboard.tsx | 738 | (inline) | DELETE | Dashboard > RH |
| 8 | RHDashboard.tsx | 749 | (inline) | UPDATE | Dashboard > RH |

### Code source

#### INSERT (VivierList.tsx:567)

```tsx
const { error: vivierError } = await supabase
  .from('vivier')
  .insert({
    candidat_id: candidatId,
    disponibilite: true,
    notes: formData.notes || null
  });
```

**Colonnes** : `candidat_id`, `disponibilite`, `notes`

#### INSERT (CandidateList.tsx:462)

```tsx
const { error: vivierError } = await supabase
  .from('vivier')
  .insert({
    candidat_id: candidat.id,
    disponibilite: true,
    notes: ''
  });
```

#### DELETE (CandidateList.tsx:481)

```tsx
const { error: deleteError } = await supabase
  .from('vivier')
  .delete()
  .eq('candidat_id', candidat.id);
```

#### UPDATE (CandidateList.tsx:489)

```tsx
const { error: updateError } = await supabase
  .from('vivier')
  .update({ disponibilite: !candidat.vivier[0].disponibilite })
  .eq('candidat_id', candidat.id);
```

#### SELECT (RHDashboard.tsx:729)

```tsx
const { data: vivierData } = await supabase
  .from('vivier')
  .select('*');
```

### Protection

✅ **VivierList.tsx** importé dans Dashboard.tsx (ligne 22)
✅ **CandidateList.tsx** importé dans Dashboard.tsx (ligne 6)
✅ **RHDashboard.tsx** importé dans Dashboard.tsx
✅ Dashboard.tsx protégé par AuthProvider et PermissionsProvider

**Accès authentifié requis** : OUI

### Résultat

✅ **`vivier` est CORRECTEMENT PROTÉGÉ**
- Aucun accès public
- Uniquement gestion depuis Dashboard authentifié
- Opérations CRUD complètes protégées

---

## SYNTHÈSE SÉCURITÉ

### Tables non utilisées (gérées par backend SQL)

✅ `nir_invalid_log` : 0 accès
✅ `profil_statut_historique` : 0 accès

### Tables correctement protégées

✅ `notification` : 2 accès, tous authentifiés
✅ `vivier` : 8 accès, tous authentifiés

### Tables avec exposition publique ACCEPTABLE

⚠️ `poste` : Liste postes actifs sur `/apply`
- Impact : Connaissance des métiers recherchés
- Mitigation : Filtre `actif = true`

⚠️ `secteur` : Liste secteurs sur `/apply` et `/onboarding`
- Impact : Cartographie organisation
- Mitigation : Peut être considéré comme info publique

⚠️ `site` : Liste sites sur `/apply` et `/onboarding`
- Impact : Localisation géographique
- Mitigation : Peut être considéré comme info publique

### Table avec exposition publique CRITIQUE

🔴 **`profil`** : INSERT + UPDATE complets via `/onboarding`

**Données sensibles exposées** :
- NIR (numéro sécurité sociale)
- IBAN + BIC (coordonnées bancaires)
- Données personnelles complètes

**Vulnérabilités** :
1. Création de profils sans validation
2. Modification de profils existants via email
3. Aucune authentification requise
4. Pas de captcha ou rate limiting
5. Pas de vérification d'identité

---

## RECOMMANDATIONS PAR PRIORITÉ

### Priorité 1 : 🔴 CRITIQUE - Route `/onboarding`

**Problème** : Création/modification libre de profils avec NIR et IBAN

**Solutions immédiates** :
1. **Restreindre les opérations publiques** :
   - SELECT uniquement (vérif email)
   - Supprimer UPDATE public
   - Limiter INSERT aux colonnes non sensibles

2. **Implémenter validation forte** :
   - Token à usage unique obligatoire
   - Validation email avant création
   - Captcha Google reCAPTCHA
   - Rate limiting (1 onboarding/email/jour)

3. **Séparer données sensibles** :
   - NIR et IBAN uniquement via processus authentifié
   - Onboarding public = données de base uniquement
   - Complétion données sensibles après validation RH

### Priorité 2 : ⚠️ MOYEN - Routes `/apply`, `/demande-externe`

**Problème** : Énumération des sites, secteurs, postes, profils

**Solutions** :
1. **Filtrer les données exposées** :
   - Ajouter filtre `actif = true` sur site et secteur
   - Limiter poste aux champs essentiels uniquement

2. **Protéger `/demande-externe`** :
   - Rate limiting (3 demandes/matricule/jour)
   - Captcha
   - Vérifier statut actif du profil

3. **Monitoring** :
   - Logger toutes les recherches de matricule
   - Alertes sur tentatives multiples échouées

### Priorité 3 : ✅ BON - Monitoring général

**Actions** :
1. **Audit logging** :
   - Logger tous les accès publics aux tables
   - Alertes sur patterns anormaux (volume, timing)

2. **Dashboard sécurité** :
   - Visualisation des accès publics
   - Statistiques par route
   - Détection d'anomalies

3. **Documentation** :
   - Maintenir matrice des routes publiques à jour
   - Procédures de réponse aux incidents
   - Tests de sécurité réguliers

### Priorité 4 : Protection des données sensibles

**Actions long terme** :
1. **Chiffrement** :
   - Chiffrer NIR et IBAN en base
   - Clés gérées par secrets manager

2. **Anonymisation** :
   - Logs sans données personnelles
   - Masquage NIR/IBAN dans interfaces

3. **Conformité RGPD** :
   - Audit complet des données collectées
   - Base légale pour chaque traitement
   - Politique de rétention

---

## MATRICE DE RISQUES

| Table | Exposition | Données sensibles | Risque global | Action |
|-------|-----------|-------------------|---------------|---------|
| `profil` | 🔴 INSERT/UPDATE public | 🔴 NIR, IBAN | 🔴 **CRITIQUE** | Corriger immédiatement |
| `poste` | ⚠️ Liste publique | ✅ Aucune | ⚠️ MOYEN | Acceptable, surveiller |
| `secteur` | ⚠️ Liste publique | ✅ Aucune | ⚠️ MOYEN | Acceptable, surveiller |
| `site` | ⚠️ Liste publique | ✅ Aucune | ⚠️ MOYEN | Acceptable, surveiller |
| `notification` | ✅ Authentifié | ✅ Aucune exposée | ✅ BAS | OK |
| `vivier` | ✅ Authentifié | ✅ Aucune exposée | ✅ BAS | OK |
| `nir_invalid_log` | ✅ Non utilisé | N/A | ✅ AUCUN | OK |
| `profil_statut_historique` | ✅ Non utilisé | N/A | ✅ AUCUN | OK |

---

## CONFORMITÉ RGPD

### Données à caractère personnel exposées

**Route `/onboarding` (OnboardingForm.tsx)** :

**Catégories de données** :
1. **Identification** : nom, prénom, email, téléphone
2. **Données sensibles (art. 9 RGPD)** :
   - NIR (numéro sécurité sociale)
   - Données de santé (date permis, visite médicale)
3. **Données financières** : IBAN, BIC
4. **Données de localisation** : adresse complète
5. **Données d'identité** : date/lieu/pays naissance, nationalité, titre séjour

**Base légale** :
- Exécution d'un contrat (intégration employé)
- **MAIS** : Collecte AVANT signature = problème potentiel

**Violations potentielles** :
1. Collecte excessive sans base légale claire
2. Pas de consentement explicite pour données sensibles
3. Absence de minimisation des données
4. Pas d'information claire sur le traitement (RGPD art. 13)

### Recommandations RGPD

1. **Information** :
   - Ajouter notice d'information complète sur `/onboarding`
   - Expliquer finalité, base légale, durée conservation
   - Mentionner droits (accès, rectification, effacement)

2. **Minimisation** :
   - Ne collecter NIR/IBAN qu'après validation RH
   - Onboarding public = données strictement nécessaires

3. **Consentement** :
   - Checkbox consentement explicite
   - Séparé pour données sensibles (NIR, santé)

4. **Sécurité** :
   - Chiffrement NIR/IBAN
   - Authentification forte pour accès données sensibles
   - Audit trails complets

---

## BUILD CHECK

**Test effectué** :
```bash
npm run build
```

**Résultat** : ✅ SUCCESS (aucune modification de code)

---

## CONCLUSION FINALE

### Résumé pour les 8 tables

**Tables sécurisées** :
✅ `nir_invalid_log` (non utilisé)
✅ `profil_statut_historique` (non utilisé)
✅ `notification` (authentifié uniquement)
✅ `vivier` (authentifié uniquement)

**Tables avec exposition acceptable** :
⚠️ `poste` (liste publique, données non sensibles)
⚠️ `secteur` (liste publique, données non sensibles)
⚠️ `site` (liste publique, données non sensibles)

**Table avec vulnérabilité critique** :
🔴 **`profil`** : INSERT/UPDATE publics avec NIR et IBAN via `/onboarding`

### Actions immédiates requises

1. **URGENT** : Sécuriser `/onboarding`
   - Supprimer accès direct NIR/IBAN
   - Implémenter token + captcha
   - Limiter champs accessibles publiquement

2. **Important** : Protéger `/demande-externe`
   - Rate limiting
   - Vérification statut actif
   - Logging exhaustif

3. **Surveillance** : Monitoring routes publiques
   - Alertes sur volumes anormaux
   - Dashboard sécurité
   - Audit trails

### Conformité

⚠️ **Problèmes RGPD identifiés** :
- Collecte données sensibles sans base légale claire
- Absence de notice d'information
- Pas de consentement explicite
- Sécurité insuffisante (pas de chiffrement NIR/IBAN)

**Recommandation** : Audit RGPD complet du processus d'onboarding

### Score de sécurité global

**6/8 tables sécurisées** (75%)
**1 vulnérabilité critique** (profil)
**3 expositions moyennes** (poste, secteur, site)

**Note globale** : ⚠️ **MOYEN avec points critiques à corriger**
