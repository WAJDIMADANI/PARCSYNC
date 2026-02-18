/*
  # Corriger le trigger de génération automatique des notifications

  Le problème : le trigger essayait d'accéder à des colonnes qui n'existent pas
  dans la table profil (titre_sejour_validite_fin, etc.)
  
  Solution : Créer un trigger sur la table DOCUMENT au lieu de profil
*/

-- 1. SUPPRIMER l'ancien trigger défectueux sur profil
DROP TRIGGER IF EXISTS auto_generate_notifications_on_profil_update ON profil;
DROP FUNCTION IF EXISTS trigger_generate_notifications_on_profil_update();

-- 2. Créer la fonction trigger pour la table document
CREATE OR REPLACE FUNCTION trigger_generate_notifications_on_document_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si la date d'expiration a été modifiée
  IF (OLD.date_expiration IS DISTINCT FROM NEW.date_expiration) THEN
    
    -- Générer les notifications
    PERFORM generate_expiration_notifications();
    
    RAISE NOTICE 'Notifications générées automatiquement pour le document % (type: %)', NEW.id, NEW.type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer le trigger sur la table document
DROP TRIGGER IF EXISTS auto_generate_notifications_on_document_update ON document;

CREATE TRIGGER auto_generate_notifications_on_document_update
  AFTER UPDATE ON document
  FOR EACH ROW
  WHEN (OLD.date_expiration IS DISTINCT FROM NEW.date_expiration)
  EXECUTE FUNCTION trigger_generate_notifications_on_document_update();

-- 4. Créer aussi un trigger pour les nouveaux documents avec date d'expiration
CREATE OR REPLACE FUNCTION trigger_generate_notifications_on_document_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le nouveau document a une date d'expiration, générer les notifications
  IF NEW.date_expiration IS NOT NULL THEN
    PERFORM generate_expiration_notifications();
    RAISE NOTICE 'Notifications générées pour le nouveau document % (type: %)', NEW.id, NEW.type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_generate_notifications_on_document_insert ON document;

CREATE TRIGGER auto_generate_notifications_on_document_insert
  AFTER INSERT ON document
  FOR EACH ROW
  WHEN (NEW.date_expiration IS NOT NULL)
  EXECUTE FUNCTION trigger_generate_notifications_on_document_insert();

-- Confirmer que tout est OK
SELECT 'Trigger corrigé avec succès ! Vous pouvez maintenant modifier les dates d''expiration.' as message;
