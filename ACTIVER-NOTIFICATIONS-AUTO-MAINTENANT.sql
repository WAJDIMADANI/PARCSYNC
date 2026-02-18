/*
  # Activer la génération automatique des notifications d'expiration

  Ce script crée un trigger qui génère automatiquement les notifications
  quand vous modifiez une date d'expiration dans un profil.

  1. Fonction trigger
    - Vérifie si les dates d'expiration ont changé
    - Appelle generate_expiration_notifications() automatiquement
  
  2. Trigger
    - Se déclenche AFTER UPDATE sur la table profil
    - Uniquement si les colonnes d'expiration changent
*/

-- Créer la fonction trigger
CREATE OR REPLACE FUNCTION trigger_generate_notifications_on_profil_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si une date d'expiration a été modifiée
  IF (OLD.titre_sejour_validite_fin IS DISTINCT FROM NEW.titre_sejour_validite_fin)
     OR (OLD.carte_vitale_date_fin IS DISTINCT FROM NEW.carte_vitale_date_fin)
     OR (OLD.permis_conduire_date_fin IS DISTINCT FROM NEW.permis_conduire_date_fin)
     OR (OLD.carte_identite_date_fin IS DISTINCT FROM NEW.carte_identite_date_fin)
     OR (OLD.passeport_date_fin IS DISTINCT FROM NEW.passeport_date_fin) THEN
    
    -- Générer les notifications pour ce profil spécifiquement
    PERFORM generate_expiration_notifications();
    
    RAISE NOTICE 'Notifications générées automatiquement pour le profil %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS auto_generate_notifications_on_profil_update ON profil;

-- Créer le trigger
CREATE TRIGGER auto_generate_notifications_on_profil_update
  AFTER UPDATE ON profil
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_notifications_on_profil_update();

-- Tester : afficher un message
SELECT 'Trigger créé avec succès ! Les notifications se généreront automatiquement.' as message;
