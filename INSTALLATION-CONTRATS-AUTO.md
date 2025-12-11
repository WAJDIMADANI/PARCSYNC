# Installation du système automatique de notifications pour contrats

## Ce que fait ce système

Quand vous créez un contrat (peu importe comment) :
- Via Yousign
- En uploadant un PDF manuellement
- En important en masse

Le système crée **automatiquement** :
- Une **notification** si le contrat expire dans plus de 30 jours
- Un **incident** si le contrat expire dans moins de 30 jours

## Installation (3 étapes - 5 minutes)

### Étape 1 : Extension des types (30 secondes)

1. Ouvrir Supabase : **SQL Editor**
2. Copier/coller le contenu du fichier : `update-notification-incident-types.sql`
3. Cliquer sur **Run**

Vous devriez voir :
```
Migration terminée avec succès!
Les types avenant_1 et avenant_2 sont maintenant acceptés.
```

### Étape 2 : Fonction de création automatique (1 minute)

1. Toujours dans le **SQL Editor**
2. Copier/coller le contenu du fichier : `create-auto-notification-for-contracts.sql`
3. Cliquer sur **Run**

Vous devriez voir :
```
Fonction créée avec succès!
```

### Étape 3 : Activation du trigger automatique (1 minute)

1. Toujours dans le **SQL Editor**
2. Copier/coller le contenu du fichier : `create-trigger-auto-notification-contrat.sql`
3. Cliquer sur **Run**

Vous devriez voir :
```
==============================================
Trigger automatique activé avec succès!
==============================================

Le système créera automatiquement :
- Une NOTIFICATION si le contrat expire dans > 30 jours
- Un INCIDENT si le contrat expire dans < 30 jours

Cela fonctionne pour :
✓ Contrats signés via Yousign
✓ Contrats uploadés manuellement
✓ Contrats importés en masse

Testez maintenant en créant un contrat manuel!
```

## Test immédiat

### Pour tester avec un employé dont le contrat est expiré (comme Djeneba DEMBELE) :

1. Cliquer sur l'employé
2. Cliquer sur **"Ajouter un contrat"**
3. Remplir les informations :
   - Type : **CDD**
   - Date de début : **aujourd'hui**
   - Date de fin : **dans 60 jours** (pour tester une notification)
   - Uploader un PDF de contrat
4. Cliquer sur **"Valider"**

### Vérification :

1. Aller dans **"Notifications"** dans le menu
2. Vous devriez voir une nouvelle notification pour cet employé
3. Message : "Le contrat CDD du salarié expire le [date]. Prévoir le renouvellement ou la fin de contrat."

### Test avec un incident :

1. Créer un autre contrat avec une date de fin dans **15 jours**
2. Vérifier dans **"Incidents"**
3. Un incident avec priorité **"haute"** devrait être créé automatiquement

## Résolution de problèmes

### "Notification existante trouvée, pas de doublon créé"

C'est **normal**! Le système empêche les doublons. Si une notification/incident existe déjà pour ce salarié, il ne crée pas de doublon.

### Aucune notification n'apparaît

Vérifiez :
1. Le contrat est bien de type **CDD** (pas CDI)
2. Le statut du contrat est bien **"signe"**
3. La date de fin est bien renseignée

### Besoin d'aide

Les messages de debug apparaissent dans les logs Supabase :
- **Database** > **Logs** > chercher "Notification créée automatiquement"

## Désinstallation (si nécessaire)

Pour désactiver le trigger :
```sql
DROP TRIGGER IF EXISTS trigger_auto_notification_contrat ON contrat;
DROP FUNCTION IF EXISTS auto_create_contract_notification();
```

## Fichiers impliqués

1. `update-notification-incident-types.sql` - Ajoute les nouveaux types
2. `create-auto-notification-for-contracts.sql` - Fonction de création
3. `create-trigger-auto-notification-contrat.sql` - Trigger automatique
