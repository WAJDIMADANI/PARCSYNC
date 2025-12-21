/*
  Suppression des règles empêchant la création de plusieurs contrats

  Ce script supprime toutes les contraintes qui empêchent de créer plusieurs
  contrats pour un même salarié.
*/

-- Vérifier si la contrainte existe
SELECT
  'Contraintes actuelles sur la table contrat' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND conname LIKE '%ux_%';

-- Supprimer la contrainte unique qui empêche plusieurs contrats de base
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS ux_contrat_one_base_per_group;

-- Supprimer toute autre contrainte unique sur profil_id
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'contrat'::regclass
      AND contype = 'u'  -- unique constraint
      AND pg_get_constraintdef(oid) LIKE '%profil_id%'
  LOOP
    EXECUTE 'ALTER TABLE contrat DROP CONSTRAINT IF EXISTS ' || constraint_record.conname;
    RAISE NOTICE 'Contrainte supprimée: %', constraint_record.conname;
  END LOOP;
END $$;

-- Supprimer tout index unique sur profil_id
DO $$
DECLARE
  index_record RECORD;
BEGIN
  FOR index_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'contrat'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef LIKE '%profil_id%'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname;
    RAISE NOTICE 'Index unique supprimé: %', index_record.indexname;
  END LOOP;
END $$;

-- Mettre à jour le message d'erreur dans errorTranslator
-- (Note: Ceci est juste pour information, le code TypeScript doit être modifié séparément)
SELECT
  '✅ SUCCÈS' as status,
  'Toutes les contraintes empêchant la création de plusieurs contrats ont été supprimées' as message,
  'Vous pouvez maintenant créer autant de contrats que vous voulez pour un même salarié' as info;

-- Vérification finale
SELECT
  'Vérification finale' as info,
  COUNT(*) as nombre_contraintes_unique_restantes
FROM pg_constraint
WHERE conrelid = 'contrat'::regclass
  AND contype = 'u'
  AND pg_get_constraintdef(oid) LIKE '%profil_id%';
