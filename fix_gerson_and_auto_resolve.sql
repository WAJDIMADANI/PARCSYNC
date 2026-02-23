-- ============================================================================
-- CORRECTION : Auto-résolution des incidents contrat expiré
-- ============================================================================
-- Quand un nouveau contrat est signé, les anciens incidents de contrat expiré 
-- pour ce profil doivent être automatiquement résolus
-- ============================================================================

-- 1. Fonction pour résoudre automatiquement les incidents de contrat expiré
CREATE OR REPLACE FUNCTION auto_resolve_expired_contract_incidents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Chercher l'utilisateur système
  SELECT id INTO user_id
  FROM app_utilisateur
  WHERE email = 'system@rh-app.com'
  LIMIT 1;

  -- Si le contrat est signé ou actif ET qu'il a une date de fin
  IF (NEW.statut IN ('signe', 'actif')) AND NEW.date_fin IS NOT NULL THEN
    
    -- Résoudre tous les incidents 'contrat_expire' actifs pour ce profil
    -- dont la date d'expiration est antérieure à la date de début du nouveau contrat
    UPDATE incident
    SET 
      statut = 'resolu',
      date_resolution = CURRENT_DATE,
      notes = COALESCE(notes || E'\n\n', '') || 'Résolu automatiquement : nouveau contrat signé le ' || CURRENT_DATE::text,
      updated_at = NOW()
    WHERE 
      profil_id = NEW.profil_id
      AND type = 'contrat_expire'
      AND statut IN ('actif', 'expire')
      AND date_expiration_originale < NEW.date_debut;
    
    -- Optionnel : Ajouter une entrée dans l'historique pour chaque incident résolu
    INSERT INTO incident_historique (incident_id, action, ancien_statut, nouveau_statut, notes, effectue_par)
    SELECT 
      i.id,
      'resolution',
      i.statut,
      'resolu',
      'Résolu automatiquement suite à la signature d''un nouveau contrat',
      user_id
    FROM incident i
    WHERE 
      i.profil_id = NEW.profil_id
      AND i.type = 'contrat_expire'
      AND i.statut = 'resolu'
      AND i.date_resolution = CURRENT_DATE;
      
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Créer le trigger (si n'existe pas déjà)
DROP TRIGGER IF EXISTS trigger_auto_resolve_expired_incidents ON contrat;

CREATE TRIGGER trigger_auto_resolve_expired_incidents
  AFTER INSERT OR UPDATE OF statut, date_debut, date_fin ON contrat
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_expired_contract_incidents();

-- 3. Appliquer immédiatement la correction pour Gerson et tous les cas similaires
-- Résoudre les incidents de contrats expirés quand un contrat plus récent existe
WITH contrats_recents AS (
  SELECT DISTINCT ON (profil_id)
    profil_id,
    date_debut,
    date_fin,
    statut,
    created_at
  FROM contrat
  WHERE statut IN ('signe', 'actif')
    AND date_fin IS NOT NULL
  ORDER BY profil_id, date_debut DESC, created_at DESC
)
UPDATE incident i
SET 
  statut = 'resolu',
  date_resolution = CURRENT_DATE,
  notes = COALESCE(notes || E'\n\n', '') || 'Résolu automatiquement : contrat plus récent existe (correction du ' || CURRENT_DATE::text || ')',
  updated_at = NOW()
FROM contrats_recents cr
WHERE 
  i.profil_id = cr.profil_id
  AND i.type = 'contrat_expire'
  AND i.statut IN ('actif', 'expire')
  AND i.date_expiration_originale < cr.date_debut
  AND cr.date_fin > CURRENT_DATE;

-- 4. Vérification : afficher les incidents résolus
SELECT 
  p.nom,
  p.prenom,
  i.type,
  i.statut,
  i.date_expiration_originale,
  i.date_resolution,
  i.notes
FROM incident i
JOIN profil p ON p.id = i.profil_id
WHERE i.date_resolution = CURRENT_DATE
  AND i.notes LIKE '%Résolu automatiquement%';
