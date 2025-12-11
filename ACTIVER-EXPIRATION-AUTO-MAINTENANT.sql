-- SCRIPT RAPIDE : Activer le système d'expiration automatique
-- Copiez-collez ce script dans Supabase SQL Editor et exécutez-le

-- 1. Modifier la contrainte CHECK pour ajouter le statut "expire"
ALTER TABLE incident DROP CONSTRAINT IF EXISTS incident_statut_check;
ALTER TABLE incident ADD CONSTRAINT incident_statut_check
  CHECK (statut IN ('actif', 'en_cours', 'resolu', 'ignore', 'expire'));

-- 2. Créer la fonction de détection et mise à jour automatique
CREATE OR REPLACE FUNCTION detect_and_expire_incidents()
RETURNS TABLE(
  incident_id uuid,
  profil_id uuid,
  ancien_statut text,
  nouveau_statut text,
  date_expiration date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  incident_record RECORD;
  user_id uuid;
BEGIN
  SELECT id INTO user_id
  FROM app_utilisateur
  WHERE email = 'system@rh-app.com'
  LIMIT 1;

  IF user_id IS NULL THEN
    user_id := NULL;
  END IF;

  FOR incident_record IN
    SELECT
      i.id,
      i.profil_id,
      i.statut,
      i.date_expiration_originale,
      i.type
    FROM incident i
    WHERE i.statut = 'actif'
      AND i.date_expiration_originale IS NOT NULL
      AND i.date_expiration_originale < CURRENT_DATE
      AND i.type IN ('contrat_cdd', 'avenant_1', 'avenant_2')
  LOOP
    UPDATE incident
    SET
      statut = 'expire',
      updated_at = NOW()
    WHERE id = incident_record.id;

    INSERT INTO incident_historique (
      incident_id,
      action,
      ancien_statut,
      nouveau_statut,
      notes,
      effectue_par
    ) VALUES (
      incident_record.id,
      'changement_statut',
      incident_record.statut,
      'expire',
      'Statut changé automatiquement : date d''expiration passée',
      user_id
    );

    incident_id := incident_record.id;
    profil_id := incident_record.profil_id;
    ancien_statut := incident_record.statut;
    nouveau_statut := 'expire';
    date_expiration := incident_record.date_expiration_originale;

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

-- 3. Appliquer immédiatement à tous les incidents existants
SELECT * FROM detect_and_expire_incidents();

-- 4. Vérification : Compter les incidents expirés
SELECT COUNT(*) as nombre_incidents_expires
FROM incident
WHERE statut = 'expire';
