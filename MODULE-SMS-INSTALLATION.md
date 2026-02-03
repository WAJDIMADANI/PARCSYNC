# Module SMS - Installation et Utilisation

## Résumé des modifications

Le module SMS a été créé avec succès, similaire au module Emails existant.

## Fichiers créés

### 1. Tables SQL
- **create-crm-sms-tables.sql** : Tables `crm_sms_batches` et `crm_sms_recipients` avec RLS

### 2. Composants React
- **src/components/CRMSms.tsx** : Composant principal avec onglets (Nouveau/Historique)
- **src/components/CRMSmsNew.tsx** : Formulaire d'envoi de SMS
- **src/components/CRMSmsHistory.tsx** : Historique des envois SMS

### 3. Fichiers modifiés
- **src/components/Dashboard.tsx** : Ajout du case 'rh/sms' avec import CRMSms
- **src/components/Sidebar.tsx** :
  - Ajout de l'import `MessageSquare` de lucide-react
  - Ajout de 'rh/sms' dans le type `View`
  - Ajout de l'entrée SMS dans le menu RH (après Emails)

## Étapes d'installation

### 1. Créer les tables SQL

Exécuter le fichier `create-crm-sms-tables.sql` dans votre base Supabase :

```sql
-- Créer les tables crm_sms_batches et crm_sms_recipients
-- Le fichier contient les tables, index et RLS policies
```

### 2. Créer l'edge function send-simple-sms

L'edge function doit être créée dans `supabase/functions/send-simple-sms/index.ts` avec la structure suivante :

**Payload attendu :**
```typescript
{
  mode: 'all' | 'selected' | 'sector',
  message: string,
  profilIds?: string[],      // si mode = 'selected'
  secteurIds?: string[]      // si mode = 'sector'
}
```

**Réponse attendue :**
```typescript
{
  ok: boolean,
  batchId?: string,
  successCount: number,
  total: number,
  error?: string
}
```

## Fonctionnalités

### Onglet "Nouveau"

#### Modes d'envoi
- **Tous les salariés actifs** : Envoie à tous les salariés actifs avec numéro de téléphone
- **Sélectionner des salariés** : Recherche et sélection manuelle
- **Par secteur** : Sélection par secteurs (multi-sélection)

#### Validation
- Message obligatoire (max 160 caractères)
- Compteur de caractères en temps réel
- Au moins 1 salarié si mode "Sélectionner"
- Au moins 1 secteur si mode "Par secteur"
- Exclusion automatique des salariés sans téléphone
- Avertissement si téléphones manquants

#### Fonctionnalités UI
- Recherche de salariés (par matricule, nom, prénom)
- Badges visuels pour salariés sélectionnés
- Indicateur de salariés sans téléphone
- Compteur de destinataires
- Modal de succès animé
- Auto-fermeture après 5 secondes

### Onglet "Historique"

#### Affichage
- Liste de tous les envois SMS
- Informations par batch :
  - Date de création et d'envoi
  - Créé par (nom, prénom)
  - Mode d'envoi
  - Secteurs ciblés (si applicable)
  - Message SMS
  - Total destinataires
  - Compteurs (envoyés/échoués)
  - Statut (sending/sent/partial/failed)

#### Détails
- Clic sur un batch pour voir les destinataires
- Tableau des destinataires avec :
  - Nom complet
  - Numéro de téléphone
  - Statut (pending/sent/failed)

## Structure des données

### Table crm_sms_batches
```sql
- id: uuid
- created_at: timestamptz
- created_by: uuid (ref app_utilisateur)
- mode: 'all' | 'selected' | 'sector'
- message: text
- status: 'sending' | 'sent' | 'partial' | 'failed'
- total_recipients: integer
- sent_count: integer
- failed_count: integer
- sent_at: timestamptz
- target_secteur_ids: uuid[]
```

### Table crm_sms_recipients
```sql
- id: uuid
- batch_id: uuid (ref crm_sms_batches)
- profil_id: uuid (ref profil)
- recipient_phone: text
- full_name: text
- status: 'pending' | 'sent' | 'failed'
- error: jsonb
- created_at: timestamptz
- sent_at: timestamptz
```

## Navigation

Le module SMS est accessible via :
- Menu RH > SMS
- Icône : MessageSquare (lucide-react)
- Route : 'rh/sms'

## Build

Le projet compile correctement sans erreur :
```bash
npm run build
✓ built in 30.11s
```

## Notes importantes

1. **Filtrage des profils** : Seuls les salariés actifs avec numéro de téléphone sont chargés
2. **Validation côté client** : Empêche l'envoi si données invalides
3. **Compteur de caractères** : Limite à 160 caractères (standard SMS)
4. **RLS activé** : Sécurité garantie sur toutes les tables
5. **Réutilisation du code** : UI/UX identique au module Emails pour cohérence

## Prochaines étapes

1. Exécuter `create-crm-sms-tables.sql` dans Supabase
2. Créer l'edge function `send-simple-sms`
3. Tester l'envoi de SMS depuis l'interface
4. Vérifier l'historique et les détails des envois
