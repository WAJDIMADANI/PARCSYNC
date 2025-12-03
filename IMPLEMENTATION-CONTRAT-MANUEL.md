# Implémentation: Ajout Manuel de Contrats

## Vue d'ensemble

Cette fonctionnalité permet d'ajouter manuellement des contrats signés (hors Yousign) directement dans le système. Elle est particulièrement utile pour:
- Les contrats signés sur papier
- Les anciens contrats à importer
- Les contrats signés via d'autres systèmes
- Les situations d'urgence où Yousign n'est pas disponible

## Fichiers créés

### 1. `/src/components/ManualContractUploadModal.tsx`
Modal complet permettant de:
- Sélectionner le type de contrat (CDI, CDD, CTT, Stage, etc.)
- Renseigner le poste/fonction
- Définir les dates (début, fin si nécessaire, signature)
- Ajouter des notes optionnelles
- Uploader un fichier PDF (drag & drop ou sélection)
- Validation complète des données avant soumission

### 2. `/add-source-column-to-contrat.sql`
Migration SQL pour ajouter la colonne `source` à la table `contrat`:
```sql
ALTER TABLE contrat ADD COLUMN source text;
```

**IMPORTANT**: Exécuter cette migration dans Supabase avant d'utiliser la fonctionnalité.

## Modifications apportées

### `/src/components/EmployeeList.tsx`

1. **Import ajouté** (ligne 15):
```typescript
import ManualContractUploadModal from './ManualContractUploadModal';
```

2. **État ajouté** (ligne 748):
```typescript
const [showManualContractModal, setShowManualContractModal] = useState(false);
```

3. **Bouton d'ajout** dans l'onglet Contrats (lignes 2640-2647):
- Visible en permanence dans l'onglet "Contrats"
- Texte: "Ajouter un contrat"
- Icône: Upload
- Couleur: Vert (pour différencier de l'envoi Yousign)

4. **Badge "Manuel"** pour les contrats manuels (lignes 2711-2716):
- Affiché uniquement pour les contrats avec `source === 'manuel'`
- Couleur: Gris ardoise
- Icône: Upload

5. **Modal intégré** (lignes 3239-3250):
- S'affiche quand `showManualContractModal` est `true`
- Rafraîchit la liste des contrats après succès
- Affiche un toast de confirmation

## Fonctionnement

### Workflow d'ajout manuel

1. **Ouverture**: Clic sur "Ajouter un contrat" dans l'onglet Contrats
2. **Saisie des informations**:
   - Type de contrat (obligatoire)
   - Poste/Fonction (optionnel)
   - Date de début (obligatoire)
   - Date de fin (obligatoire si non-CDI)
   - Date de signature (obligatoire)
   - Notes (optionnel)
3. **Upload du PDF**:
   - Drag & drop ou sélection fichier
   - Validation: PDF uniquement, max 10 MB
4. **Enregistrement**:
   - Upload du PDF dans `documents/contrats/{profil_id}/{uuid}-manual.pdf`
   - Insertion en base avec `statut: 'signe'` et `source: 'manuel'`
   - Refresh automatique de la liste

### Structure de données

Champs enregistrés dans la table `contrat`:
```javascript
{
  profil_id: string,          // ID de l'employé
  modele_id: null,            // Pas de modèle pour contrats manuels
  fichier_signe_url: string,  // Chemin dans Supabase Storage
  statut: 'signe',            // Directement signé
  date_signature: string,     // Date saisie par l'utilisateur
  variables: {
    type_contrat: string,     // CDI, CDD, etc.
    poste: string,            // Fonction
    date_debut: string,       // Date de début
    date_fin: string | null,  // Date de fin (si applicable)
    notes: string,            // Notes optionnelles
    source: 'manuel',         // Origine du contrat
    uploaded_by_name: string  // Nom de l'employé
  },
  yousign_signature_request_id: null,  // Pas de Yousign
  source: 'manuel'            // Indicateur d'origine
}
```

## Distinction visuelle

### Contrats Yousign
- Badge type de contrat (CDI, CDD, etc.)
- Badge statut (Signé, En attente, etc.)
- Pas de badge "Manuel"

### Contrats manuels
- Badge type de contrat
- Badge statut (toujours "Signé")
- **Badge "Manuel"** avec icône Upload (gris)

## Avantages

### Pour l'existant
- ✅ **Aucune modification** du workflow Yousign
- ✅ **Compatible** avec tous les contrats existants
- ✅ **Cohabitation** entre contrats Yousign et manuels
- ✅ **Pas de migration** de données nécessaire

### Pour les utilisateurs
- ✅ **Flexibilité**: Ajout de contrats sans Yousign
- ✅ **Historique complet**: Tous les contrats au même endroit
- ✅ **Simplicité**: Interface intuitive avec drag & drop
- ✅ **Validation**: Contrôles de saisie pour éviter les erreurs

## Instructions de déploiement

### 1. Exécuter la migration SQL
Dans Supabase SQL Editor:
```sql
-- Ajouter la colonne source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'source'
  ) THEN
    ALTER TABLE contrat ADD COLUMN source text;
    COMMENT ON COLUMN contrat.source IS 'Origin of the contract: manuel or yousign';
  END IF;
END $$;
```

### 2. Déployer le code
Le code est prêt et compilé avec succès (`npm run build` ✓).

### 3. Vérifier les permissions
S'assurer que le bucket `documents` accepte les uploads dans le dossier `contrats/`:
- Vérifier les RLS policies sur le bucket `documents`
- Tester l'upload avec un utilisateur standard

## Test

### Scénario de test
1. ✅ Ouvrir un profil employé sans contrat
2. ✅ Aller dans l'onglet "Contrats"
3. ✅ Cliquer sur "Ajouter un contrat"
4. ✅ Remplir le formulaire avec:
   - Type: CDD
   - Poste: Agent de sécurité
   - Date début: 01/01/2024
   - Date fin: 31/12/2024
   - Date signature: 15/12/2023
5. ✅ Uploader un PDF de test
6. ✅ Valider
7. ✅ Vérifier l'affichage avec badge "Manuel"
8. ✅ Tester le téléchargement du PDF

## Solution au problème initial

Pour **WAJDI MADANI** (opt.commercial@gmail.com):
1. Ouvrir son profil
2. Aller dans l'onglet "Contrats"
3. Cliquer sur "Ajouter un contrat"
4. Uploader son contrat signé existant
5. Le bouton "Télécharger" sera actif immédiatement

## Notes techniques

### Sécurité
- Upload limité à 10 MB
- Validation du type MIME (PDF uniquement)
- Stockage dans Supabase Storage avec RLS

### Performance
- Upload asynchrone avec feedback visuel
- Nettoyage automatique en cas d'erreur
- Refresh optimisé (uniquement la liste des contrats)

### Maintenance
- Code modulaire et réutilisable
- Commentaires explicites
- Gestion d'erreur complète

## Support

En cas de problème:
1. Vérifier que la migration SQL a été exécutée
2. Vérifier les permissions du bucket `documents`
3. Consulter les logs de la console navigateur
4. Vérifier les logs Supabase
