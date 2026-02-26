# Historique des attributions - Activé

## Modifications effectuées

### 1. Suppression du champ "Loueur"
- ✅ Champ "Loueur" supprimé du formulaire d'attribution (étape 2)
- ✅ Affichage "Loueur" supprimé du résumé
- Le système n'utilise plus le concept de "loueur" pour les attributions de salariés TCA

### 2. Bouton "Historique" ajouté
- ✅ Nouveau composant `AttributionHistoryModal.tsx` créé
- ✅ Bouton "Historique" ajouté dans l'onglet "Attributions" du modal véhicule
- ✅ Import et intégration dans `VehicleDetailModal.tsx`

## Comment accéder à l'historique

1. Ouvrir un véhicule (cliquer sur une ligne dans la liste des véhicules)
2. Aller sur l'onglet "Attributions" (icône User)
3. Cliquer sur le bouton gris "Historique" en haut à droite
4. Une fenêtre s'ouvre avec toutes les attributions passées et actuelles

## Fonctionnalités de l'historique

### Affichage des données
- Liste de toutes les attributions (actives et terminées)
- Tri par date (plus récent en premier)
- Badge "En cours" sur les attributions actives (fond vert)
- Dates de début et de fin pour chaque attribution

### Types d'attribution affichés
1. **Attribution principale** (badge bleu) - Salarié TCA chauffeur principal
2. **Attribution secondaire** (badge violet) - Salarié TCA chauffeur secondaire
3. **Personne externe** (badge orange) - Locataire personne physique
4. **Entreprise externe** (badge teal) - Locataire entreprise

### Informations affichées
- Pour les salariés TCA:
  - Nom, prénom
  - Matricule TCA
  - Type d'attribution (principal/secondaire)

- Pour les locataires externes:
  - Nom du locataire
  - Contact (si renseigné)
  - Téléphone (si renseigné)
  - SIRET pour les entreprises (si renseigné)

- Pour tous:
  - Date de début d'attribution
  - Date de fin (ou "En cours" si toujours actif)
  - Notes éventuelles

## Vérification

Pour vérifier que tout fonctionne:

```sql
-- Voir toutes les attributions d'un véhicule spécifique
SELECT
  av.id,
  av.date_debut,
  av.date_fin,
  av.type_attribution,
  av.notes,
  p.nom || ' ' || p.prenom as chauffeur,
  p.matricule_tca,
  l.nom as locataire_externe
FROM attribution_vehicule av
LEFT JOIN profil p ON p.id = av.profil_id
LEFT JOIN locataire_externe l ON l.id = av.loueur_id
WHERE av.vehicule_id = 'ID_VEHICULE'
ORDER BY av.date_debut DESC;
```

## Interface utilisateur

L'historique apparaît dans une fenêtre modale avec:
- En-tête gris foncé avec icône "History"
- Liste scrollable avec toutes les attributions
- Cartes individuelles pour chaque attribution
- Code couleur selon le type
- Badge "En cours" en vert pour les attributions actives
- Bouton "Fermer" en bas

## Rechargement nécessaire

⚠️ **Important**: Il faut recharger la page pour voir le bouton "Historique" apparaître.

Les modifications sont:
- ✅ Compilées avec succès
- ✅ Intégrées dans le code
- ✅ Prêtes à l'emploi

Faites un **refresh** de la page (F5 ou Ctrl+R) et le bouton "Historique" sera visible!
