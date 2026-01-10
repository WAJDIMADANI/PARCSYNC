# Déploiement du système de validation des avances de frais

## Ce qui a été fait

### Modifications côté UI

1. **ComptabiliteAvanceFraisTab.tsx** :
   - Ajout d'une colonne "Statut" dans la liste
   - Lecture depuis la vue `v_compta_avance_frais`
   - Deux boutons dans le modal de création :
     - "Enregistrer en brouillon" : crée l'avance sans demander de validation
     - "Enregistrer & Demander validation" : crée l'avance avec statut `en_attente` et `date_demande`
   - Affichage des statuts avec badges colorés :
     - Brouillon (gris)
     - En attente (jaune)
     - Validée (vert)
     - Refusée (rouge)
   - Suppression bloquée pour les avances validées ou refusées

2. **ValidationsPage.tsx** :
   - Onglet "Avances de frais" déjà présent et fonctionnel
   - Modal de validation avec boutons Valider/Refuser
   - Champ commentaire optionnel
   - Utilise la fonction RPC `valider_avance_frais`

### Modifications côté BDD

Le fichier `create-valider-avance-frais-function.sql` contient la fonction RPC nécessaire.

## Déploiement

### Étape 1 : Créer la fonction de validation

Exécutez le fichier SQL dans l'éditeur SQL de Supabase :

```bash
# Copiez le contenu du fichier create-valider-avance-frais-function.sql
# et exécutez-le dans l'éditeur SQL de Supabase
```

OU directement dans psql :

```bash
psql $DATABASE_URL < create-valider-avance-frais-function.sql
```

### Étape 2 : Vérifier les permissions

Assurez-vous que les utilisateurs qui doivent valider les avances ont la permission `rh/validations`.

### Étape 3 : Tester

1. Connectez-vous à l'application
2. Allez dans Comptabilité > Avance de frais
3. Créez une nouvelle avance de frais
4. Cliquez sur "Enregistrer & Demander validation"
5. Allez dans l'onglet Validations
6. Vérifiez que l'avance apparaît dans l'onglet "Avances de frais"
7. Cliquez sur "Traiter" et validez ou refusez l'avance
8. Retournez dans Comptabilité > Avance de frais
9. Vérifiez que le statut a été mis à jour

## Workflow complet

1. **Création** :
   - L'utilisateur crée une avance de frais
   - Il peut l'enregistrer en brouillon (statut null) ou demander validation (statut `en_attente`)

2. **Validation** :
   - Les avances avec statut `en_attente` apparaissent dans l'onglet "Avances de frais" de la page Validations
   - Un validateur peut Valider ou Refuser avec un commentaire optionnel
   - La fonction RPC met à jour :
     - `statut` : 'validee' ou 'refusee'
     - `valide_par` : ID de l'utilisateur qui valide
     - `date_validation` : Date et heure de validation
     - `commentaire_validation` : Commentaire du validateur

3. **Après validation** :
   - L'avance ne peut plus être modifiée ni supprimée
   - Le statut est visible dans la liste des avances de frais
   - L'avance disparaît de l'onglet "Avances de frais" de la page Validations

## Sécurité

- La fonction RPC vérifie que le statut est `en_attente` avant de permettre la validation
- Seuls les utilisateurs authentifiés peuvent appeler la fonction
- La suppression est bloquée côté UI pour les avances validées/refusées
- RLS activé sur la table `compta_avance_frais`

## Notes techniques

- La vue `v_compta_avance_frais` doit exposer toutes les colonnes nécessaires (id, profil_id, matricule, nom, prenom, motif, montant, facture, facture_file_path, date_demande, statut, commentaire_validation, valide_par, date_validation, created_at, updated_at)
- Le tri se fait par `date_demande DESC` pour afficher les plus récentes en premier
- Les avances en brouillon (statut null) peuvent être supprimées
- Les avances en attente de validation peuvent être supprimées (mais idéalement, ajouter une demande de validation pour la suppression)
