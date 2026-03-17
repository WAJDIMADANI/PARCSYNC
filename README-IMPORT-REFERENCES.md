# Import massif de références véhicules - Démarrage rapide

## En bref

Système d'import automatique des marques et modèles de véhicules depuis l'API NHTSA vPIC.

## Déploiement rapide

### 1. Base de données (2 min)

```sql
-- Exécuter dans Supabase SQL Editor
-- Copier/coller le contenu de: add-source-columns-vehicle-references.sql
```

### 2. Edge Function (1 min)

Demander à l'assistant :
```
Déploie l'edge function import-vehicle-references avec verify_jwt à true
```

### 3. Permission (1 min)

```sql
-- Remplacer UUID_ADMIN par votre UUID
INSERT INTO public.user_permissions (user_id, permission)
VALUES ('UUID_ADMIN', 'manage_vehicle_references');
```

### 4. Build (1 min)

```bash
npm run build
```

## Utilisation

1. Se connecter en admin
2. Menu **Administration** > **Import Références Véhicules**
3. Cliquer sur **Lancer l'import depuis NHTSA**
4. Attendre 2-5 minutes
5. Vérifier les résultats

## Résultat attendu

- ~50 marques importées
- ~1000-2000 modèles importés
- Données automatiquement disponibles dans le modal "Nouveau véhicule"

## Vérification

```sql
-- Compter les données importées
SELECT source, COUNT(*) FROM vehicle_reference_brands GROUP BY source;
SELECT source, COUNT(*) FROM vehicle_reference_models GROUP BY source;
```

## Fichiers importants

| Fichier | Usage |
|---------|-------|
| `add-source-columns-vehicle-references.sql` | Migration SQL à exécuter |
| `supabase/functions/import-vehicle-references/index.ts` | Edge Function à déployer |
| `src/components/ImportVehicleReferences.tsx` | Interface admin (déjà intégré) |

## Documentation complète

- **GUIDE-IMPORT-MASSIF-REFERENCES-VEHICULES.md** : Documentation technique complète
- **DEPLOIEMENT-IMPORT-REFERENCES.md** : Guide de déploiement détaillé
- **IMPORT-MASSIF-LIVRABLES.md** : Liste des livrables et checklist

## Troubleshooting rapide

### L'import ne démarre pas
```sql
-- Vérifier la permission
SELECT * FROM user_permissions
WHERE permission = 'manage_vehicle_references';
```

### Aucune donnée importée
```sql
-- Vérifier si déjà importé
SELECT COUNT(*) FROM vehicle_reference_brands WHERE source = 'nhtsa';
```

Les doublons sont automatiquement ignorés. C'est normal si le compteur est à 0.

### Erreur CORS
Vérifier que l'Edge Function est bien déployée avec `verify_jwt: true`

## Support

Consulter les guides complets listés ci-dessus pour plus de détails.

---

**Version** : 1.0
**Status** : ✅ Production ready
