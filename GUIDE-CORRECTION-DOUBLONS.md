# Guide de Correction des Doublons de Matricule TCA

## 🎯 Problème Résolu

Le système d'import créait des **doublons** de salariés quand un matricule TCA existait déjà dans la base de données avec un email différent. Cela causait:
- Des salariés en doublon avec le même matricule TCA
- Des contrats liés au mauvais profil
- Des contrats invisibles dans les modaux des anciens profils

## ✅ Solutions Implémentées

### 1. Scripts SQL de Nettoyage

#### `detect-duplicate-matricules.sql`
Script pour **détecter** tous les doublons existants dans votre base de données.

**Utilisation:**
```sql
-- Dans l'éditeur SQL de Supabase, exécutez ce script
-- Il affichera tous les profils avec des matricules en double
```

**Ce qu'il fait:**
- Liste tous les matricules TCA qui apparaissent plusieurs fois
- Affiche les détails de chaque profil en doublon
- Montre combien de contrats et documents chaque profil possède

#### `merge-duplicate-matricules.sql`
Script pour **fusionner automatiquement** tous les doublons.

**⚠️ ATTENTION:** Ce script modifie la base de données de manière irréversible!

**Ce qu'il fait:**
1. Pour chaque groupe de doublons, identifie le "profil principal" (celui avec le plus de contrats ou le plus récent)
2. Transfère tous les contrats, documents, demandes, incidents et notifications vers le profil principal
3. Fusionne les informations manquantes (garde les valeurs non-null)
4. Supprime les profils en doublon

**Utilisation:**
```sql
-- 1. D'ABORD, exécutez detect-duplicate-matricules.sql pour voir les doublons
-- 2. Vérifiez les résultats
-- 3. PUIS exécutez merge-duplicate-matricules.sql pour fusionner
```

**Résultat attendu:**
```
🔄 Début de la fusion des doublons...
✅ Matricule 1598: Profil principal abc123..., 1 contrats transférés, 3 documents transférés
✅ Matricule 2405: Profil principal def456..., 2 contrats transférés, 5 documents transférés
✅ Fusion terminée!
```

### 2. Amélioration de l'Import CSV

Le système d'import a été **complètement amélioré** pour gérer les doublons intelligemment.

#### Nouvelles Fonctionnalités

**Détection des doublons par:**
- Email (comme avant)
- **Matricule TCA (NOUVEAU)**

**Comportement lors de l'import:**

| Cas | Avant | Maintenant |
|-----|-------|------------|
| Matricule TCA existe déjà | ❌ Crée un doublon | ✅ Met à jour le profil existant |
| Email existe déjà | ❌ Erreur bloquante | ⚠️ Warning + Mise à jour possible |
| Nouveau salarié | ✅ Création | ✅ Création |

**Messages affichés:**

```
⚠️ Matricule "1598" existe (Fatoumata TOUNKARA) - Sera mis à jour
⚠️ Email "test@email.com" existe déjà - Sera mis à jour
```

#### Comment ça fonctionne maintenant

1. **Upload du fichier CSV**
   - Le système détecte automatiquement les colonnes
   - Vérifie les emails ET matricules existants

2. **Prévisualisation**
   - Les lignes avec doublons sont marquées en orange (⚠️ Warning)
   - Message clair indiquant qu'elles seront mises à jour

3. **Import**
   - **Si matricule existe:** Met à jour le profil existant avec les nouvelles données
   - **Si nouveau:** Crée un nouveau profil
   - **Contrats:** Toujours liés au bon profil (existant ou nouveau)

## 📋 Procédure Recommandée

### Étape 1: Nettoyer les doublons existants (UNE SEULE FOIS)

1. **Détection**
   ```sql
   -- Exécutez dans Supabase SQL Editor
   -- Copiez le contenu de: detect-duplicate-matricules.sql
   ```

2. **Vérification**
   - Regardez les résultats
   - Notez les matricules en doublon
   - Vérifiez quel profil a le plus de données

3. **Fusion**
   ```sql
   -- Exécutez dans Supabase SQL Editor
   -- Copiez le contenu de: merge-duplicate-matricules.sql
   ```

4. **Confirmation**
   - Le script affichera les résultats de la fusion
   - Vérifiez que le nombre de doublons = 0

### Étape 2: Utiliser le nouvel import

1. **Préparez votre CSV**
   - Incluez la colonne "Modeles de contrats" (ex: CDD, CDI)
   - Incluez la colonne "Statut" avec "signed" pour les contrats signés
   - Incluez toutes les informations du salarié

2. **Import via l'interface**
   - Allez dans "Paramètres" > "Import en masse"
   - Uploadez votre CSV
   - **Nouveau:** Les doublons seront automatiquement détectés
   - Lignes en orange = seront mises à jour (pas de création de doublon)

3. **Lancez l'import**
   - Le système mettra à jour les profils existants
   - Les contrats seront liés aux bons profils
   - Plus de doublons!

## 🎨 Affichage des Contrats dans le Modal

Après la correction, les contrats s'afficheront correctement dans **deux endroits**:

### 1. Onglet "Vue d'ensemble" → "Modèle de contrat signé"
Affiche:
- Le type de contrat (CDD, CDI, etc.) depuis la colonne CSV "Modeles de contrats"
- La date de signature
- Badge coloré selon le type

### 2. Onglet "Contrats"
Affiche la liste complète avec:
- Type de contrat
- Date de début et fin
- Date de signature
- Statut (Signé, Envoyé, etc.)
- Actions (Télécharger, Supprimer)

## 🔍 Cas d'Utilisation: Fatoumata TOUNKARA

**Situation initiale:**
- Profil "Fatoumata TOUNKARA" matricule 1598 existe déjà
- Import CSV avec même matricule 1598 mais email différent
- ❌ Système créait un doublon
- ❌ Contrat lié au nouveau profil
- ❌ Modal de l'ancien profil affiche "Aucun contrat"

**Après correction:**
1. **Fusion des doublons existants** (exécuter `merge-duplicate-matricules.sql`)
   - Les 2 profils sont fusionnés en 1 seul
   - Le contrat est transféré vers le profil principal
   - ✅ Plus qu'un seul profil avec matricule 1598

2. **Prochain import**
   - Détection: "Matricule 1598 existe - Sera mis à jour"
   - ✅ Mise à jour du profil existant
   - ✅ Contrat lié au bon profil
   - ✅ Modal affiche le contrat correctement

## ⚠️ Notes Importantes

1. **Backup recommandé**
   - Avant d'exécuter `merge-duplicate-matricules.sql`, faites un backup via Supabase

2. **Ordre d'exécution**
   - D'abord: `detect-duplicate-matricules.sql` (lecture seule)
   - Ensuite: `merge-duplicate-matricules.sql` (modification)
   - Une seule fois suffit!

3. **Imports futurs**
   - Utilisez toujours la même colonne "MATRICULE TCA" dans vos CSV
   - Le système détectera et mettra à jour automatiquement
   - Plus besoin de scripts de fusion

4. **Colonne "Modeles de contrats"**
   - Valeurs acceptées: CDD, CDI, CTT, Avenant, Stage, Alternance
   - S'affiche dans le modal avec un badge coloré
   - Stockée dans `contract.variables.type_contrat`

## 🎯 Résultat Final

Après avoir suivi ce guide:
- ✅ Tous les doublons sont fusionnés
- ✅ Tous les contrats sont visibles dans les bons modaux
- ✅ Le type de contrat (colonne CSV "Modeles de contrats") s'affiche correctement
- ✅ Les imports futurs ne créeront plus de doublons
- ✅ Mise à jour automatique des profils existants

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifiez que les scripts SQL s'exécutent sans erreur
2. Vérifiez les logs dans la console browser (F12)
3. Vérifiez que la colonne "MATRICULE TCA" est bien présente dans votre CSV
