# Vue : Liste des incidents de documents expirés

## Vue créée

**Nom:** `v_incident_documents_expires_list`

## Description

Cette vue liste tous les incidents de documents expirés avec les informations du profil associé.

## Colonnes retournées

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | ID de l'incident |
| `type` | text | Type d'incident (ex: "Titre de séjour", "Visite médicale") |
| `statut` | text | Statut (toujours 'expire' pour cette vue) |
| `date_effective` | date | Date d'expiration effective (nouvelle_date_validite si existe, sinon date_expiration_originale) |
| `profil_id` | uuid | ID du profil associé |
| `prenom` | text | Prénom du salarié |
| `nom` | text | Nom du salarié |
| `email` | text | Email du salarié |

## Logique

- Filtre uniquement les incidents avec `statut = 'expire'`
- Utilise `COALESCE` pour la date effective : prend `nouvelle_date_validite` si renseignée, sinon `date_expiration_originale`
- Joint avec la table `profil` pour obtenir les informations du salarié

## Exécution

### Méthode 1 : Éditeur SQL Supabase (Recommandé)

1. Ouvrir le Dashboard Supabase
2. Aller dans "SQL Editor"
3. Copier le contenu du fichier `CREATE-VUE-INCIDENTS-EXPIRES.sql`
4. Exécuter

### Méthode 2 : Ligne de commande

```bash
psql $DATABASE_URL -f CREATE-VUE-INCIDENTS-EXPIRES.sql
```

## Utilisation

### Exemple de requête

```sql
-- Lister tous les documents expirés
SELECT * FROM v_incident_documents_expires_list
ORDER BY date_effective DESC;

-- Compter les documents expirés par type
SELECT type, COUNT(*) as total
FROM v_incident_documents_expires_list
GROUP BY type
ORDER BY total DESC;

-- Documents expirés pour un salarié spécifique
SELECT *
FROM v_incident_documents_expires_list
WHERE profil_id = 'xxx-xxx-xxx'
ORDER BY date_effective DESC;
```

### Depuis l'application JavaScript/TypeScript

```typescript
import { supabase } from './lib/supabase';

// Récupérer tous les documents expirés
const { data, error } = await supabase
  .from('v_incident_documents_expires_list')
  .select('*')
  .order('date_effective', { ascending: false });

// Filtrer par type
const { data: titreSejourExpires } = await supabase
  .from('v_incident_documents_expires_list')
  .select('*')
  .eq('type', 'Titre de séjour')
  .order('date_effective', { ascending: false });
```

## Permissions RLS

La vue hérite automatiquement des permissions RLS de la table `incident` et `profil`.

## Fichier SQL

Le code SQL se trouve dans : `CREATE-VUE-INCIDENTS-EXPIRES.sql`
