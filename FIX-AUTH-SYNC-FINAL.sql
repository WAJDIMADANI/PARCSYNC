/*
  ============================================================================
  FIX AUTH USER SYNCHRONIZATION - EXECUTE THIS IN SUPABASE SQL EDITOR
  ============================================================================

  ## PROBLEM
  The `auth_user_id` values in `app_utilisateur` table don't match the actual
  UUID values from `auth.users` table. This causes authentication to fail because
  auth.uid() cannot find matching records.

  ## SOLUTION
  1. Update existing user records to use correct UUIDs from auth.users
  2. Create automatic trigger for future user registrations
  3. Fix RLS policies to work correctly with auth.uid()

  ## INSTRUCTIONS
  1. Copy this entire file
  2. Open Supabase Dashboard > SQL Editor
  3. Paste and click "Run"
  4. Check the output messages for verification

  ============================================================================
*/

-- =====================================================
-- STEP 1: Fix existing user records
-- =====================================================

DO $$
DECLARE
  v_count INTEGER;
  v_auth_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FIXING AUTH_USER_ID SYNCHRONIZATION';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Update acceuil@acceuil.com
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'acceuil@acceuil.com';
  IF v_auth_id IS NOT NULL THEN
    UPDATE app_utilisateur
    SET auth_user_id = v_auth_id
    WHERE email = 'acceuil@acceuil.com'
    AND (auth_user_id IS NULL OR auth_user_id != v_auth_id);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'acceuil@acceuil.com: % rows updated', v_count;
    RAISE NOTICE '  New auth_user_id: %', v_auth_id;
  ELSE
    RAISE NOTICE 'acceuil@acceuil.com: NOT FOUND in auth.users';
  END IF;

  -- Update admin@test.com
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'admin@test.com';
  IF v_auth_id IS NOT NULL THEN
    UPDATE app_utilisateur
    SET auth_user_id = v_auth_id
    WHERE email = 'admin@test.com'
    AND (auth_user_id IS NULL OR auth_user_id != v_auth_id);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'admin@test.com: % rows updated', v_count;
    RAISE NOTICE '  New auth_user_id: %', v_auth_id;
  ELSE
    RAISE NOTICE 'admin@test.com: NOT FOUND in auth.users';
  END IF;

  -- Update wajdi@mad-impact.com
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'wajdi@mad-impact.com';
  IF v_auth_id IS NOT NULL THEN
    UPDATE app_utilisateur
    SET auth_user_id = v_auth_id
    WHERE email = 'wajdi@mad-impact.com'
    AND (auth_user_id IS NULL OR auth_user_id != v_auth_id);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'wajdi@mad-impact.com: % rows updated', v_count;
    RAISE NOTICE '  New auth_user_id: %', v_auth_id;
  ELSE
    RAISE NOTICE 'wajdi@mad-impact.com: NOT FOUND in auth.users';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SYNCHRONIZATION UPDATES COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END;
$$;

-- =====================================================
-- STEP 2: Create automatic sync trigger
-- =====================================================

-- Function to automatically create app_utilisateur when auth user is created
CREATE OR REPLACE FUNCTION sync_new_auth_user_to_app_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_nom TEXT;
  v_prenom TEXT;
  v_email_name TEXT;
BEGIN
  -- Check if user already exists in app_utilisateur
  SELECT id INTO v_user_id
  FROM app_utilisateur
  WHERE auth_user_id = NEW.id;

  -- If user already exists, skip
  IF v_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Extract name from email (before @)
  v_email_name := split_part(NEW.email, '@', 1);

  -- Try to split by dot for first and last name
  IF position('.' in v_email_name) > 0 THEN
    v_prenom := initcap(split_part(v_email_name, '.', 1));
    v_nom := initcap(split_part(v_email_name, '.', 2));
  ELSE
    v_prenom := initcap(v_email_name);
    v_nom := 'User';
  END IF;

  -- Create user in app_utilisateur with correct auth_user_id
  INSERT INTO app_utilisateur (auth_user_id, email, nom, prenom, actif)
  VALUES (NEW.id, NEW.email, v_nom, v_prenom, true)
  RETURNING id INTO v_user_id;

  -- Give basic permissions to new user
  INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
  VALUES (v_user_id, 'rh/demandes', true);

  RAISE NOTICE 'Auto-created app_utilisateur for: % (auth_user_id: %)', NEW.email, NEW.id;

  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_new_auth_user_to_app_user();

RAISE NOTICE '';
RAISE NOTICE '✓ Trigger created: on_auth_user_created';
RAISE NOTICE '  Future auth.users registrations will auto-sync to app_utilisateur';
RAISE NOTICE '';

-- =====================================================
-- STEP 3: Fix RLS policies
-- =====================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON app_utilisateur;
DROP POLICY IF EXISTS "Users can update own data" ON app_utilisateur;

-- Create policy for users to view their own data
CREATE POLICY "Users can view own data"
  ON app_utilisateur
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update own data"
  ON app_utilisateur
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

RAISE NOTICE '';
RAISE NOTICE '✓ RLS policies updated';
RAISE NOTICE '';

-- =====================================================
-- STEP 4: Verification
-- =====================================================

DO $$
DECLARE
  v_record RECORD;
  v_total INTEGER := 0;
  v_matched INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  FOR v_record IN
    SELECT
      au.email,
      au.nom,
      au.prenom,
      au.auth_user_id as app_auth_id,
      authusers.id as real_auth_id,
      CASE
        WHEN au.auth_user_id = authusers.id THEN true
        ELSE false
      END as is_match
    FROM app_utilisateur au
    LEFT JOIN auth.users authusers ON authusers.email = au.email
    ORDER BY au.created_at
  LOOP
    v_total := v_total + 1;

    IF v_record.is_match THEN
      v_matched := v_matched + 1;
      RAISE NOTICE '✓ % % (%) - SYNCHRONIZED',
        v_record.prenom, v_record.nom, v_record.email;
    ELSE
      RAISE NOTICE '✗ % % (%) - MISMATCH!',
        v_record.prenom, v_record.nom, v_record.email;
      RAISE NOTICE '    app_utilisateur.auth_user_id: %', v_record.app_auth_id;
      RAISE NOTICE '    auth.users.id:                %', v_record.real_auth_id;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUMMARY: % / % users synchronized', v_matched, v_total;
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  IF v_matched = v_total AND v_total > 0 THEN
    RAISE NOTICE '✓✓✓ SUCCESS! All users are now synchronized.';
    RAISE NOTICE '    You can now log in with any of these accounts.';
  ELSIF v_matched < v_total THEN
    RAISE WARNING 'Some users still have mismatched IDs. Check the output above.';
  END IF;

  RAISE NOTICE '';
END;
$$;

-- =====================================================
-- STEP 5: Display current state
-- =====================================================

SELECT
  '=== CURRENT STATE ===' as info;

SELECT
  au.email as "Email",
  au.nom as "Nom",
  au.prenom as "Prenom",
  au.auth_user_id::text as "auth_user_id in app_utilisateur",
  authusers.id::text as "id in auth.users",
  CASE
    WHEN au.auth_user_id = authusers.id THEN '✓ MATCH'
    ELSE '✗ MISMATCH'
  END as "Status"
FROM app_utilisateur au
LEFT JOIN auth.users authusers ON authusers.email = au.email
ORDER BY au.created_at;
