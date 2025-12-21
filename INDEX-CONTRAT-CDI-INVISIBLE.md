# Index : Résolution du problème de contrat CDI invisible

## Problème
Contrat CDI de Jean Marie MOBA-BIKOMBO signé dans YouSign mais invisible dans l'application.

## Fichiers de résolution

### 1. Guide de résolution rapide (COMMENCEZ ICI)
**Fichier:** `RESOLUTION-RAPIDE-CONTRAT-CDI-INVISIBLE.md`

Guide en 3 étapes pour diagnostiquer et corriger rapidement le problème.
Temps estimé : 3-5 minutes

### 2. Scripts SQL

#### a. Diagnostic
**Fichier:** `DIAGNOSTIC-CONTRAT-CDI-MOBA.sql`

Script complet pour diagnostiquer :
- État actuel du contrat
- Logs webhook YouSign
- Notifications liées
- Répartition des contrats par statut

#### b. Correction
**Fichier:** `CORRIGER-CONTRAT-CDI-MOBA.sql`

Script pour mettre à jour le statut du contrat en "signe" et ajouter la date de signature.

#### c. Vérification des logs
**Fichier:** `VERIFIER-LOGS-WEBHOOK-MOBA.sql`

Script pour vérifier si le webhook YouSign a reçu et traité l'événement de signature.

### 3. Guide détaillé
**Fichier:** `GUIDE-RESOLUTION-CONTRAT-CDI-INVISIBLE.md`

Guide complet avec :
- Causes possibles du problème
- Étapes de diagnostic détaillées
- Solutions multiples
- Prévention future
- Amélioration du webhook

## Ordre d'exécution recommandé

1. **Lecture rapide** → `RESOLUTION-RAPIDE-CONTRAT-CDI-INVISIBLE.md`
2. **Diagnostic** → Exécuter `DIAGNOSTIC-CONTRAT-CDI-MOBA.sql`
3. **Correction** → Exécuter `CORRIGER-CONTRAT-CDI-MOBA.sql` (si nécessaire)
4. **Vérification** → Rafraîchir l'application et vérifier
5. **Logs** → Exécuter `VERIFIER-LOGS-WEBHOOK-MOBA.sql` (optionnel)
6. **Guide détaillé** → Lire `GUIDE-RESOLUTION-CONTRAT-CDI-INVISIBLE.md` pour comprendre le problème en profondeur

## Résumé de la solution

Le problème est probablement que le webhook YouSign n'a pas mis à jour le statut du contrat de `en_attente_signature` à `signe` après la signature.

La solution consiste à :
1. Identifier le contrat dans la base de données
2. Mettre à jour manuellement son statut à "signe"
3. Ajouter la date de signature si elle est manquante

Après cette correction, le contrat apparaîtra dans le bloc "Contrats signés" de l'application.

## Support

Si le problème persiste après avoir suivi tous les guides :
1. Vérifiez les permissions RLS sur la table `contrat`
2. Vérifiez que l'utilisateur a accès au profil du salarié
3. Vérifiez les logs de la console du navigateur pour des erreurs
4. Contactez le support technique avec les résultats du diagnostic
