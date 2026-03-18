# Import Massif des Marques et Modèles de Véhicules

Script one-shot pour remplir massivement les tables `vehicle_reference_brands` et `vehicle_reference_models` depuis l'API NHTSA.

## Prérequis

- Node.js installé
- Variables d'environnement configurées dans `.env`
- Tables `vehicle_reference_brands` et `vehicle_reference_models` créées

## Utilisation

### 1. Lancer l'import

```bash
node scripts/import-vehicle-brands-models.mjs
```

### 2. Vérifier l'import

Exécutez le fichier SQL dans Supabase SQL Editor :

```bash
# Copier le contenu dans l'éditeur SQL de Supabase
cat scripts/verify-import.sql
```

Ou via psql si disponible :

```bash
psql $DATABASE_URL -f scripts/verify-import.sql
```

## Ce que fait le script

1. **Récupère toutes les marques** depuis l'API NHTSA (environ 10 000 marques)
2. **Insère les nouvelles marques** dans `vehicle_reference_brands`
3. **Pour chaque marque, récupère les modèles** associés
4. **Insère les nouveaux modèles** dans `vehicle_reference_models`

## Fonctionnalités

✅ **Gestion des doublons** : vérifie les `source_id` existants avant insertion
✅ **Traitement par lots** : insère par batch de 100 pour la performance
✅ **Gestion des erreurs** : continue même si certaines requêtes échouent
✅ **Rate limiting** : pause de 150ms entre chaque requête API
✅ **Logs détaillés** : progression en temps réel
✅ **Timeout** : 10s par requête, 30s pour la liste complète

## Colonnes remplies

### vehicle_reference_brands
- `name` : nom de la marque
- `source` : "nhtsa"
- `source_id` : ID NHTSA de la marque

### vehicle_reference_models
- `brand_id` : référence vers vehicle_reference_brands
- `name` : nom du modèle
- `source` : "nhtsa"
- `source_id` : ID NHTSA du modèle
- `vehicle_type` : type de véhicule (si disponible)

## Colonnes NON remplies

- `trim_level` : non géré pour l'instant
- Toute colonne custom ajoutée manuellement

## Durée estimée

- **Marques** : ~30 secondes (1 requête API)
- **Modèles** : ~25-45 minutes (10 000+ requêtes API avec rate limiting)

## En cas d'erreur

Le script affiche :
- Nombre d'erreurs rencontrées
- Liste des erreurs (si < 10)
- Continue l'import malgré les erreurs

Pour relancer :
```bash
node scripts/import-vehicle-brands-models.mjs
```

Le script détecte automatiquement ce qui est déjà inséré et ne réinsère pas les doublons.

## Vérifications post-import

Le fichier `verify-import.sql` affiche :
1. Statistiques globales
2. Détail par source
3. Top 20 marques par nombre de modèles
4. Marques sans modèles
5. Répartition par type de véhicule
6. Vérification des doublons
7. Dernières insertions

## Limitations

- Traite uniquement la source NHTSA
- Ne gère pas les finitions (trims)
- Aucune interface graphique
- Doit être lancé manuellement

## Maintenance

Le script peut être relancé à tout moment pour ajouter de nouvelles données. Il détecte automatiquement les entrées existantes.
