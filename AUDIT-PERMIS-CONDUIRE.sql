-- ============================================
-- AUDIT AVANT AJOUT CHAMPS PERMIS
-- ============================================

-- 1. Vérifier les triggers sur la table profil
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profil'
ORDER BY trigger_name;

-- 2. Vérifier si la colonne permis_conduire existe déjà
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profil'
  AND column_name LIKE '%permis%'
ORDER BY column_name;

-- 3. Vérifier les colonnes actuelles dans profil liées aux documents
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profil'
  AND (
    column_name LIKE '%expiration%'
    OR column_name LIKE '%validite%'
    OR column_name LIKE '%visite%'
    OR column_name LIKE '%date%'
    OR column_name LIKE '%titre%'
  )
ORDER BY column_name;

-- 4. Vérifier les policies RLS sur profil
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profil'
ORDER BY policyname;

-- 5. Vérifier s'il existe déjà des données dans type_piece_identite
SELECT
  type_piece_identite,
  COUNT(*) as nombre
FROM profil
WHERE type_piece_identite IS NOT NULL
GROUP BY type_piece_identite
ORDER BY nombre DESC;

-- 6. Message final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ AUDIT TERMINÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Vérifiez les résultats ci-dessus pour:';
  RAISE NOTICE '';
  RAISE NOTICE '1. TRIGGERS: Aucun trigger ne doit modifier ces colonnes';
  RAISE NOTICE '2. COLONNES: La colonne permis_conduire ne doit pas exister';
  RAISE NOTICE '3. RLS: Les policies doivent permettre UPDATE';
  RAISE NOTICE '4. DONNÉES: Vérifier les types de pièces existants';
  RAISE NOTICE '';
  RAISE NOTICE 'Si tout est OK, vous pouvez ajouter les champs permis';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
