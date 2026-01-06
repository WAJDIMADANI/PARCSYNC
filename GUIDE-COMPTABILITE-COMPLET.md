# Guide Complet - Module Comptabilité

## Ce qui a été fait

### 1. Base de données
- Création de 2 tables : `entrees_comptables` et `sorties_comptables`
- Sécurité RLS activée avec permissions complètes
- Triggers automatiques pour `updated_at`
- Index pour optimiser les performances

### 2. Interface utilisateur
- 2 nouveaux composants React :
  - `ComptabiliteEntriesTab.tsx` : Gestion des entrées
  - `ComptabiliteExitsTab.tsx` : Gestion des sorties
- Intégration dans le dashboard de comptabilité
- Onglets avec changement de couleur (vert pour entrées, rouge pour sorties)

### 3. Permissions
- Ajout de la section "Comptabilité" dans la gestion des utilisateurs
- 2 permissions : `compta/entrees` et `compta/sorties`
- Pour l'instant, accessible à tous les utilisateurs

## Instructions d'activation

### Étape 1 : Créer les tables SQL

1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet
3. Clique sur "SQL Editor" dans le menu de gauche
4. Copie-colle le contenu du fichier **`EXECUTER-COMPTABILITE-MAINTENANT.sql`**
5. Clique sur "Run" (ou Ctrl+Enter)
6. Tu devrais voir : "Tables de comptabilité créées avec succès !"

### Étape 2 : Vérifier les permissions

1. Va dans **Administration > Utilisateurs**
2. Clique sur "Gérer les permissions" d'un utilisateur
3. Tu devrais maintenant voir une nouvelle section **"Comptabilité"** avec :
   - Entrées
   - Sorties

### Étape 3 : Tester le module

1. Rafraîchis la page
2. Dans le menu latéral, tu devrais voir **"Comptabilité"** avec 2 onglets :
   - Entrées
   - Sorties

## Fonctionnalités

### Onglet Entrées
- Ajouter une nouvelle entrée financière
- Champs disponibles :
  - Date
  - Montant
  - Catégorie (Vente, Prestation, Subvention, etc.)
  - Client
  - Description
  - Référence (numéro de facture)
  - Mode de paiement
- Filtres par catégorie et dates
- Recherche par client, description ou référence
- Total des entrées affiché en haut
- Actions : Modifier et Supprimer

### Onglet Sorties
- Ajouter une nouvelle sortie financière
- Champs disponibles :
  - Date
  - Montant
  - Catégorie (Achat, Loyer, Salaire, Charges, etc.)
  - Fournisseur
  - Description
  - Référence (numéro de facture)
  - Mode de paiement
- Filtres par catégorie et dates
- Recherche par fournisseur, description ou référence
- Total des sorties affiché en haut
- Actions : Modifier et Supprimer

## Catégories disponibles

### Entrées
- Vente
- Prestation de service
- Subvention
- Remboursement
- Autre

### Sorties
- Achat
- Loyer
- Salaire
- Charges sociales
- Assurance
- Électricité
- Eau
- Téléphone
- Internet
- Carburant
- Maintenance
- Fournitures
- Autre

## Modes de paiement
- Espèces
- Chèque
- Virement
- Carte bancaire
- Prélèvement

## Sécurité

Toutes les données sont protégées par RLS (Row Level Security) :
- Seuls les utilisateurs authentifiés peuvent voir les données
- Seuls les utilisateurs authentifiés peuvent créer/modifier/supprimer
- Traçabilité : le créateur de chaque entrée est enregistré

## Structure des tables

### entrees_comptables
```sql
- id (uuid)
- date (date)
- montant (decimal)
- categorie (text)
- description (text)
- reference (text)
- mode_paiement (text)
- client (text)
- created_by (uuid) → référence app_utilisateur
- created_at (timestamp)
- updated_at (timestamp)
```

### sorties_comptables
```sql
- id (uuid)
- date (date)
- montant (decimal)
- categorie (text)
- description (text)
- reference (text)
- mode_paiement (text)
- fournisseur (text)
- created_by (uuid) → référence app_utilisateur
- created_at (timestamp)
- updated_at (timestamp)
```

## Fichiers modifiés

1. **EXECUTER-COMPTABILITE-MAINTENANT.sql** : Script SQL à exécuter
2. **src/components/ComptabiliteEntriesTab.tsx** : Composant Entrées
3. **src/components/ComptabiliteExitsTab.tsx** : Composant Sorties
4. **src/components/AccountingDashboard.tsx** : Dashboard intégré
5. **src/components/UserManagement.tsx** : Permissions ajoutées
6. **src/components/Sidebar.tsx** : Logs nettoyés

## Prochaines étapes possibles

Si tu veux améliorer le module :

1. **Rapports** : Ajouter un tableau de bord avec graphiques
2. **Export** : Permettre l'export en Excel/PDF
3. **Catégories personnalisées** : Permettre d'ajouter ses propres catégories
4. **Budget** : Système de budget par catégorie avec alertes
5. **Pièces jointes** : Pouvoir joindre des factures PDF
6. **Récurrence** : Entrées/sorties récurrentes (loyer mensuel, etc.)
7. **TVA** : Gestion de la TVA
8. **Projets** : Associer les entrées/sorties à des projets

---

**Tout est prêt ! Il suffit maintenant d'exécuter le SQL.**
