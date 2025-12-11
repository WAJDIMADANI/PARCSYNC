/*
  # Système de gestion automatique des incidents expirés

  ## Description
  Ce système détecte automatiquement les incidents dont la date d'expiration est passée
  et les marque comme "expire". La détection se fait à chaque chargement de la page.

  ## Changements

  1. Ajout du statut "expire"
    - Nouveau statut pour les incidents dont la date_expiration_originale est passée
    - Les incidents expirés restent modifiables manuellement

  2. Fonction de détection automatique
    - `detect_and_expire_incidents()` : parcourt tous les incidents actifs
    - Vérifie si date_expiration_originale < date du jour
    - Change automatiquement le statut vers "expire"
    - Crée un historique de la modification

  3. Application aux incidents existants
    - Mise à jour de tous les incidents déjà créés
    - Détection rétroactive des dates expirées

  ## Notes importantes
  - Seuls les incidents avec statut "actif" sont vérifiés
  - Les autres statuts (en_cours, resolu, ignore) ne sont pas affectés
  - L'historique est conservé dans incident_historique
*/

-- 1. Ajouter le statut "expire" au type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'incident_statut' AND e.enumlabel = 'expire'
  ) THEN
    ALTER TYPE incident_statut ADD VALUE 'expire';
  END IF;
END $$;

-- 2. Créer la fonction de détection et mise à jour automatique
CREATE OR REPLACE FUNCTION detect_and_expire_incidents()
RETURNS TABLE(
  incident_id uuid,
  profil_id uuid,
  ancien_statut incident_statut,
  nouveau_statut incident_statut,
  date_expiration date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  incident_record RECORD;
  user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur système pour l'historique
  SELECT id INTO user_id
  FROM app_utilisateur
  WHERE email = 'system@rh-app.com'
  LIMIT 1;

  -- Si pas d'utilisateur système, utiliser NULL
  IF user_id IS NULL THEN
    user_id := NULL;
  END IF;

  -- Parcourir tous les incidents actifs avec une date d'expiration passée
  FOR incident_record IN
    SELECT
      i.id,
      i.profil_id,
      i.statut,
      i.date_expiration_originale,
      i.type_incident
    FROM incidents i
    WHERE i.statut = 'actif'
      AND i.date_expiration_originale IS NOT NULL
      AND i.date_expiration_originale < CURRENT_DATE
      AND i.type_incident IN ('contrat_cdd', 'avenant_1', 'avenant_2')
  LOOP
    -- Mettre à jour le statut vers "expire"
    UPDATE incidents
    SET
      statut = 'expire',
      updated_at = NOW()
    WHERE id = incident_record.id;

    -- Créer un historique de la modification
    INSERT INTO incident_historique (
      incident_id,
      ancien_statut,
      nouveau_statut,
      commentaire,
      modifie_par
    ) VALUES (
      incident_record.id,
      incident_record.statut,
      'expire',
      'Statut changé automatiquement : date d''expiration passée',
      user_id
    );

    -- Retourner les informations de l'incident modifié
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

-- 3. Appliquer la détection aux incidents existants (backfill)
SELECT * FROM detect_and_expire_incidents();

-- 4. Créer une politique RLS pour permettre l'appel de la fonction
CREATE POLICY "Authenticated users can detect expired incidents"
  ON incidents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Note: La fonction sera appelée depuis le frontend à chaque chargement de la page incidents
