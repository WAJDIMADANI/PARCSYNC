# EXÉCUTER MAINTENANT - Migration acquisition véhicule

## Étape unique

Allez dans votre console Supabase SQL Editor et exécutez le contenu du fichier:

**`add-vehicule-acquisition-fields.sql`**

C'est tout ! Une fois exécuté, vous pourrez :

1. Ajouter un nouveau véhicule avec toutes les infos d'acquisition (fournisseur, mode d'acquisition, prix, mensualité, dates de contrat)
2. Voir et modifier ces infos dans le modal de détail de chaque véhicule

## Vérification rapide

Après exécution, vérifiez que les colonnes ont bien été ajoutées :

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicule'
AND column_name IN (
  'fournisseur',
  'mode_acquisition',
  'prix_ht',
  'prix_ttc',
  'mensualite',
  'duree_contrat_mois',
  'date_debut_contrat',
  'date_fin_prevue_contrat'
);
```

Vous devriez voir 8 lignes retournées.
