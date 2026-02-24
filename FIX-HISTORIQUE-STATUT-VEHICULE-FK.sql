/*
  # Fix: Erreur Foreign Key historique_statut_vehicule

  ## Problème
  L'erreur se produit quand on change le statut d'un véhicule:
  - Key (modifie_par)=(4f087575-4771-4469-a876-7ae6199af546) is not present in table "app_utilisateur"
  - L'utilisateur existe dans auth.users mais pas dans app_utilisateur
  - Le trigger essaie d'insérer dans historique_statut_vehicule avec modifie_par qui n'existe pas

  ## Solution
  1. Créer une fonction get_app_user_id() qui retourne l'ID app_utilisateur depuis auth.uid()
  2. Modifier le trigger pour utiliser cette fonction au lieu de auth.uid() directement
  3. S'assurer que tous les utilisateurs auth.users existent dans app_utilisateur
*/

-- ========================================
-- ÉTAPE 1: Fonction helper pour obtenir l'ID app_utilisateur
-- ========================================

CREATE OR REPLACE FUNCTION get_app_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT id
    FROM app_utilisateur
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION get_app_user_id() IS 'Retourne l''ID app_utilisateur correspondant à l''utilisateur authentifié actuel';


-- ========================================
-- ÉTAPE 2: Supprimer et recréer le trigger de l'historique de statut
-- ========================================

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS track_vehicule_statut_changes ON vehicule;
DROP FUNCTION IF EXISTS track_vehicule_statut_changes() CASCADE;

-- Créer la fonction du trigger améliorée
CREATE OR REPLACE FUNCTION track_vehicule_statut_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_app_user_id uuid;
  v_current_user_email text;
BEGIN
  -- Obtenir l'ID app_utilisateur depuis auth.uid()
  v_app_user_id := get_app_user_id();

  -- Si on ne trouve pas l'utilisateur, essayer de créer un enregistrement
  IF v_app_user_id IS NULL AND auth.uid() IS NOT NULL THEN
    -- Récupérer l'email de l'utilisateur authentifié
    SELECT email INTO v_current_user_email
    FROM auth.users
    WHERE id = auth.uid();

    -- Créer l'entrée dans app_utilisateur si elle n'existe pas
    INSERT INTO app_utilisateur (auth_user_id, email, nom, prenom, role)
    VALUES (
      auth.uid(),
      v_current_user_email,
      COALESCE(SPLIT_PART(v_current_user_email, '@', 1), 'Utilisateur'),
      'Système',
      'user'
    )
    ON CONFLICT (auth_user_id) DO NOTHING
    RETURNING id INTO v_app_user_id;

    -- Si toujours NULL, réessayer de le récupérer
    IF v_app_user_id IS NULL THEN
      v_app_user_id := get_app_user_id();
    END IF;
  END IF;

  -- Insérer dans l'historique uniquement si on a un changement de statut
  IF (TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut) OR TG_OP = 'INSERT' THEN
    INSERT INTO historique_statut_vehicule (
      vehicule_id,
      ancien_statut,
      nouveau_statut,
      date_changement,
      modifie_par,
      commentaire
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.statut ELSE NULL END,
      NEW.statut,
      NOW(),
      v_app_user_id,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'Création du véhicule'
        ELSE 'Changement de statut'
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION track_vehicule_statut_changes() IS 'Enregistre automatiquement les changements de statut des véhicules dans l''historique';

-- Créer le trigger
CREATE TRIGGER track_vehicule_statut_changes
  AFTER INSERT OR UPDATE ON vehicule
  FOR EACH ROW
  EXECUTE FUNCTION track_vehicule_statut_changes();


-- ========================================
-- ÉTAPE 3: Synchroniser les utilisateurs manquants
-- ========================================

-- Créer les entrées manquantes dans app_utilisateur pour tous les utilisateurs auth.users
INSERT INTO app_utilisateur (auth_user_id, email, nom, prenom, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nom', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'prenom', 'Utilisateur'),
  COALESCE(au.raw_user_meta_data->>'role', 'user')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1
  FROM app_utilisateur app
  WHERE app.auth_user_id = au.id
)
ON CONFLICT (auth_user_id) DO NOTHING;


-- ========================================
-- ÉTAPE 4: Mettre à jour les politiques RLS si nécessaire
-- ========================================

-- Politique SELECT pour historique_statut_vehicule
DROP POLICY IF EXISTS "Users can view vehicle status history" ON historique_statut_vehicule;
CREATE POLICY "Users can view vehicle status history"
  ON historique_statut_vehicule FOR SELECT
  TO authenticated
  USING (true);

-- Politique INSERT pour historique_statut_vehicule (via trigger uniquement)
DROP POLICY IF EXISTS "System can insert vehicle status history" ON historique_statut_vehicule;
CREATE POLICY "System can insert vehicle status history"
  ON historique_statut_vehicule FOR INSERT
  TO authenticated
  WITH CHECK (
    modifie_par = get_app_user_id() OR modifie_par IS NULL
  );


-- ========================================
-- ÉTAPE 5: Vérification
-- ========================================

-- Vérifier la synchronisation auth.users <-> app_utilisateur
SELECT
  au.email,
  au.id as auth_user_id,
  app.id as app_user_id,
  app.nom,
  app.prenom,
  CASE
    WHEN app.id IS NOT NULL THEN '✓ Synchronisé'
    ELSE '✗ Manquant dans app_utilisateur'
  END as statut
FROM auth.users au
LEFT JOIN app_utilisateur app ON app.auth_user_id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

-- Vérifier les triggers
SELECT
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'vehicule'
  AND trigger_name = 'track_vehicule_statut_changes';
