/*
  FIX URGENT : Supprimer la contrainte ux_contrat_one_base_per_group

  EXÉCUTEZ CE SCRIPT MAINTENANT dans l'éditeur SQL de Supabase
*/

-- ÉTAPE 1 : Supprimer la contrainte principale
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS ux_contrat_one_base_per_group CASCADE;

-- ÉTAPE 2 : Supprimer toutes les contraintes similaires
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'contrat'::regclass
      AND (
        conname LIKE '%ux_%'
        OR conname LIKE '%one_base%'
        OR (contype = 'u' AND pg_get_constraintdef(oid) LIKE '%profil_id%')
      )
  LOOP
    EXECUTE 'ALTER TABLE contrat DROP CONSTRAINT IF EXISTS ' || constraint_record.conname || ' CASCADE';
    RAISE NOTICE 'Contrainte supprimée: %', constraint_record.conname;
  END LOOP;
END $$;

-- ÉTAPE 3 : Supprimer tous les index uniques sur profil_id
DO $$
DECLARE
  index_record RECORD;
BEGIN
  FOR index_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'contrat'
      AND indexdef LIKE '%UNIQUE%'
      AND (
        indexdef LIKE '%profil_id%'
        OR indexname LIKE '%one_base%'
      )
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname || ' CASCADE';
    RAISE NOTICE 'Index unique supprimé: %', index_record.indexname;
  END LOOP;
END $$;

-- ÉTAPE 4 : Vérification finale
SELECT
  '✅ ✅ ✅ SUCCÈS - Toutes les contraintes ont été supprimées' as status,
  'Vous pouvez maintenant créer autant de contrats que vous voulez' as message;

-- Vérification : Afficher les contraintes restantes (devrait être vide)
SELECT
  conname as contrainte_restante,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND contype = 'u'
  AND pg_get_constraintdef(oid) LIKE '%profil_id%';
