# Fix : Champ {{trial_period_text}} vide dans les contrats

## Problème 1 : {{trial_period_text}} vide

Le champ `{{trial_period_text}}` restait vide dans les contrats générés par Yousign, même quand une date de fin de période d'essai était visible dans le modal.

### Cause

La logique d'envoi était trop restrictive :
1. Vérifiait d'abord si le template déclarait la variable `trial_period_text`
2. Vérifiait ensuite si la période d'essai était "applicable" selon des critères stricts
3. Si l'une de ces conditions était fausse, les données n'étaient PAS envoyées

## Problème 2 : Erreur "date_fin_periode_essai column not found"

Une erreur SQL apparaissait : `Could not find the 'date_fin_periode_essai' column of 'contrat' in the schema cache`

### Cause

Le code essayait d'insérer `date_fin_periode_essai` directement dans la table `contrat`, mais cette colonne n'existe **que dans la table `profil`**, pas dans `contrat`.

## Solution complète

**Modification dans `src/components/ContractSendModal.tsx`** :

### Correction 1 : Envoi systématique des données de période d'essai

**Avant** (trop restrictif) :
```typescript
if (templateHasTrialVar) {
  if (trialIsApplicable) {
    preparedVariables.trial_end_date = trialPeriodInfo!.endDate;
    preparedVariables.trial_period_text = formatDateFR(trialPeriodInfo!.endDate);
  }
}
```

**Après** (envoi systématique) :
```typescript
// ✅ CORRECTION : Toujours envoyer si on a les données
if (trialPeriodInfo?.endDate) {
  preparedVariables.trial_end_date = trialPeriodInfo.endDate;
  preparedVariables.date_fin_periode_essai = trialPeriodInfo.endDate;
  preparedVariables.trial_period_text = formatDateFR(trialPeriodInfo.endDate);
}
```

### Correction 2 : Retrait de l'insertion dans la table contrat

**RETIRÉ** (causait l'erreur SQL) :
```typescript
// ❌ ERREUR : cette colonne n'existe pas dans la table contrat
contractData.date_fin_periode_essai = trialPeriodInfo.endDate;
```

**Maintenant** :
- `date_fin_periode_essai` est dans `contractData.variables` (pour Yousign)
- `date_fin_periode_essai` est mise à jour dans `profil` (pour la base de données)

## Améliorations apportées

1. **Envoi systématique** : Si une date de période d'essai existe, elle est TOUJOURS envoyée
2. **Triple format dans variables** :
   - `trial_end_date` : Date ISO (2025-10-31)
   - `date_fin_periode_essai` : Date ISO (2025-10-31)
   - `trial_period_text` : Date française (31-10-2025)
3. **Sauvegarde dans profil** : La date est sauvegardée dans `profil.date_fin_periode_essai`
4. **Pas de sauvegarde dans contrat** : La colonne n'existe pas, les données sont dans `variables` (JSON)
5. **Logs détaillés** : Console.log pour déboguer facilement

## Flux de données (corrigé)

```
Modal (Frontend)
  ↓
  trialPeriodInfo.endDate (ex: "2025-10-31")
  ↓
  Envoi à Supabase :
    DANS contractData.variables (JSON) :
      - trial_end_date = "2025-10-31"
      - date_fin_periode_essai = "2025-10-31"
      - trial_period_text = "31-10-2025"

    DANS profil (table SQL) :
      - date_fin_periode_essai = "2025-10-31"

    ❌ PAS dans contrat (colonne inexistante)
  ↓
  Function create-yousign-signature
  ↓
  Récupération avec fallback :
    1. rawVars.trial_end_date (depuis contractData.variables)
    2. rawVars.date_fin_periode_essai (depuis contractData.variables)
    3. contract.profil.date_fin_periode_essai (depuis la table profil)
  ↓
  Mapping intelligent dans le DOCX
  ↓
  {{trial_period_text}} remplacé par "31-10-2025"
```

## Différence entre les tables

| Champ | Table `contrat` | Table `profil` |
|-------|----------------|----------------|
| `date_fin_periode_essai` | ❌ N'existe PAS | ✅ Existe |
| Stockage de la date | Dans `variables` (JSON) | Colonne dédiée |

## Test

Pour tester :
1. Ouvrir le modal d'envoi de contrat pour un employé
2. Remplir un contrat CDD avec période d'essai
3. Vérifier dans la console du navigateur : `✅ Période d'essai envoyée:` avec les 3 champs
4. Cliquer sur "Envoyer"
5. ✅ Plus d'erreur "date_fin_periode_essai column not found"
6. Le PDF généré doit afficher la date dans `{{trial_period_text}}`

## Notes importantes

1. **La fonction Edge n'a PAS été modifiée** : `create-yousign-signature` contenait déjà la logique de fallback nécessaire. C'était juste le frontend qui ne envoyait pas les données correctement.

2. **Schema des tables** :
   - Table `contrat` : N'a PAS de colonne `date_fin_periode_essai`, utilise `variables` (JSON)
   - Table `profil` : A une colonne `date_fin_periode_essai` (type date)

3. **Compatibilité** : La fonction Edge peut récupérer la date depuis plusieurs sources grâce au système de fallback `pickFirst()`.
