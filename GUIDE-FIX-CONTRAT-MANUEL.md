# Fix Erreur 400 - Ajout Contrat Manuel

## Problème

Lorsque vous essayez d'ajouter un contrat manuel depuis le modal, vous obtenez :
```
Failed to load resource: the server responded with a status of 400 ()
Insert error: Object { No properties }
Error uploading manual contract: Error: Erreur lors de l'enregistrement en base de données
```

## Cause

Le problème vient de la structure de la table `contrat` :
1. La colonne `modele_id` est `NOT NULL` mais les contrats manuels n'ont pas de modèle
2. Certaines colonnes nécessaires peuvent manquer
3. La contrainte CHECK sur `statut` peut bloquer certaines valeurs

## Solution (2 étapes)

### Étape 1 : Exécuter le SQL de correction

Ouvrez **Supabase SQL Editor** et exécutez le fichier :
```
FIX-CONTRAT-MANUEL-COMPLETE.sql
```

Ce script va :
- Rendre `modele_id` nullable
- Ajouter les colonnes manquantes
- Mettre à jour la contrainte CHECK
- Vérifier les policies RLS

### Étape 2 : Tester avec logs améliorés

Le code a été amélioré pour afficher plus de détails d'erreur.

1. Rafraîchir la page
2. Ouvrir la console F12
3. Essayer d'ajouter un contrat manuel
4. Si erreur, vous verrez maintenant :
   ```
   Attempting to insert contract with data: {...}
   Insert error details: {
     message: "...",
     details: "...",
     hint: "...",
     code: "..."
   }
   ```

## Test complet

1. **Ouvrir l'app**
2. **Aller sur un salarié**
3. **Cliquer sur "Ajouter contrat manuel"**
4. **Remplir le formulaire** :
   - Type de contrat : CDI ou CDD
   - Poste : Sélectionner un poste
   - Date de début : Aujourd'hui
   - Date de signature : Aujourd'hui
   - Fichier PDF : Un PDF de test
5. **Cliquer sur "Enregistrer le contrat"**
6. **Vérifier** :
   - Message de succès
   - Le contrat apparaît dans la liste
   - Le PDF est accessible

## Diagnostic si ça ne marche toujours pas

Exécutez ce SQL pour diagnostiquer :
```sql
-- Voir toutes les colonnes de la table contrat
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contrat'
ORDER BY ordinal_position;

-- Voir la contrainte CHECK
SELECT
  con.conname,
  pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'contrat' AND con.contype = 'c';

-- Voir les policies RLS
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'contrat';
```

## Ce qui a été corrigé

### Code (ManualContractUploadModal.tsx)
- Ajout de logs détaillés pour voir l'erreur complète
- Affichage du message d'erreur complet à l'utilisateur

### Base de données (FIX-CONTRAT-MANUEL-COMPLETE.sql)
- `modele_id` devient nullable
- Toutes les colonnes requises sont créées
- Contrainte CHECK mise à jour
- Policies RLS vérifiées

---

**Temps d'exécution : 30 secondes**
