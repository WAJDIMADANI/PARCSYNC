# Fix : Champ {{trial_period_text}} vide dans les contrats

## Problème

Le champ `{{trial_period_text}}` restait vide dans les contrats générés par Yousign, même quand une date de fin de période d'essai était visible dans le modal.

## Cause

La logique d'envoi était trop restrictive :
1. Vérifiait d'abord si le template déclarait la variable `trial_period_text`
2. Vérifiait ensuite si la période d'essai était "applicable" selon des critères stricts
3. Si l'une de ces conditions était fausse, les données n'étaient PAS envoyées

## Solution

**Modification dans `src/components/ContractSendModal.tsx`** :

### Avant
```typescript
if (templateHasTrialVar) {
  if (trialIsApplicable) {
    preparedVariables.trial_end_date = trialPeriodInfo!.endDate;
    preparedVariables.trial_period_text = formatDateFR(trialPeriodInfo!.endDate);
  }
}
```

### Après
```typescript
// ✅ CORRECTION : Toujours envoyer si on a les données
if (trialPeriodInfo?.endDate) {
  preparedVariables.trial_end_date = trialPeriodInfo.endDate;
  preparedVariables.trial_period_text = formatDateFR(trialPeriodInfo.endDate);
}
```

## Améliorations apportées

1. **Envoi systématique** : Si une date de période d'essai existe, elle est TOUJOURS envoyée
2. **Double format** :
   - `trial_end_date` : Date ISO (2025-10-31)
   - `trial_period_text` : Date française (31-10-2025)
3. **Sauvegarde dans profil** : La date est sauvegardée dans `profil.date_fin_periode_essai`
4. **Sauvegarde dans contrat** : La date est aussi sauvegardée dans `contrat.date_fin_periode_essai`
5. **Logs détaillés** : Console.log pour déboguer facilement

## Flux de données

```
Modal (Frontend)
  ↓
  trialPeriodInfo.endDate (ex: "2025-10-31")
  ↓
  Envoi à Supabase :
    - contractData.variables.trial_end_date = "2025-10-31"
    - contractData.variables.trial_period_text = "31-10-2025"
    - contractData.date_fin_periode_essai = "2025-10-31"
    - profil.date_fin_periode_essai = "2025-10-31"
  ↓
  Function create-yousign-signature
  ↓
  Récupération avec fallback :
    - rawVars.trial_end_date
    - contract.date_fin_periode_essai
    - contract.profil.date_fin_periode_essai
  ↓
  Mapping intelligent dans le DOCX
  ↓
  {{trial_period_text}} remplacé par "31-10-2025"
```

## Test

Pour tester :
1. Créer un contrat CDD avec période d'essai
2. Vérifier dans la console : `✅ Période d'essai envoyée:`
3. Le PDF généré doit afficher la date dans `{{trial_period_text}}`

## Note importante

La fonction Edge `create-yousign-signature` n'a PAS été modifiée. Elle contenait déjà la logique de fallback nécessaire. C'était juste le frontend qui ne envoyait pas les données.
