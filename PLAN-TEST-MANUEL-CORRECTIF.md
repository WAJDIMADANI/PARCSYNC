# Plan de Test Manuel : Correctif finition/energie/couleur

## 🎯 Objectifs du test

Valider que le correctif NIVEAU 2 fonctionne correctement et que :
1. Les champs finition/energie/couleur s'affichent en mode "Voir"
2. Les champs sont pré-remplis en mode "Modifier"
3. Le calcul de locataire_affiche est identique à la liste
4. Tous les autres champs se chargent correctement

---

## ⚙️ Prérequis

- [ ] Frontend NIVEAU 2 déployé (VehicleDetailModal.tsx modifié)
- [ ] Un véhicule dans la base avec :
  - finition renseignée (ex: "Premium")
  - energie renseignée (ex: "Diesel")
  - couleur renseignée (ex: "Blanc")
  - Un chauffeur attribué (attribution principale active)

---

## 📋 Scénario 1 : Affichage mode "Voir"

### Objectif
Vérifier que tous les champs se chargent depuis la table `vehicule`

### Étapes
1. Ouvrir la page "Véhicules"
2. Cliquer sur un véhicule qui a finition/energie/couleur renseignées
3. Le modal s'ouvre en mode "Voir" (par défaut)

### Vérifications

#### ✅ Onglet "Informations"

**Champs visibles et remplis** :
- [ ] Finition : "Premium" (ou la valeur en base)
- [ ] Énergie : "Diesel" (ou la valeur en base)
- [ ] Couleur : "Blanc" (ou la valeur en base)
- [ ] Marque, Modèle, Année affichés
- [ ] Kilométrage actuel affiché

**Vérification console** :
```
[fetchVehicleDetails] Début refetch pour vehicule ID: xxx
[fetchVehicleDetails] Données reçues: { finition: "Premium", energie: "Diesel", couleur: "Blanc", ... }
[fetchVehicleDetails] État mis à jour avec succès
```

#### ✅ Onglet "Acquisition"

**Champs visibles et remplis** :
- [ ] Fournisseur affiché
- [ ] Mode d'acquisition affiché
- [ ] Prix HT / TTC affichés
- [ ] Financeur (nom, adresse, téléphone) affichés si renseignés

#### ✅ Onglet "Assurance"

**Champs visibles et remplis** :
- [ ] Type assurance (TCA / Externe)
- [ ] Compagnie d'assurance
- [ ] Numéro de contrat
- [ ] Licence de transport

#### ✅ Onglet "Carte essence"

**Champs visibles et remplis** :
- [ ] Carte attribuée (oui/non)
- [ ] Fournisseur carte essence
- [ ] Numéro carte essence

---

## 📋 Scénario 2 : Mode "Modifier"

### Objectif
Vérifier que tous les champs sont pré-remplis correctement

### Étapes
1. Ouvrir un véhicule (mode "Voir")
2. Cliquer sur "Modifier" (bouton en haut à droite)
3. Vérifier les champs de formulaire

### Vérifications

#### ✅ Onglet "Informations"

**Formulaire pré-rempli** :
- [ ] Champ "Finition" contient "Premium"
- [ ] Select "Énergie" a "Diesel" sélectionné
- [ ] Champ "Couleur" contient "Blanc"
- [ ] Champ "Marque" pré-rempli
- [ ] Champ "Modèle" pré-rempli
- [ ] Champ "Année" pré-rempli
- [ ] Champ "Kilométrage actuel" pré-rempli

**Test de modification** :
1. Modifier "Finition" → "Sport"
2. Modifier "Énergie" → "Essence"
3. Modifier "Couleur" → "Noir"
4. Cliquer "Enregistrer"

**Résultat attendu** :
- [ ] Message de succès affiché
- [ ] Retour en mode "Voir"
- [ ] Nouvelles valeurs affichées : "Sport", "Essence", "Noir"

**Test de rechargement** :
1. Fermer le modal
2. Réouvrir le même véhicule
3. Vérifier que les nouvelles valeurs sont présentes

#### ✅ Onglet "Acquisition"

**Formulaire pré-rempli** :
- [ ] Champ "Fournisseur" pré-rempli
- [ ] Select "Mode acquisition" pré-sélectionné
- [ ] Champs financeur pré-remplis

**Test de modification** :
1. Modifier "Fournisseur" → "Nouveau Fournisseur"
2. Enregistrer
3. Vérifier que la valeur est sauvegardée

#### ✅ Onglet "Assurance"

**Formulaire pré-rempli** :
- [ ] Radio "Type assurance" pré-sélectionné
- [ ] Champs compagnie/contrat pré-remplis

**Test de modification** :
1. Changer type assurance (TCA ↔ Externe)
2. Modifier compagnie
3. Enregistrer
4. Vérifier sauvegarde

#### ✅ Onglet "Carte essence"

**Formulaire pré-rempli** :
- [ ] Checkbox "Carte attribuée" cochée/décochée
- [ ] Champs fournisseur/numéro pré-remplis

**Test de modification** :
1. Cocher/décocher "Carte attribuée"
2. Modifier fournisseur
3. Enregistrer
4. Vérifier sauvegarde

---

## 📋 Scénario 3 : Cohérence avec la liste

### Objectif
Vérifier que `locataire_affiche` est identique entre liste et détail

### Étapes

**Cas 1 : Véhicule avec 1 attribution principale**
1. Dans la liste : noter le "Locataire" affiché
2. Ouvrir le modal : vérifier que le locataire affiché est identique
3. Résultat attendu : **Identique** (ex: "Dupont Jean")

**Cas 2 : Véhicule avec 2 attributions principales (historique)**
1. Créer 2 attributions principales :
   - Attribution 1 : date_debut = 2024-01-01, date_fin = 2024-06-30, profil = "Martin Paul"
   - Attribution 2 : date_debut = 2024-07-01, date_fin = NULL, profil = "Dubois Marc"
2. Dans la liste : noter le locataire (doit être "Dubois Marc" = plus récent)
3. Ouvrir le modal : vérifier locataire_affiche
4. Résultat attendu : **"Dubois Marc"** (attribution la plus récente)

**Cas 3 : Véhicule sans attribution**
1. Véhicule type = "salarie", mais aucune attribution active
2. Liste : doit afficher "Non attribué"
3. Modal : doit afficher "Non attribué"
4. Résultat attendu : **Identique**

**Cas 4 : Véhicule locataire externe**
1. Véhicule type = "personne_externe" avec loueur attribué
2. Liste : affiche le nom du loueur
3. Modal : affiche le nom du loueur
4. Résultat attendu : **Identique**

---

## 📋 Scénario 4 : Chauffeurs actifs

### Objectif
Vérifier que la liste des chauffeurs actifs est correcte

### Étapes

**Cas 1 : Véhicule avec 1 principal + 1 secondaire**
1. Créer 2 attributions actives :
   - Attribution principale : "Dupont Jean"
   - Attribution secondaire : "Martin Paul"
2. Ouvrir le modal → Onglet "Attribution"
3. Vérifier la liste des chauffeurs

**Résultat attendu** :
```
🔵 Dupont Jean (Principal) - depuis 01/01/2024
🟢 Martin Paul (Secondaire) - depuis 15/06/2024
```

**Ordre** :
- [ ] Principal en premier
- [ ] Secondaire en second

**Cas 2 : Véhicule avec 3 chauffeurs (1P + 2S)**
1. Créer 3 attributions
2. Vérifier l'ordre d'affichage

**Résultat attendu** :
- [ ] Principal toujours en premier
- [ ] Secondaires triés par type_attribution

---

## 📋 Scénario 5 : Test d'annulation

### Objectif
Vérifier que l'annulation restaure les valeurs initiales

### Étapes
1. Ouvrir un véhicule en mode "Voir"
2. Cliquer "Modifier"
3. Modifier "Finition" → "Test"
4. Modifier "Couleur" → "Test"
5. Cliquer "Annuler" (bouton X ou Annuler)

**Résultat attendu** :
- [ ] Retour en mode "Voir"
- [ ] Valeurs initiales restaurées (pas "Test")

---

## 📋 Scénario 6 : Test multi-onglets

### Objectif
Vérifier que changer d'onglet en mode édition ne perd pas les données

### Étapes
1. Ouvrir un véhicule, cliquer "Modifier"
2. Aller onglet "Informations", modifier "Finition"
3. Aller onglet "Acquisition", modifier "Fournisseur"
4. Aller onglet "Assurance", modifier "Compagnie"
5. Retourner onglet "Informations"
6. Cliquer "Enregistrer"

**Résultat attendu** :
- [ ] Les 3 modifications sont sauvegardées
- [ ] Aucune perte de données entre onglets

---

## 📋 Scénario 7 : Test de rechargement après sauvegarde

### Objectif
Vérifier que `fetchVehicleDetails()` recharge bien depuis la table

### Étapes
1. Ouvrir un véhicule, cliquer "Modifier"
2. Modifier "Finition" → "Ultimate"
3. Enregistrer
4. Vérifier console

**Console attendue** :
```
[fetchVehicleDetails] Début refetch pour vehicule ID: xxx
[fetchVehicleDetails] Données reçues: { finition: "Ultimate", ... }
[fetchVehicleDetails] État mis à jour avec succès
```

**Résultat attendu** :
- [ ] fetchVehicleDetails appelé après sauvegarde
- [ ] Données rechargées depuis la table `vehicule`
- [ ] Affichage mis à jour avec "Ultimate"

---

## 📋 Scénario 8 : Test avec véhicule incomplet

### Objectif
Vérifier que les champs NULL ne causent pas d'erreur

### Étapes
1. Trouver un véhicule avec finition/energie/couleur = NULL
2. Ouvrir le modal

**Résultat attendu** :
- [ ] Aucune erreur console
- [ ] Champs affichés vides (pas "null" ou "undefined")
- [ ] Mode "Modifier" : champs vides mais éditables

---

## 📋 Scénario 9 : Test console (technique)

### Objectif
Vérifier que le chargement se fait bien depuis `vehicule` et pas `v_vehicles_list_ui`

### Étapes
1. Ouvrir la console navigateur (F12)
2. Aller dans l'onglet "Network"
3. Filtrer par "supabase"
4. Ouvrir un véhicule

**Requêtes attendues** :
```
POST /rest/v1/vehicule?id=eq.xxx&select=*
POST /rest/v1/attribution_vehicule?vehicule_id=eq.xxx&select=...
```

**Requêtes NON attendues** :
```
❌ POST /rest/v1/v_vehicles_list_ui
```

**Vérification** :
- [ ] Requête vers `vehicule` (table)
- [ ] Requête vers `attribution_vehicule`
- [ ] PAS de requête vers `v_vehicles_list_ui`

---

## 📋 Scénario 10 : Test de performance

### Objectif
Vérifier que le chargement est rapide

### Étapes
1. Ouvrir 10 véhicules différents successivement
2. Noter le temps de chargement de chaque modal

**Résultat attendu** :
- [ ] Ouverture modal < 500ms
- [ ] Aucun lag visible
- [ ] Aucune erreur console

---

## ❌ Tests de régression (non-régression)

### Objectif
Vérifier qu'on n'a pas cassé d'autres fonctionnalités

### Tests à faire
- [ ] Attribution d'un véhicule fonctionne toujours
- [ ] Historique d'attribution s'affiche toujours
- [ ] Mise à jour kilométrage fonctionne
- [ ] Upload de documents véhicule fonctionne
- [ ] Historique statut véhicule s'affiche
- [ ] Création de nouveau véhicule fonctionne
- [ ] Liste des véhicules s'affiche correctement
- [ ] Filtres de la liste fonctionnent

---

## 🐛 Bugs potentiels à surveiller

### 1. Champ affiché "undefined"
**Symptôme** : Champ affiche le texte "undefined"
**Cause** : Mauvaise gestion de la valeur NULL
**Fix** : Utiliser `value={editedVehicle.finition || ''}`

### 2. Locataire_affiche différent entre liste et détail
**Symptôme** : Liste affiche "Dupont Jean", détail affiche "Martin Paul"
**Cause** : Tri des attributions principales pas identique
**Fix** : Vérifier le tri par date_debut DESC

### 3. Erreur console "Cannot read property of null"
**Symptôme** : Erreur JS quand on ouvre un véhicule
**Cause** : Profil ou loueur NULL dans attribution
**Fix** : Vérifier les `?.` (optional chaining)

### 4. Formulaire pas pré-rempli en mode Modifier
**Symptôme** : Tous les champs sont vides en mode édition
**Cause** : `editedVehicle` pas initialisé depuis `vehicle`
**Fix** : Vérifier `setEditedVehicle(initialVehicle)` ligne 81

### 5. Sauvegarde ne persiste pas
**Symptôme** : Après enregistrement, rechargement affiche anciennes valeurs
**Cause** : UPDATE échoue silencieusement
**Fix** : Vérifier erreur SQL dans console

---

## ✅ Checklist finale

Avant de valider le correctif en production :

- [ ] Scénario 1 : Mode "Voir" fonctionne (tous onglets)
- [ ] Scénario 2 : Mode "Modifier" fonctionne (tous onglets)
- [ ] Scénario 3 : Cohérence locataire_affiche (liste = détail)
- [ ] Scénario 4 : Chauffeurs actifs triés correctement
- [ ] Scénario 5 : Annulation restaure valeurs
- [ ] Scénario 6 : Multi-onglets en édition OK
- [ ] Scénario 7 : Rechargement après sauvegarde OK
- [ ] Scénario 8 : Véhicule incomplet (NULL) OK
- [ ] Scénario 9 : Console technique (pas de vue)
- [ ] Scénario 10 : Performance acceptable
- [ ] Tests de régression : pas de casse

---

## 📊 Rapport de test

À remplir après les tests :

| Scénario | Statut | Commentaire |
|----------|--------|-------------|
| 1. Mode Voir | ⬜ | |
| 2. Mode Modifier | ⬜ | |
| 3. Cohérence liste/détail | ⬜ | |
| 4. Chauffeurs actifs | ⬜ | |
| 5. Annulation | ⬜ | |
| 6. Multi-onglets | ⬜ | |
| 7. Rechargement | ⬜ | |
| 8. Véhicule incomplet | ⬜ | |
| 9. Console technique | ⬜ | |
| 10. Performance | ⬜ | |
| Régression | ⬜ | |

Légende : ✅ Passé | ❌ Échoué | ⚠️ Partiel | ⬜ Non testé

---

## 🎯 Validation finale

Le correctif est validé si :
- ✅ Tous les scénarios 1-10 sont PASSÉS
- ✅ Tests de régression OK
- ✅ Aucun bug bloquant détecté
- ✅ Performance acceptable (< 500ms)
