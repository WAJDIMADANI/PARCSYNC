# Système de locataires externes - Implémentation complète

## 📋 Vue d'ensemble

Le système de locataires externes permet de gérer les locations de véhicules à des personnes physiques et des entreprises externes, en plus des salariés TCA. Il inclut :

- **Carnet d'adresses** réutilisable avec recherche
- **Historique complet** des modifications automatique
- **Gestion des attributions** avec dates de début et fin
- **Types de locataires** : Salariés TCA, Personnes externes, Entreprises externes

## 🚀 Étape 1 : Migration SQL (OBLIGATOIRE)

### ⚠️ IMPORTANT : À faire en premier

1. Ouvrez le **SQL Editor** dans votre dashboard Supabase
2. Copiez le contenu du fichier `EXECUTER-MAINTENANT-locataires-externes.sql`
3. Collez-le dans l'éditeur SQL
4. Cliquez sur **Run** pour exécuter la migration
5. Vérifiez qu'il n'y a pas d'erreurs

### Ce que fait la migration :

✅ Crée la table `locataire_externe` (carnet d'adresses)
✅ Crée la table `locataire_externe_history` (historique automatique)
✅ Modifie `attribution_vehicule` pour supporter les locataires externes
✅ Ajoute le champ `date_fin` pour les locations temporaires
✅ Met à jour la vue `v_vehicles_list`
✅ Configure les RLS policies
✅ Configure les triggers automatiques pour l'historique

## 📦 Composants créés

### 1. LocataireExterneSelector
**Fichier:** `src/components/LocataireExterneSelector.tsx`

Composant de sélection/création de locataire externe avec :
- Recherche dans le carnet d'adresses
- Création à la volée
- Affichage de l'historique

### 2. TerminerAttributionModal
**Fichier:** `src/components/TerminerAttributionModal.tsx`

Modal pour terminer une attribution active :
- Sélection de la date de fin
- Validation (date de fin après date de début)

### 3. AttributionModal (modifié)
**Fichier:** `src/components/AttributionModal.tsx`

Nouveau workflow en 3 étapes :
- **Étape 1** : Choix du type de locataire (3 cartes)
- **Étape 2** : Sélection du locataire selon le type
- **Étape 3** : Détails (dates de début et fin, notes)

### 4. LocatairesExternesManager
**Fichier:** `src/components/LocatairesExternesManager.tsx`

Page complète de gestion du carnet d'adresses :
- Liste paginée avec recherche
- Filtres par type et statut
- Création et modification
- Historique des modifications
- Liste des véhicules attribués
- Activation/désactivation

### 5. Menu et routing
**Fichiers modifiés:**
- `src/components/Sidebar.tsx` : Ajout de l'entrée menu
- `src/components/Dashboard.tsx` : Ajout de la route

## 🎨 Caractéristiques principales

### Carnet d'adresses réutilisable
- Recherche rapide par nom
- Création simple de nouveaux contacts
- Réutilisation facile pour de nouvelles attributions
- Gestion centralisée des coordonnées

### Historique automatique
- Chaque modification est enregistrée automatiquement (trigger SQL)
- Consultation facile de l'historique complet
- Traçabilité totale des changements

### Trois types de locataires

**1. Salarié TCA** (icône Users - bleu)
- Attribut existant (profil_id)
- Choix Principal/Secondaire
- Sélection du loueur possible
- Affiche : nom, prénom, matricule

**2. Personne externe** (icône User - vert)
- Nouvelle table locataire_externe
- Pas de type d'attribution
- Affiche : nom, téléphone, email, adresse
- Bouton pour voir l'historique

**3. Entreprise externe** (icône Building - violet)
- Nouvelle table locataire_externe
- Pas de type d'attribution
- Affiche : raison sociale, téléphone, email, adresse
- Bouton pour voir l'historique

### Dates de location
- **Date de début** : Obligatoire
- **Date de fin** : Optionnelle pour locations temporaires
- Possibilité de terminer une attribution en cours

## 📁 Structure de la base de données

### Table locataire_externe
```sql
- id (uuid)
- type ('personne' | 'entreprise')
- nom (text, obligatoire)
- telephone (text, optionnel)
- email (text, optionnel)
- adresse (text, optionnel)
- notes (text, optionnel)
- actif (boolean, défaut true)
- created_at, updated_at (timestamptz)
```

### Table locataire_externe_history
```sql
- id (uuid)
- locataire_externe_id (uuid)
- type, nom, telephone, email, adresse, notes
- changed_by_user_id (uuid)
- changed_at (timestamptz)
```

### Table attribution_vehicule (modifiée)
```sql
- profil_id (uuid, nullable)
- locataire_externe_id (uuid, nullable, nouveau)
- date_fin (date, nouveau, optionnel)
- Contrainte: soit profil_id soit locataire_externe_id doit être renseigné
```

## 🔄 Workflow d'utilisation

### Créer une attribution

1. Ouvrir le détail d'un véhicule
2. Cliquer sur "Nouvelle attribution"
3. **Étape 1** : Choisir le type de locataire (cliquer sur une carte)
4. **Étape 2** : Sélectionner ou créer le locataire
   - Pour salarié : rechercher et sélectionner, choisir loueur et type
   - Pour externe : rechercher dans le carnet ou créer nouveau
5. **Étape 3** : Renseigner les dates et notes
   - Date de début (obligatoire)
   - Date de fin (optionnelle)
   - Notes (optionnelles)
6. Confirmer

### Terminer une attribution

1. Dans le détail du véhicule, onglet "Attributions actuelles"
2. Cliquer sur le bouton "Terminer" de l'attribution
3. Sélectionner la date de fin
4. Confirmer

### Gérer le carnet d'adresses

1. Menu **Parc** > **Locataires externes**
2. Rechercher, filtrer, ou créer un nouveau locataire
3. Sélectionner pour voir les détails :
   - Modifier les coordonnées
   - Voir l'historique des modifications
   - Voir les véhicules attribués (actifs et passés)
   - Activer/désactiver

## ⚠️ Points importants

### Sécurité
- Toutes les tables ont RLS activé
- Seuls les utilisateurs authentifiés peuvent accéder aux données
- L'historique est créé automatiquement (pas de manipulation manuelle)

### Données
- Les locataires externes peuvent être désactivés mais pas supprimés
- L'historique est conservé indéfiniment
- Les attributions terminées restent visibles dans l'historique

### Performance
- Index sur les colonnes de recherche
- Pagination sur la liste des locataires (20 par page)
- Vue optimisée v_vehicles_list

## 🔧 Prochaines étapes recommandées

### Modifications restantes (optionnelles)

**VehicleDetailModal** : Vous pouvez améliorer l'affichage des attributions pour :
- Afficher des icônes différentes selon le type
- Badges de couleur par type
- Bouton "Voir historique" pour les locataires externes
- Meilleur visuel pour les attributions terminées

Le fichier `GUIDE-INTEGRATION-LOCATAIRES-EXTERNES.md` contient des exemples de code pour ces améliorations.

### Exports CSV
Adapter l'export des véhicules pour inclure :
- Type de locataire
- Informations du locataire selon le type

## ✅ Checklist de vérification

Après avoir exécuté la migration SQL :

- [ ] Menu "Locataires externes" visible dans Parc
- [ ] Page Locataires externes accessible
- [ ] Création d'un locataire personne fonctionne
- [ ] Création d'un locataire entreprise fonctionne
- [ ] Attribution à un salarié TCA fonctionne
- [ ] Attribution à une personne externe fonctionne
- [ ] Attribution à une entreprise externe fonctionne
- [ ] Recherche dans le carnet d'adresses fonctionne
- [ ] Historique visible après modification
- [ ] Terminer une attribution fonctionne
- [ ] Date de fin optionnelle à la création fonctionne

## 📚 Documentation technique

### Fichiers créés
```
src/components/
├── LocataireExterneSelector.tsx       (nouveau)
├── TerminerAttributionModal.tsx       (nouveau)
├── LocatairesExternesManager.tsx     (nouveau)
├── AttributionModal.tsx              (modifié)
├── Sidebar.tsx                       (modifié)
└── Dashboard.tsx                     (modifié)
```

### Fichiers SQL
```
EXECUTER-MAINTENANT-locataires-externes.sql
```

### Documentation
```
GUIDE-INTEGRATION-LOCATAIRES-EXTERNES.md
IMPLEMENTATION-LOCATAIRES-EXTERNES-COMPLETE.md (ce fichier)
```

## 🆘 Support et dépannage

### Problème : Le menu n'apparaît pas
- Vérifier que la migration SQL a été exécutée
- Rafraîchir la page (Ctrl+F5)
- Vérifier la console pour les erreurs

### Problème : Erreur lors de la création d'attribution
- Vérifier que la migration SQL a été exécutée complètement
- Vérifier les contraintes CHECK dans attribution_vehicule
- Consulter les logs dans la console

### Problème : L'historique ne se crée pas
- Vérifier que le trigger a été créé correctement
- Exécuter : `SELECT * FROM pg_trigger WHERE tgname LIKE '%locataire_externe%';`

## 🎉 Conclusion

Le système de locataires externes est maintenant opérationnel ! Il offre une solution complète pour gérer :
- Les attributions de véhicules à des tiers
- Un carnet d'adresses réutilisable
- Un historique complet et automatique
- Une interface intuitive et cohérente

Pour toute question ou amélioration, référez-vous aux fichiers de documentation créés.
