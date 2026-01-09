# Guide : Protection du Module Comptabilité par Permission

## Vue d'ensemble

Le module Comptabilité est désormais protégé par une permission spécifique. Seuls les utilisateurs ayant la permission `comptabilite` peuvent y accéder.

## Changements effectués

### 1. Sidebar (Menu de navigation)
- Le menu Comptabilité et tous ses onglets ne s'affichent que si l'utilisateur a la permission `comptabilite`
- Si l'utilisateur n'a pas cette permission, toute la section Comptabilité sera invisible dans le menu

### 2. AccountingDashboard (Page Comptabilité)
- Ajout d'un guard de permission au niveau du composant
- Si un utilisateur tente d'accéder directement à l'URL sans permission, il verra un message d'accès refusé
- Message clair indiquant qu'il faut contacter l'administrateur

## Installation

### Étape 1 : Activer la permission dans la base de données

Exécutez le script SQL suivant dans l'éditeur SQL de Supabase :

```bash
# Ouvrir le fichier
cat add-permission-comptabilite.sql
```

Ce script va :
1. Vérifier que le système de permissions existe
2. Ajouter automatiquement la permission `comptabilite` à tous les administrateurs existants
3. Afficher la liste des utilisateurs ayant accès à la comptabilité

### Étape 2 : Attribution manuelle de la permission

Pour donner accès au module comptabilité à un utilisateur spécifique :

```sql
-- Remplacer 'email@example.com' par l'email de l'utilisateur
INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT
  id,
  'comptabilite',
  true
FROM app_utilisateur
WHERE email = 'email@example.com'
ON CONFLICT (utilisateur_id, section_id)
DO UPDATE SET actif = true;
```

### Étape 3 : Retirer l'accès à un utilisateur

Pour retirer l'accès au module comptabilité :

```sql
-- Remplacer 'email@example.com' par l'email de l'utilisateur
UPDATE utilisateur_permissions up
SET actif = false
FROM app_utilisateur au
WHERE up.utilisateur_id = au.id
  AND au.email = 'email@example.com'
  AND up.section_id = 'comptabilite';
```

## Vérification

### Vérifier les utilisateurs ayant accès à la comptabilité

```sql
SELECT
  au.email,
  au.nom,
  au.prenom,
  up.actif,
  up.created_at
FROM utilisateur_permissions up
JOIN app_utilisateur au ON up.utilisateur_id = au.id
WHERE up.section_id = 'comptabilite'
ORDER BY au.email;
```

### Vérifier toutes les permissions d'un utilisateur

```sql
-- Remplacer 'email@example.com' par l'email de l'utilisateur
SELECT
  up.section_id as permission,
  up.actif,
  up.created_at
FROM utilisateur_permissions up
JOIN app_utilisateur au ON up.utilisateur_id = au.id
WHERE au.email = 'email@example.com'
ORDER BY up.section_id;
```

## Comportement attendu

### Avec la permission `comptabilite`
- ✅ Le menu Comptabilité est visible dans la sidebar
- ✅ Tous les onglets du module sont accessibles :
  - Entrées
  - Sorties
  - RIB
  - Adresse
  - Avenants
  - Mutuelle
  - A&R
  - Avance de frais
- ✅ Les données sont affichées et modifiables

### Sans la permission `comptabilite`
- ❌ Le menu Comptabilité est masqué dans la sidebar
- ❌ Tentative d'accès direct via URL : message "Accès refusé"
- ❌ L'utilisateur ne peut pas voir ni modifier les données

## Attribution en masse

Pour donner accès à tous les utilisateurs d'un certain type :

```sql
-- Donner accès à tous les utilisateurs ayant la permission "demandes"
INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
SELECT DISTINCT
  up.utilisateur_id,
  'comptabilite',
  true
FROM utilisateur_permissions up
WHERE up.section_id = 'demandes'
  AND up.actif = true
  AND NOT EXISTS (
    SELECT 1 FROM utilisateur_permissions up2
    WHERE up2.utilisateur_id = up.utilisateur_id
      AND up2.section_id = 'comptabilite'
  );
```

## Dépannage

### Le menu n'apparaît pas après avoir ajouté la permission
1. Vérifier que la permission a bien été ajoutée :
   ```sql
   SELECT * FROM utilisateur_permissions
   WHERE section_id = 'comptabilite';
   ```
2. Vérifier que `actif = true`
3. Se déconnecter et se reconnecter
4. Vérifier la console du navigateur pour les logs de permissions

### L'utilisateur voit "Accès refusé" alors qu'il a la permission
1. Vérifier dans la console du navigateur les permissions chargées
2. Rafraîchir les permissions via le contexte
3. Vérifier que l'email correspond exactement (majuscules/minuscules)

## Notes importantes

- La permission `comptabilite` est indépendante des autres permissions
- Les administrateurs (permission `admin`) reçoivent automatiquement cette permission lors de l'exécution du script
- Cette permission contrôle l'accès à TOUS les onglets du module comptabilité
- Les RLS policies existantes sur les tables continuent de s'appliquer normalement
