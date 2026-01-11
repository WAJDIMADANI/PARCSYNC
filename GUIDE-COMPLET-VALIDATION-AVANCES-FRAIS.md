# Guide Complet - Système de Validation des Avances de Frais

## Vue d'ensemble

Le système de validation des avances de frais fonctionne exactement comme le système des demandes standards :

1. **Création** : L'utilisateur crée une avance de frais en brouillon
2. **Demande de validation** : Il choisit un validateur et envoie la demande
3. **Validation** : Le validateur reçoit la demande dans l'onglet Validations et peut valider ou refuser
4. **Clôture** : L'avance devient non modifiable une fois validée/refusée

## Déploiement

### Étape 1 : Exécuter la migration SQL

Exécutez le fichier `add-avance-frais-to-validation-system.sql` dans l'éditeur SQL de Supabase.

Ce fichier :
- Rend `demande_id` NULLABLE dans `demande_validation`
- Ajoute `avance_frais_id` NULLABLE dans `demande_validation`
- Ajoute une contrainte : au moins un des deux doit être rempli
- Modifie `compta_avance_frais` pour supporter le brouillon (statut et date_demande NULLABLE)
- Recrée la vue `validations_avec_details` pour inclure les avances
- Recrée la vue `v_compta_avance_frais`
- Met à jour la fonction `valider_avance_frais`

### Étape 2 : Vérifier les permissions

Assurez-vous que les utilisateurs qui doivent valider ont la permission `rh/validations`.

### Étape 3 : Tester

Le build a réussi. L'application est prête à être déployée.

## Workflow détaillé

### 1. Création d'une avance de frais

Dans **Comptabilité > Avance de frais** :

1. Cliquer sur "Nouveau"
2. Sélectionner un salarié
3. Renseigner le motif, montant, statut de la facture
4. Optionnel : joindre un justificatif
5. Cliquer sur "Enregistrer"

L'avance est créée avec :
- `statut` = NULL (brouillon)
- `date_demande` = NULL

L'avance apparaît dans la liste avec le badge gris "Brouillon" et un bouton "Demander validation".

### 2. Demande de validation

1. Cliquer sur "Demander validation" sur une ligne en brouillon
2. Un modal s'ouvre (`RequestAvanceFraisValidationModal`)
3. Remplir :
   - **Validateur** : choisir parmi les utilisateurs ayant `rh/validations`
   - **Priorité** : Normale ou Urgente
   - **Message** : expliquer pourquoi cette avance est demandée
4. Cliquer sur "Envoyer la demande"

Cela crée :
- Une entrée dans `demande_validation` avec :
  - `avance_frais_id` = ID de l'avance
  - `demande_id` = NULL
  - `demandeur_id` = utilisateur connecté
  - `validateur_id` = validateur choisi
  - `type_action` = 'autre'
  - `priorite` = celle choisie
  - `message_demande` = message saisi
  - `statut` = 'en_attente'
- Met à jour l'avance :
  - `statut` = 'en_attente'
  - `date_demande` = maintenant

L'avance passe en statut "En attente" (badge jaune) et le bouton "Demander validation" disparaît.

### 3. Validation

Le validateur va dans **Validations** :

1. Il voit l'onglet "Avances de frais" avec un badge indiquant le nombre de demandes en attente
2. Il clique sur "Traiter" sur une avance
3. Un modal s'ouvre montrant :
   - Les détails de l'avance (employé, montant, motif)
   - Un champ de commentaire optionnel
   - Deux boutons : "Refuser" et "Valider"
4. Il clique sur "Valider" ou "Refuser"

La fonction `valider_avance_frais` :
- Met à jour la `demande_validation` :
  - `statut` = 'approuvee' ou 'rejetee'
  - `commentaire_validateur` = commentaire saisi
  - `responded_at` = maintenant
- Met à jour l'avance :
  - `statut` = 'validee' ou 'refusee'
  - `commentaire_validation` = commentaire saisi
  - `valide_par` = ID du validateur
  - `date_validation` = maintenant

### 4. Après validation

L'avance affiche le badge vert "Validée" ou rouge "Refusée" et :
- Ne peut plus être modifiée
- Ne peut plus être supprimée
- Disparaît de l'onglet "Avances de frais" dans Validations

## Architecture technique

### Tables modifiées

**demande_validation** :
```sql
- demande_id uuid NULL (avant: NOT NULL)
- avance_frais_id uuid NULL (nouveau)
- CONSTRAINT check_demande_or_avance : exactement un des deux doit être rempli
```

**compta_avance_frais** :
```sql
- statut text NULL (avant: NOT NULL DEFAULT 'en_attente')
- date_demande date NULL (avant: NOT NULL DEFAULT CURRENT_DATE)
```

### Vues recréées

**validations_avec_details** :
- Inclut maintenant les avances de frais via LEFT JOIN
- Affiche "Avance de frais" comme `type_demande` pour les avances
- Affiche le `motif` comme `demande_description`
- Inclut `avance_montant`, `avance_facture`, `avance_facture_path`

**v_compta_avance_frais** :
- Inclut les infos de validation en cours via LEFT JOIN avec `demande_validation`
- Affiche `validation_id`, `validation_statut`, `validateur_id`, `validateur_nom`, `validateur_prenom`

### Composants React

**RequestAvanceFraisValidationModal** :
- Modal similaire à `RequestValidationModal`
- Affiche les détails de l'avance
- Permet de choisir validateur, priorité, message
- Crée l'entrée dans `demande_validation` et met à jour l'avance

**ComptabiliteAvanceFraisTab** :
- Affiche un badge de statut (Brouillon/En attente/Validée/Refusée)
- Bouton "Demander validation" visible uniquement pour les brouillons
- Suppression bloquée pour les avances validées/refusées

**ValidationsPage** :
- L'onglet "Avances de frais" fonctionne déjà et affiche les avances en attente
- Le modal de validation existant fonctionne avec la fonction `valider_avance_frais`

## Sécurité

- RLS activé sur `compta_avance_frais` et `demande_validation`
- Seuls les utilisateurs avec `rh/validations` peuvent voir les demandes de validation
- La fonction `valider_avance_frais` vérifie que l'utilisateur est bien le validateur
- Une avance ne peut être validée que si elle est en statut `en_attente`

## Points d'attention

1. **Migration des données existantes** : Les avances existantes ont déjà un statut et date_demande. Elles restent fonctionnelles.

2. **Compatibilité** : Le système fonctionne en parallèle avec les demandes standards sans interférence.

3. **Suppression** : Une avance en brouillon ou en attente peut être supprimée. Une fois validée/refusée, elle est verrouillée.

4. **Réassignation** : Si besoin, un validateur peut transférer la demande à un autre validateur via le système de messages dans le modal de validation.

## Résumé des fichiers

### Fichiers SQL
- `add-avance-frais-to-validation-system.sql` : Migration complète du système

### Fichiers React
- `src/components/RequestAvanceFraisValidationModal.tsx` : Modal de demande de validation (nouveau)
- `src/components/ComptabiliteAvanceFraisTab.tsx` : Onglet modifié avec workflow de validation
- `src/components/ValidationsPage.tsx` : Page déjà existante, fonctionne automatiquement

## Test du workflow

1. Créer une avance de frais
2. Vérifier qu'elle apparaît en brouillon
3. Cliquer sur "Demander validation"
4. Choisir un validateur et envoyer
5. Vérifier qu'elle passe en "En attente"
6. Se connecter avec le compte du validateur
7. Aller dans Validations > Avances de frais
8. Cliquer sur "Traiter"
9. Valider ou refuser
10. Vérifier que le statut est mis à jour
11. Vérifier que l'avance n'est plus modifiable

## Support

En cas de problème :
- Vérifier les logs de la fonction `valider_avance_frais`
- Vérifier les RLS policies sur `demande_validation` et `compta_avance_frais`
- Vérifier que les utilisateurs ont bien la permission `rh/validations`
