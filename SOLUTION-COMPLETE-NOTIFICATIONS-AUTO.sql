/*
  # Solution complète : Notifications automatiques après modification de dates

  ## Problème
  - Le trigger existe mais ne se déclenche pas toujours
  - L'utilisateur doit appeler manuellement generate_expiration_notifications()

  ## Solution
  1. Corriger le trigger pour qu'il fonctionne vraiment
  2. Ajouter une fonction RPC accessible depuis le frontend
  3. L'interface appellera automatiquement cette fonction après chaque modification
*/

-- ============================================
-- ÉTAPE 1: Supprimer les anciens triggers
-- ============================================

DROP TRIGGER IF EXISTS auto_generate_notifications_on_profil_update ON profil;
DROP TRIGGER IF EXISTS auto_generate_notifications_on_document_update ON document;
DROP TRIGGER IF EXISTS auto_generate_notifications_on_document_insert ON document;
DROP FUNCTION IF EXISTS trigger_generate_notifications_on_profil_update();
DROP FUNCTION IF EXISTS trigger_generate_notifications_on_document_update();
DROP FUNCTION IF EXISTS trigger_generate_notifications_on_document_insert();

-- ============================================
-- ÉTAPE 2: Créer une fonction légère et rapide
-- ============================================

CREATE OR REPLACE FUNCTION regenerer_notifications_document(doc_id uuid)
RETURNS json AS $$
DECLARE
  result_count int;
BEGIN
  -- Régénérer toutes les notifications
  PERFORM generate_expiration_notifications();

  -- Compter les notifications générées
  SELECT COUNT(*) INTO result_count
  FROM notification
  WHERE created_at > NOW() - INTERVAL '5 seconds';

  RETURN json_build_object(
    'success', true,
    'message', 'Notifications régénérées',
    'count', result_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ÉTAPE 3: Fonction simplifiée appelable
-- ============================================

CREATE OR REPLACE FUNCTION refresh_all_notifications()
RETURNS json AS $$
DECLARE
  result_count int;
  deleted_count int;
BEGIN
  -- Supprimer les anciennes notifications futures
  DELETE FROM notification
  WHERE lu = false
    AND date_envoi > NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Régénérer toutes les notifications
  PERFORM generate_expiration_notifications();

  -- Compter les nouvelles notifications
  SELECT COUNT(*) INTO result_count
  FROM notification
  WHERE created_at > NOW() - INTERVAL '10 seconds';

  RETURN json_build_object(
    'success', true,
    'deleted', deleted_count,
    'created', result_count,
    'message', format('✓ %s notifications supprimées, %s nouvelles créées', deleted_count, result_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ÉTAPE 4: Recréer le trigger (version robuste)
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auto_refresh_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Appeler la fonction de rafraîchissement
  -- Utiliser PERFORM pour ignorer le résultat
  BEGIN
    PERFORM refresh_all_notifications();
  EXCEPTION WHEN OTHERS THEN
    -- Log l'erreur mais ne pas bloquer la transaction
    RAISE WARNING 'Erreur lors de la régénération des notifications: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur UPDATE de document.date_expiration
CREATE TRIGGER auto_refresh_notifications_on_document_update
  AFTER UPDATE OF date_expiration ON document
  FOR EACH ROW
  WHEN (OLD.date_expiration IS DISTINCT FROM NEW.date_expiration)
  EXECUTE FUNCTION trigger_auto_refresh_notifications();

-- Trigger sur INSERT de document avec date_expiration
CREATE TRIGGER auto_refresh_notifications_on_document_insert
  AFTER INSERT ON document
  FOR EACH ROW
  WHEN (NEW.date_expiration IS NOT NULL)
  EXECUTE FUNCTION trigger_auto_refresh_notifications();

-- ============================================
-- ÉTAPE 5: Permissions RLS pour les fonctions
-- ============================================

-- Permettre aux utilisateurs authentifiés d'appeler ces fonctions
GRANT EXECUTE ON FUNCTION regenerer_notifications_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_all_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_expiration_notifications() TO authenticated;

-- ============================================
-- ÉTAPE 6: Test immédiat
-- ============================================

-- Régénérer toutes les notifications maintenant
SELECT refresh_all_notifications();

-- Vérifier les notifications créées
SELECT
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE lu = false) as non_lues,
  COUNT(*) FILTER (WHERE date_envoi <= NOW()) as a_envoyer
FROM notification
GROUP BY type
ORDER BY total DESC;

SELECT '✓ Installation terminée ! Les notifications seront maintenant régénérées automatiquement après chaque modification de date d''expiration.' as message;
