# QUICK FIX: Import CSV qui échoue

## Problème
Import CSV échoue avec "Erreur de date PostgreSQL" alors que les dates sont correctes.

## Cause
Le schéma de la table `contrat` est incompatible avec le code d'import.

## Solution en 3 étapes

### 1️⃣ Ouvrir l'éditeur SQL Supabase
👉 https://supabase.com/dashboard/project/YOUR_PROJECT/sql

### 2️⃣ Copier-coller et exécuter ce SQL

```sql
-- Rendre modele_id nullable
ALTER TABLE contrat ALTER COLUMN modele_id DROP NOT NULL;

-- Ajouter les colonnes manquantes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contrat' AND column_name = 'type') THEN
    ALTER TABLE contrat ADD COLUMN type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contrat' AND column_name = 'date_debut') THEN
    ALTER TABLE contrat ADD COLUMN date_debut date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contrat' AND column_name = 'date_fin') THEN
    ALTER TABLE contrat ADD COLUMN date_fin date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contrat' AND column_name = 'esign') THEN
    ALTER TABLE contrat ADD COLUMN esign text DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contrat' AND column_name = 'source') THEN
    ALTER TABLE contrat ADD COLUMN source text;
  END IF;
END $$;

-- Créer des index
CREATE INDEX IF NOT EXISTS idx_contrat_type ON contrat(type);
CREATE INDEX IF NOT EXISTS idx_contrat_date_debut ON contrat(date_debut);
```

### 3️⃣ Tester l'import

1. Rechargez votre page web (F5)
2. Allez dans **Administration > Import en Masse**
3. Importez votre CSV
4. ✅ Les 338 lignes devraient passer sans erreur!

## ℹ️ Note sur les permissions

Le message de la console:
```
Checking permission "admin/import-salarie": ❌ DENIED
```

C'est normal! C'est juste le menu qui vérifie quels items afficher.

La permission dont vous avez besoin est:
```
Checking permission "admin/import-bulk": ✅ ALLOWED
```

Vous l'avez déjà! Pas besoin de modifications.

---

**Si le problème persiste, consultez `FIX-IMPORT-CSV-SCHEMA-ERROR.md` pour plus de détails.**
