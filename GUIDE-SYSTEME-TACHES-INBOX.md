# Système de Tâches / Inbox

## Vue d'ensemble

Un système simple de boîte de réception style email pour gérer les tâches entre utilisateurs.

---

## 1. Script SQL à exécuter

**Fichier** : `create-taches-system.sql`

Exécutez ce script dans votre Supabase Dashboard pour créer :
- La table `taches` avec tous les champs nécessaires
- Les types enum `statut_tache` et `priorite_tache`
- Les politiques RLS pour la sécurité
- Les index pour optimiser les performances
- Le real-time activé
- Une vue `taches_avec_utilisateurs` pour simplifier les requêtes

**À faire** :
1. Ouvrez Supabase Dashboard → SQL Editor
2. Copiez tout le contenu de `create-taches-system.sql`
3. Exécutez le script
4. Vérifiez que la table `taches` apparaît dans votre liste de tables

---

## 2. Fonctionnalités

### Inbox dans le menu
- Nouvel onglet "Inbox" dans le menu latéral
- Badge rouge avec le nombre de tâches en attente + en cours
- Mise à jour en temps réel

### Dashboard des tâches
4 compteurs affichés :
- Total de toutes les tâches
- En attente
- En cours
- Complétées

### Filtres
Boutons de filtrage rapide :
- Toutes
- En attente
- En cours
- Complétées

### Liste des tâches
Affichage style email avec :
- Expéditeur (nom + email)
- Titre de la tâche
- Aperçu du contenu
- Badge de priorité (Haute=rouge, Normal=bleu, Basse=gris)
- Statut avec icône
- Date de création

### Créer une tâche
Modal avec :
- Sélection de l'assignee (dropdown des utilisateurs)
- Titre (obligatoire)
- Contenu (optionnel)
- Priorité (Basse/Normal/Haute)

### Détail d'une tâche
Modal affichant :
- Titre complet
- Priorité et date de création
- Expéditeur (nom + email)
- Contenu complet
- Actions disponibles selon le statut :
  - **En attente** → Bouton "Marquer comme en cours"
  - **En cours** → Bouton "Marquer comme complétée"
  - **Complétée** → Bouton "Remettre en attente"
- Bouton "Supprimer"

---

## 3. Sécurité RLS

### Politiques implémentées

**SELECT** : Un utilisateur voit uniquement :
- Les tâches qui lui sont assignées
- Les tâches qu'il a créées

**INSERT** : Tout utilisateur peut créer une tâche

**UPDATE** : Seul l'assignee peut modifier sa tâche (notamment le statut)

**DELETE** : L'expéditeur et l'assignee peuvent supprimer la tâche

---

## 4. Real-time

Le système est 100% real-time :
- Le badge Inbox se met à jour automatiquement
- La liste des tâches se rafraîchit en temps réel
- Les compteurs du dashboard s'actualisent instantanément
- Pas besoin de recharger la page

---

## 5. Structure de la base de données

### Table `taches`

```sql
CREATE TABLE taches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediteur_id uuid REFERENCES app_utilisateur(id),
  assignee_id uuid REFERENCES app_utilisateur(id),
  titre text NOT NULL,
  contenu text,
  statut statut_tache DEFAULT 'en_attente',
  priorite priorite_tache DEFAULT 'normal',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Enum `statut_tache`
- `en_attente`
- `en_cours`
- `completee`

### Enum `priorite_tache`
- `haute`
- `normal`
- `basse`

---

## 6. Workflow utilisateur

### Créer une tâche
1. Cliquer sur "Nouvelle tâche" dans l'Inbox
2. Sélectionner un utilisateur à qui assigner la tâche
3. Remplir le titre (obligatoire)
4. Ajouter un contenu descriptif (optionnel)
5. Choisir la priorité
6. Cliquer sur "Créer la tâche"

### Traiter une tâche
1. Ouvrir l'Inbox via le menu latéral
2. Voir le badge rouge indiquant le nombre de tâches actives
3. Cliquer sur une tâche pour voir les détails
4. Changer le statut :
   - **En attente** → "Marquer comme en cours"
   - **En cours** → "Marquer comme complétée"
5. Ou supprimer la tâche si nécessaire

### Suivre les tâches
1. Dashboard avec compteurs en haut
2. Filtres pour voir uniquement certains statuts
3. Toutes les tâches assignées sont visibles dans l'Inbox

---

## 7. Avantages du système

- Interface simple et familière (style email)
- Aucune permission spéciale requise (tous les utilisateurs peuvent créer/recevoir des tâches)
- Sécurisé par RLS (chacun ne voit que ses tâches)
- Real-time (mises à jour instantanées)
- Léger et performant
- Facile à étendre si besoin

---

## 8. Fichiers créés

1. **create-taches-system.sql** - Script de création de la base de données
2. **src/components/InboxPage.tsx** - Page principale avec liste + modals
3. **src/components/Sidebar.tsx** - Modifié pour ajouter l'onglet Inbox + badge
4. **src/components/Dashboard.tsx** - Modifié pour router vers InboxPage

---

## 9. Tests rapides

Après avoir exécuté le script SQL :

1. Rechargez l'application (F5)
2. Vérifiez que l'onglet "Inbox" apparaît dans le menu
3. Créez une tâche assignée à un autre utilisateur
4. Connectez-vous avec cet utilisateur
5. Vérifiez que le badge rouge apparaît sur Inbox
6. Ouvrez la tâche et changez son statut
7. Vérifiez que tout se met à jour en temps réel

---

## 10. Prochaines améliorations possibles (optionnelles)

- Filtrer par priorité
- Recherche dans les tâches
- Tri personnalisé
- Notification par email lors de l'assignation
- Pièces jointes
- Commentaires
- Date d'échéance
- Tâches récurrentes

Pour l'instant, le système de base est pleinement fonctionnel et prêt à l'emploi.
