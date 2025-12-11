# Guide de correction des CDI fantômes

## Problème identifié

Lors de l'import CSV, le système créait automatiquement un contrat CDI pour tous les salariés ayant des avenants, même si le CSV ne mentionnait pas de CDI. Cela créait des "CDI fantômes" qui n'existent pas dans les données source.

**Exemple concret :**
- CSV : Matricule 928 avec "Modeles de contrats" = "Avenant 2"
- Base de données : 1 CDI (fantôme) + 1 Avenant
- **Résultat attendu** : 0 CDI + 1 Avenant

## Corrections apportées

### 1. Code d'import corrigé

**Fichier modifié :** `src/components/ImportSalariesBulk.tsx`

**Ancienne logique (ligne 950) :**
```javascript
type: emp.data.date_fin_contrat ? 'cdd' : 'cdi'
```
→ Créait un CDI si date_fin_contrat était NULL

**Nouvelle logique :**
```javascript
// Analyse intelligente du champ "Modeles de contrats"
if (modeleContrat.includes('avenant') && !modeleContrat.includes('cdi') && !modeleContrat.includes('cdd')) {
  // Ne crée PAS de contrat principal si uniquement "Avenant" dans modele_contrat
  contractType = null;
} else if (modeleContrat.includes('cdi')) {
  contractType = 'cdi';
} else if (modeleContrat.includes('cdd') || emp.data.date_fin_contrat) {
  contractType = 'cdd';
}
```

**Règles appliquées :**
- ✅ Si "Modeles de contrats" contient "CDI" → crée un CDI
- ✅ Si "Modeles de contrats" contient "CDD" OU date_fin existe → crée un CDD
- ✅ Si "Modeles de contrats" contient UNIQUEMENT "Avenant" → ne crée PAS de contrat principal
- ✅ Les avenants sont toujours créés depuis les colonnes avenant_1 et avenant_2

### 2. Migration SQL de correction

**Fichier :** `fix-phantom-cdi-contracts.sql`

**Ce que fait la migration :**
1. Identifie les profils avec CDI fantômes (CDI importé + avenants + aucun CDD)
2. Supprime les incidents liés à ces CDI fantômes
3. Supprime les CDI fantômes
4. Affiche un rapport de vérification

**Critères de détection d'un CDI fantôme :**
- Type = 'cdi'
- Source = 'import' (créé par import, pas manuellement)
- Le profil a au moins un avenant
- Le profil n'a AUCUN CDD

## Comment appliquer la correction

### Étape 1 : Exécuter la migration SQL

Dans l'éditeur SQL Supabase :

```sql
-- Copier-coller tout le contenu de fix-phantom-cdi-contracts.sql
```

La migration affichera :
```
🔍 Nombre de profils avec CDI fantômes détectés: 40
✅ Vérification terminée:
   - CDI fantômes restants: 0
   - Total avenants: XX
   - Total CDD: XX
🎉 Tous les CDI fantômes ont été supprimés avec succès!
```

### Étape 2 : Vérification dans l'interface

1. **Onglet Salariés** : Ouvrez la fiche du matricule 928 (Ali BOUCHAMA)
   - Avant : 2 contrats (1 CDI + 1 Avenant)
   - Après : 1 contrat (Avenant 1 au contrat)

2. **Onglet Incidents** :
   - L'onglet "CDD" affiche uniquement les vrais CDD (22 incidents)
   - L'onglet "Avenant" affiche les avenants (31 incidents)
   - Plus de CDI fantômes dans les compteurs

### Étape 3 : Tester un nouvel import

Après correction, si vous réimportez le CSV PROPRE.csv :
- Les salariés avec "Avenant 1" ou "Avenant 2" dans "Modeles de contrats" n'auront PLUS de CDI automatique
- Seuls les avenants seront créés
- Si vous voulez un CDI, il faut que "Modeles de contrats" contienne explicitement "CDI"

## Impact sur les données existantes

**Suppression prévue :**
- ~40 contrats CDI fantômes (profils avec uniquement avenants dans le CSV)
- Incidents associés à ces CDI fantômes

**Conservation :**
- ✅ Tous les avenants (aucune suppression)
- ✅ Tous les vrais CDD (aucune suppression)
- ✅ Tous les vrais CDI (créés manuellement ou avec "CDI" dans le CSV)

## Cas particuliers

### Si un profil a vraiment besoin d'un CDI

Si après la migration, vous constatez qu'un salarié devrait avoir un CDI :
1. Allez dans sa fiche salarié
2. Cliquez sur "Ajouter un contrat"
3. Uploadez le contrat CDI manuellement

### Si vous voulez importer des CDI via CSV

Dans votre CSV, assurez-vous que la colonne "Modeles de contrats" contient :
- "CDI" ou "cdi" pour créer un CDI
- "CDD" ou "cdd" pour créer un CDD
- "Avenant X" seul pour créer uniquement des avenants

## Résumé technique

| Avant | Après |
|-------|-------|
| 40 salariés avec CDI fantôme + avenants | 40 salariés avec uniquement avenants |
| Import : date_fin NULL → CDI automatique | Import : analyse "Modeles de contrats" |
| Onglet CDD : incidents CDD + CDI fantômes | Onglet CDD : incidents CDD uniquement |
| Confusion CDI/Avenant dans l'UI | Distinction claire CDI/CDD/Avenant |

**Code corrigé :** `ImportSalariesBulk.tsx` ligne 945-982
**Migration SQL :** `fix-phantom-cdi-contracts.sql`
