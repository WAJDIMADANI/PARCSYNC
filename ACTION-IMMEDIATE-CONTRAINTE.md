# EXÉCUTER MAINTENANT

## Problème
```
new row for relation "contrat" violates check constraint "contrat_avenant_num_chk"
```

## Solution (2 minutes)

### Étape 1 : Ouvrez Supabase
https://supabase.com → Votre projet → SQL Editor

### Étape 2 : Copiez-collez ce SQL et exécutez

```sql
-- Supprimer l'ancienne contrainte
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_avenant_num_chk;

-- Recréer la contrainte pour permettre NULL
ALTER TABLE contrat ADD CONSTRAINT contrat_avenant_num_chk
  CHECK (avenant_num IS NULL OR avenant_num > 0);
```

### Étape 3 : Cliquez RUN

Vous devriez voir : "Success. No rows returned"

### Étape 4 : Testez

Rafraîchir l'app → Modal salarié → Ajouter contrat manuel → Upload PDF

**Ça devrait fonctionner maintenant !**

---

## Fichier SQL complet
Si vous préférez, utilisez :
**EXECUTER-MAINTENANT-CONTRAINTE-AVENANT.sql**
