# Correction Suppression Modèles - À exécuter maintenant

## Étape 1: Script SQL (2 min)

1. Ouvrez Supabase Dashboard
2. SQL Editor
3. Copiez-collez ce script:

```sql
-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Admins can delete letter templates files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete on letter-templates" ON storage.objects;

-- Policy DELETE pour Storage
CREATE POLICY "Authenticated users can delete letter templates files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'letter-templates');

-- Policy DELETE pour table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'modele_courrier'
    AND policyname = 'Authenticated users can delete letter templates'
  ) THEN
    CREATE POLICY "Authenticated users can delete letter templates"
      ON modele_courrier
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Vérification
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'modele_courrier' ORDER BY cmd;
SELECT policyname, cmd FROM storage.policies WHERE bucket_id = 'letter-templates' ORDER BY cmd;
```

4. Cliquez **Run**

## Étape 2: Test (30 sec)

1. Allez dans **Modèles de Courriers** ou **Modèles de Courriers V2**
2. Cliquez sur 🗑️ pour supprimer un modèle test
3. Confirmez

Si erreur: un bandeau rouge affichera le message exact.

## C'est fait !

La suppression des modèles devrait maintenant fonctionner.
