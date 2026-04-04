# Guide - Afficher tous les onglets dans la sidebar

## Problème
Certains onglets ne s'affichent pas dans la sidebar car les permissions correspondantes n'existent pas dans la base de données.

## Solution en 1 étape

### Exécuter le script SQL

Exécutez le fichier `AJOUTER-TOUTES-PERMISSIONS-MANQUANTES.sql` dans l'éditeur SQL de Supabase.

Ce script ajoute automatiquement toutes les permissions manquantes pour TOUS les utilisateurs actifs :

**Permissions RH ajoutées :**
- `rh/courriers-generes` - Courriers Générés
- `rh/documents-manquants` - Documents Manquants

**Permissions Parc ajoutées :**
- `parc/locations` - Locations
- `parc/etats-des-lieux` - États des lieux

**Permissions Exports ajoutées :**
- `exports/rh` - Exports RH
- `exports/parc` - Exports Parc

**Permissions Administration ajoutées :**
- `admin/generer-courrier` - Générer Courrier
- `admin/generer-courrier-v2` - Générer Courrier V2
- `admin/modeles-courriers-v2` - Modèles Courriers V2
- `admin/import-salarie` - Import Salarié Test
- `admin/import-bulk` - Import en Masse
- `admin/demandes-externes` - Demandes Externes
- `admin/import-vehicle-references` - Import Références Véhicules

## Après l'exécution

1. **Rechargez la page** dans votre navigateur (F5 ou Ctrl+R)
2. Tous les nouveaux onglets devraient maintenant être visibles dans la sidebar

## Comment gérer les permissions à l'avenir

Allez dans **Administration > Utilisateurs** pour :
- Activer/désactiver les permissions pour chaque utilisateur
- Toutes les permissions sont maintenant disponibles dans l'interface

## Vérification

Pour vérifier vos permissions actuelles, exécutez cette requête :

```sql
SELECT
  au.email,
  au.nom,
  au.prenom,
  array_agg(up.section_id ORDER BY up.section_id) as permissions
FROM app_utilisateur au
LEFT JOIN utilisateur_permission up ON au.id = up.utilisateur_id AND up.actif = true
WHERE au.email = 'VOTRE_EMAIL@exemple.com'
GROUP BY au.id, au.email, au.nom, au.prenom;
```

Remplacez `VOTRE_EMAIL@exemple.com` par votre email de connexion.
