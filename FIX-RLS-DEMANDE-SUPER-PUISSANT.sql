-- ============================================
-- SCRIPT SUPER PUISSANT - FIX RLS DEMANDE EXTERNE
-- ============================================
-- Ce script va VRAIMENT corriger le problème RLS
-- Il supprime TOUT et recrée proprement

-- 1. DÉSACTIVER TEMPORAIREMENT RLS (pour nettoyage)
ALTER TABLE demandes_externes DISABLE ROW LEVEL SECURITY;

-- 2. SUPPRIMER TOUTES LES POLICIES EXISTANTES
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'demandes_externes')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON demandes_externes', r.policyname);
    END LOOP;
END $$;

-- 3. RÉACTIVER RLS
ALTER TABLE demandes_externes ENABLE ROW LEVEL SECURITY;

-- 4. CRÉER LA POLICY POUR INSERT (PUBLIC = anon + authenticated)
CREATE POLICY "public_can_insert_demandes_externes"
  ON demandes_externes
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 5. CRÉER LA POLICY POUR SELECT (authenticated seulement)
CREATE POLICY "authenticated_can_read_demandes_externes"
  ON demandes_externes
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. CRÉER LA POLICY POUR UPDATE (authenticated seulement)
CREATE POLICY "authenticated_can_update_demandes_externes"
  ON demandes_externes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- MÊME CHOSE POUR LES AUTRES TABLES
-- ============================================

-- PROFIL : Permettre SELECT à PUBLIC
DROP POLICY IF EXISTS "public_can_read_profil" ON profil;
CREATE POLICY "public_can_read_profil"
  ON profil
  FOR SELECT
  TO public
  USING (true);

-- POLES : Permettre SELECT des pôles actifs à PUBLIC
DROP POLICY IF EXISTS "public_can_read_active_poles" ON poles;
CREATE POLICY "public_can_read_active_poles"
  ON poles
  FOR SELECT
  TO public
  USING (actif = true);

-- APP_UTILISATEUR : Permettre SELECT à PUBLIC
DROP POLICY IF EXISTS "public_can_read_active_users" ON app_utilisateur;
CREATE POLICY "public_can_read_active_users"
  ON app_utilisateur
  FOR SELECT
  TO public
  USING (actif = true);

-- INBOX : Permettre INSERT à PUBLIC
DROP POLICY IF EXISTS "public_can_insert_inbox" ON inbox;
CREATE POLICY "public_can_insert_inbox"
  ON inbox
  FOR INSERT
  TO public
  WITH CHECK (true);

-- ============================================
-- STORAGE BUCKET
-- ============================================

-- Créer le bucket si inexistant
INSERT INTO storage.buckets (id, name, public)
VALUES ('demandes-externes', 'demandes-externes', false)
ON CONFLICT (id) DO NOTHING;

-- Nettoyer les anciennes policies storage
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname LIKE '%demandes-externes%'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- Créer les policies storage
CREATE POLICY "public_can_upload_demandes_externes"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'demandes-externes');

CREATE POLICY "authenticated_can_read_demandes_externes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'demandes-externes');

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

-- Afficher toutes les policies créées
SELECT
  tablename,
  policyname,
  roles::text,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('demandes_externes', 'profil', 'poles', 'app_utilisateur', 'inbox')
ORDER BY tablename, policyname;

-- Vérifier le bucket
SELECT * FROM storage.buckets WHERE id = 'demandes-externes';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT EXÉCUTÉ AVEC SUCCÈS !';
  RAISE NOTICE '✅ Les policies RLS sont maintenant configurées correctement';
  RAISE NOTICE '✅ La page demande-externe devrait fonctionner maintenant';
  RAISE NOTICE '⚠️  Rechargez votre page avec Ctrl+F5';
END $$;
