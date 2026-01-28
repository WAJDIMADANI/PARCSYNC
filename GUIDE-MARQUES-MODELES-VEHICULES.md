# Guide Marques et Modèles de Véhicules

## Vue d'ensemble

Le formulaire de création de véhicules utilise maintenant des dropdowns searchable pour les marques et modèles, avec une option "Autre..." pour saisir manuellement des valeurs personnalisées.

## Mise en place

### 1. Exécuter la migration SQL

Exécutez le fichier SQL suivant pour créer les tables et les données initiales:

```bash
# Dans Supabase SQL Editor ou via psql
\i create-vehicule-marque-modele-tables.sql
```

Cette migration va:
- Créer la table `vehicule_marque` (liste des marques)
- Créer la table `vehicule_modele` (liste des modèles par marque)
- Ajouter 20 marques populaires (Peugeot, Renault, Citroën, etc.)
- Ajouter des modèles pour les principales marques
- Configurer les politiques RLS pour permettre la lecture et l'insertion

### 2. Données incluses

**Marques pré-remplies:**
- Peugeot (208, 308, 2008, 3008, 5008, 508, Partner, Expert, Boxer)
- Renault (Clio, Captur, Mégane, Kadjar, Scenic, Espace, Kangoo, Trafic, Master, Twingo, Zoe)
- Citroën (C3, C4, C5, C3 Aircross, C5 Aircross, Berlingo, Jumpy, Jumper, SpaceTourer)
- Volkswagen (Polo, Golf, Passat, T-Roc, Tiguan, Touareg, Caddy, Transporter, Crafter)
- Mercedes-Benz (Classe A, C, E, GLA, GLC, GLE, Vito, Sprinter)
- Ford (Fiesta, Focus, Kuga, Puma, Transit, Transit Custom, Ranger)
- Dacia (Sandero, Duster, Jogger, Logan, Spring)
- Et 13 autres marques (BMW, Audi, Opel, Fiat, Toyota, Nissan, Hyundai, Kia, Seat, Skoda, Volvo, Mazda, Honda)

## Utilisation dans le formulaire

### Étape 1: Sélectionner une marque

1. **Recherche:** Tapez dans le champ de recherche pour filtrer les marques
2. **Sélection:** Cliquez sur une marque dans la liste (size=8 lignes visibles)
3. **Option "Autre...":** En bas de la liste pour saisir une marque personnalisée

**Quand "Autre..." est sélectionné:**
- Un champ texte apparaît pour saisir manuellement la marque
- Un lien "← Revenir à la liste" permet de retourner au dropdown

### Étape 2: Sélectionner un modèle

Une fois la marque sélectionnée:

1. **Chargement automatique:** Les modèles de la marque se chargent automatiquement
2. **Recherche:** Tapez dans le champ de recherche pour filtrer les modèles
3. **Sélection:** Cliquez sur un modèle dans la liste
4. **Option "Autre...":** Pour saisir un modèle personnalisé

**Quand "Autre..." est sélectionné:**
- Un champ texte apparaît pour saisir manuellement le modèle
- Un lien "← Revenir à la liste" permet de retourner au dropdown

### Cas spéciaux

**Si marque personnalisée ("Autre..."):**
- Le champ modèle affiche: "Saisir d'abord la marque"
- Il est désactivé tant que la marque n'est pas saisie
- Une fois la marque saisie, le champ modèle devient un input texte libre

**Si aucune marque sélectionnée:**
- Le champ modèle affiche: "Sélectionner d'abord une marque"
- Il reste désactivé

## Ordre des champs (Étape 1)

Les champs sont maintenant organisés dans cet ordre:
1. Immatriculation (obligatoire)
2. Marque (obligatoire, dropdown searchable)
3. Modèle (obligatoire, dropdown searchable dépendant de la marque)
4. Type (VL, VUL, PL, TC)
5. Année
6. Statut (actif, maintenance, hors service, en location)

## Validation

La validation de l'étape 1 requiert:
- Immatriculation remplie
- Marque remplie (soit depuis le dropdown, soit saisie manuellement)
- Modèle rempli (soit depuis le dropdown, soit saisi manuellement)

## Enregistrement en base de données

Lors de la création du véhicule:
- `vehicule.marque` = nom de la marque (texte)
- `vehicule.modele` = nom du modèle (texte)

Les noms sont enregistrés (pas les IDs) pour rester compatible avec le reste du code existant.

## Ajouter de nouvelles marques/modèles

### Via SQL

```sql
-- Ajouter une nouvelle marque
INSERT INTO vehicule_marque (nom) VALUES ('Tesla');

-- Récupérer l'ID de la marque
SELECT id FROM vehicule_marque WHERE nom = 'Tesla';

-- Ajouter des modèles pour cette marque
INSERT INTO vehicule_modele (marque_id, nom) VALUES
  ('uuid-de-tesla', 'Model 3'),
  ('uuid-de-tesla', 'Model Y'),
  ('uuid-de-tesla', 'Model S'),
  ('uuid-de-tesla', 'Model X');
```

### Via l'interface (future fonctionnalité)

Une interface d'administration pourrait être ajoutée pour gérer les marques et modèles sans SQL.

## Structure des tables

### vehicule_marque
```sql
CREATE TABLE vehicule_marque (
  id uuid PRIMARY KEY,
  nom text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
```

### vehicule_modele
```sql
CREATE TABLE vehicule_modele (
  id uuid PRIMARY KEY,
  marque_id uuid REFERENCES vehicule_marque(id),
  nom text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(marque_id, nom)
);
```

## Avantages de cette approche

1. **Cohérence:** Liste standardisée des marques et modèles
2. **Recherche:** Filtrage rapide avec le champ de recherche
3. **Flexibilité:** Option "Autre..." pour les cas non couverts
4. **UX améliorée:** Pas besoin de taper, juste sélectionner
5. **Évolutif:** Facile d'ajouter de nouvelles marques/modèles
6. **Compatible:** Les noms sont enregistrés en texte (compatible avec l'existant)

## Dépannage

**Les marques ne s'affichent pas:**
- Vérifier que la migration a été exécutée
- Vérifier les politiques RLS (doivent permettre SELECT aux utilisateurs authentifiés)

**Les modèles ne se chargent pas:**
- Vérifier la console pour les erreurs
- Vérifier que la marque sélectionnée existe dans `vehicule_marque`
- Vérifier que des modèles existent pour cette marque dans `vehicule_modele`

**Erreur lors de la sauvegarde:**
- Vérifier que marque et modèle sont bien remplis
- Vérifier les logs de la console navigateur
