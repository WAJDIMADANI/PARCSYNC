# Modifications Assurance TCA - Matériel embarqué - Carte essence

## ✅ Modifications appliquées

### 1. Section Assuré TCA
Les champs sont maintenant visibles et éditables pour tous les types d'assurance :
- **Type d'assurance** : Radio buttons (Assuré TCA / Assuré ailleurs) - ÉDITABLE
- **Compagnie d'assurance** : Champ texte - ÉDITABLE
- **Numéro de contrat** : Champ texte - ÉDITABLE
- **Licence de transport** : Champ texte - ÉDITABLE
- **Date de 1ère mise en circulation** : Champ date - ÉDITABLE

**Bouton Modifier** : Disponible dans l'onglet "Assurance" pour activer l'édition

### 2. Section Matériel embarqué
Affichage simplifié sans design élaboré :
- Icône voiture à côté du titre
- Champs directs : Type | Quantité
- Format grille 2 colonnes
- Pas de cartes ni bordures complexes

### 3. Section Carte essence
Ajout du champ **Fournisseur** :
- **Fournisseur** : Ex: Total, Shell, BP, etc.
- **Numéro de carte** : Numéro de la carte essence
- **Statut** : Checkbox "Carte attribuée"

## 📋 Action requise : Migration SQL

**IMPORTANT** : Exécutez ce script SQL dans Supabase pour ajouter la colonne fournisseur :

```sql
ALTER TABLE vehicule
ADD COLUMN IF NOT EXISTS carte_essence_fournisseur text;
```

Ou exécutez le fichier : `EXECUTER-MAINTENANT-ASSURANCE-TCA.sql`

## 📁 Fichiers modifiés

1. **VehicleDetailModal.tsx**
   - Section assurance rendue éditable
   - Champs synchronisés avec `editedVehicle`
   - Bouton Modifier activé pour l'onglet Assurance
   - Mode édition se désactive au changement d'onglet
   - Affichage simplifié du matériel embarqué
   - Ajout champ fournisseur carte essence

2. **VehicleCreateModal.tsx**
   - Ajout du champ `carte_essence_fournisseur` au formulaire
   - Interface de création avec fournisseur et numéro
   - Grille 2 colonnes pour la carte essence

## 🎯 Résultat

### Mode consultation (onglet Assurance)
- Tous les champs sont affichés en lecture seule
- Bouton "Modifier" disponible

### Mode édition (onglet Assurance)
- Clic sur "Modifier"
- Tous les champs deviennent éditables
- Boutons "Annuler" et "Enregistrer" disponibles
- Sauvegarde en base avec tous les champs d'assurance

### Matériel embarqué
- Simple affichage en grille
- Icône voiture
- Champs Type et Quantité

### Carte essence
- Fournisseur (nouveau)
- Numéro de carte
- Statut d'attribution
