# Guide d'installation - Système d'avances de frais avec validation

## Vue d'ensemble

Ce système permet de gérer les demandes d'avances de frais avec un workflow de validation intégré. Les employés peuvent créer des demandes d'avances de frais depuis l'onglet Comptabilité, et les RH peuvent les valider ou les refuser depuis l'onglet Validations.

## Fonctionnalités

1. **Onglet Avances de frais** (Comptabilité)
   - Créer une nouvelle demande d'avance de frais
   - Voir toutes les avances (en attente, validées, refusées)
   - Filtrer par statut et rechercher
   - Export Excel
   - Upload de justificatifs

2. **Onglet Validations** (RH)
   - Nouvel onglet "Avances de frais" pour voir les demandes en attente
   - Valider ou refuser avec commentaire
   - Notifications en temps réel

## Installation

### Étape 1 : Exécuter le script SQL

Copiez et exécutez le contenu du fichier `create-compta-avance-frais-system.sql` dans l'éditeur SQL de Supabase :

1. Ouvrez votre projet Supabase
2. Allez dans "SQL Editor"
3. Créez une nouvelle requête
4. Collez tout le contenu du fichier SQL
5. Exécutez la requête

Ce script va créer :
- La table `compta_avance_frais`
- La vue `v_compta_avance_frais` (pour afficher les avances avec les infos des employés)
- Les politiques RLS appropriées
- Le bucket storage `compta-avance-frais` pour les justificatifs
- La fonction `valider_avance_frais` pour la validation

### Étape 2 : Vérification

Vérifiez que tout est bien créé :

```sql
-- Vérifier que la table existe
SELECT * FROM compta_avance_frais LIMIT 1;

-- Vérifier que la vue existe
SELECT * FROM v_compta_avance_frais LIMIT 1;

-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE id = 'compta-avance-frais';
```

### Étape 3 : Permissions

Les utilisateurs avec les permissions suivantes peuvent valider les avances de frais :
- `gerer_demandes`
- `admin_total`

Vérifiez que vos utilisateurs RH ont bien ces permissions.

## Utilisation

### Pour les employés

1. Aller dans **Comptabilité** > **Avance de frais**
2. Cliquer sur "Nouveau"
3. Remplir :
   - Salarié (recherche par matricule/nom)
   - Motif de l'avance
   - Montant en euros
   - Statut du justificatif (À fournir / Transmis / Reçu)
   - Uploader le justificatif (optionnel)
4. Enregistrer

### Pour les RH (Validation)

1. Aller dans **Validations**
2. Cliquer sur l'onglet **Avances de frais**
3. Voir la liste des avances en attente
4. Cliquer sur "Traiter" pour une avance
5. Ajouter un commentaire (optionnel)
6. Cliquer sur "Valider" ou "Refuser"

## Structure de la base de données

### Table `compta_avance_frais`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| profil_id | uuid | Référence vers le profil de l'employé |
| montant | numeric(10,2) | Montant de l'avance en euros |
| motif | text | Raison de l'avance |
| facture | text | Statut du justificatif (A_FOURNIR, TRANSMIS, RECU) |
| facture_file_path | text | Chemin du fichier justificatif dans le storage |
| date_demande | date | Date de la demande |
| statut | text | Statut (en_attente, validee, refusee) |
| commentaire_validation | text | Commentaire du validateur |
| valide_par | uuid | ID de l'utilisateur qui a validé |
| date_validation | timestamptz | Date de validation |
| created_at | timestamptz | Date de création |
| updated_at | timestamptz | Date de modification |

## API / Fonctions RPC

### `valider_avance_frais(p_avance_id, p_validation_statut, p_commentaire)`

Fonction pour valider ou refuser une avance de frais.

**Paramètres :**
- `p_avance_id` : UUID de l'avance à valider
- `p_validation_statut` : 'validee' ou 'refusee'
- `p_commentaire` : Commentaire optionnel (text)

**Exemple d'utilisation :**

```typescript
const { error } = await supabase.rpc('valider_avance_frais', {
  p_avance_id: 'uuid-de-lavance',
  p_validation_statut: 'validee',
  p_commentaire: 'Approuvé pour mission Paris'
});
```

## Sécurité (RLS)

Les politiques de sécurité sont configurées pour :

1. **Lecture** :
   - Les utilisateurs voient leurs propres avances
   - Les RH/admins voient toutes les avances

2. **Création** :
   - Les utilisateurs peuvent créer des avances pour eux-mêmes

3. **Mise à jour** :
   - Seuls les RH/admins peuvent mettre à jour (validation)

4. **Storage** :
   - Upload : Tous les utilisateurs authentifiés
   - Lecture : Tous les utilisateurs authentifiés
   - Suppression : Seulement RH/admins

## Modifications apportées

### Fichiers créés :
- `create-compta-avance-frais-system.sql` : Script de création de la base de données

### Fichiers modifiés :
- `src/components/ValidationsPage.tsx` : Ajout de l'onglet "Avances de frais"

### Fichiers existants utilisés :
- `src/components/ComptabiliteAvanceFraisTab.tsx` : Déjà existant
- `src/components/AccountingDashboard.tsx` : Utilise déjà ComptabiliteAvanceFraisTab

## Dépannage

### L'onglet "Avances de frais" n'apparaît pas dans Validations

Vérifiez que :
- Le script SQL a été exécuté complètement
- Votre utilisateur a la permission `rh/validations`

### Erreur "Vous n'avez pas les permissions nécessaires"

L'utilisateur doit avoir une des permissions suivantes :
- `gerer_demandes`
- `admin_total`

### Les avances n'apparaissent pas dans la liste

Vérifiez que :
- La table `compta_avance_frais` contient des données
- La vue `v_compta_avance_frais` fonctionne correctement
- Les politiques RLS sont bien configurées

```sql
-- Test manuel
SELECT * FROM compta_avance_frais;
SELECT * FROM v_compta_avance_frais;
```

## Support

Pour toute question ou problème, vérifiez :
1. Les logs de la console du navigateur
2. Les logs Supabase dans l'onglet "Logs"
3. Les politiques RLS dans l'onglet "Authentication" > "Policies"
