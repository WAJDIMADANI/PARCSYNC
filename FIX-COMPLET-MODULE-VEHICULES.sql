/*
  # FIX COMPLET - Module Véhicules

  Ce script corrige tous les problèmes :
  1. Vérification et création du bucket storage pour documents véhicules
  2. Vérification des policies RLS sur table vehicule
  3. Création des policies manquantes
  4. Logs détaillés pour identifier les problèmes
*/

-- ============================================================================
-- 1. VÉRIFIER ET CRÉER LE BUCKET STORAGE
-- ============================================================================

-- Créer le bucket pour les documents véhicules (s'il n'existe pas)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents-vehicules',
  'documents-vehicules',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les anciennes policies du bucket si elles existent
DROP POLICY IF EXISTS "Authenticated users can upload vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle documents" ON storage.objects;

-- Recréer les policies pour le bucket documents-vehicules
CREATE POLICY "Authenticated users can upload vehicle documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents-vehicules');

CREATE POLICY "Authenticated users can read vehicle documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents-vehicules');

CREATE POLICY "Authenticated users can delete vehicle documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents-vehicules');

CREATE POLICY "Authenticated users can update vehicle documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents-vehicules')
  WITH CHECK (bucket_id = 'documents-vehicules');

-- ============================================================================
-- 2. VÉRIFIER LES POLICIES RLS SUR TABLE VEHICULE
-- ============================================================================

-- Vérifier et créer la policy UPDATE si elle n'existe pas
DO $$
BEGIN
  -- Supprimer l'ancienne policy si elle existe
  DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON vehicule;

  -- Recréer la policy UPDATE
  CREATE POLICY "Authenticated users can update vehicles"
    ON vehicule
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE '✓ Policy UPDATE sur vehicule créée';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Policy UPDATE existe déjà';
END $$;

-- Vérifier et créer la policy SELECT si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicule' AND policyname = 'Authenticated users can read vehicles'
  ) THEN
    CREATE POLICY "Authenticated users can read vehicles"
      ON vehicule
      FOR SELECT
      TO authenticated
      USING (true);
    RAISE NOTICE '✓ Policy SELECT sur vehicule créée';
  ELSE
    RAISE NOTICE 'Policy SELECT existe déjà';
  END IF;
END $$;

-- Vérifier et créer la policy INSERT si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicule' AND policyname = 'Authenticated users can insert vehicles'
  ) THEN
    CREATE POLICY "Authenticated users can insert vehicles"
      ON vehicule
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
    RAISE NOTICE '✓ Policy INSERT sur vehicule créée';
  ELSE
    RAISE NOTICE 'Policy INSERT existe déjà';
  END IF;
END $$;

-- ============================================================================
-- 3. VÉRIFIER STORAGE BUCKET VEHICLE-PHOTOS
-- ============================================================================

-- Créer le bucket pour les photos véhicules (s'il n'existe pas)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les anciennes policies du bucket vehicle-photos si elles existent
DROP POLICY IF EXISTS "Authenticated users can upload vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle photos" ON storage.objects;

-- Recréer les policies pour le bucket vehicle-photos
CREATE POLICY "Authenticated users can upload vehicle photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vehicle-photos');

CREATE POLICY "Authenticated users can read vehicle photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Authenticated users can delete vehicle photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vehicle-photos');

-- ============================================================================
-- 4. VÉRIFICATIONS FINALES
-- ============================================================================

-- Afficher les buckets créés
SELECT
  'Bucket documents-vehicules' as verification,
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents-vehicules')
  THEN '✓ Existe' ELSE '✗ Manquant' END as statut
UNION ALL
SELECT
  'Bucket vehicle-photos' as verification,
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'vehicle-photos')
  THEN '✓ Existe' ELSE '✗ Manquant' END as statut;

-- Afficher les policies RLS sur vehicule
SELECT
  'Policies RLS vehicule' as verification,
  COUNT(*)::text || ' policies' as statut
FROM pg_policies
WHERE tablename = 'vehicule';

-- Afficher les policies storage
SELECT
  'Policies storage documents-vehicules' as verification,
  COUNT(*)::text || ' policies' as statut
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%vehicle%';

-- ============================================================================
-- 5. TEST D'UPDATE (à commenter pour un vrai test)
-- ============================================================================

-- Décommenter pour tester un UPDATE sur un véhicule existant
-- SELECT 'Test UPDATE' as test;
-- UPDATE vehicule
-- SET marque = marque
-- WHERE id = (SELECT id FROM vehicule LIMIT 1);
-- SELECT 'UPDATE réussi !' as resultat;

-- ============================================================================
-- RÉCAPITULATIF
-- ============================================================================

DO $$
DECLARE
  v_bucket_docs boolean;
  v_bucket_photos boolean;
  v_policies_vehicule integer;
  v_policies_storage integer;
BEGIN
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents-vehicules') INTO v_bucket_docs;
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'vehicle-photos') INTO v_bucket_photos;
  SELECT COUNT(*) INTO v_policies_vehicule FROM pg_policies WHERE tablename = 'vehicule';
  SELECT COUNT(*) INTO v_policies_storage FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%vehicle%';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉCAPITULATIF FIX MODULE VÉHICULES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket documents-vehicules: %', CASE WHEN v_bucket_docs THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Bucket vehicle-photos: %', CASE WHEN v_bucket_photos THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Policies RLS vehicule: %', v_policies_vehicule;
  RAISE NOTICE 'Policies storage: %', v_policies_storage;
  RAISE NOTICE '========================================';

  IF v_bucket_docs AND v_bucket_photos AND v_policies_vehicule >= 3 THEN
    RAISE NOTICE '✓ Tous les éléments sont en place !';
    RAISE NOTICE '';
    RAISE NOTICE 'PROCHAINE ÉTAPE :';
    RAISE NOTICE '1. Ouvrir l''application';
    RAISE NOTICE '2. Ouvrir la console (F12)';
    RAISE NOTICE '3. Modifier un véhicule';
    RAISE NOTICE '4. Vérifier les logs détaillés';
  ELSE
    RAISE WARNING '⚠ Configuration incomplète';
  END IF;
END $$;
