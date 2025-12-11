/*
  ╔════════════════════════════════════════════════════════════════════╗
  ║  INSTALLATION COMPLÈTE DU SYSTÈME D'EXPIRATION                    ║
  ║                                                                    ║
  ║  Ce script installe TOUT le système nécessaire:                   ║
  ║    1. Table notification                                           ║
  ║    2. Table incident                                               ║
  ║    3. Fonction de génération d'incidents                          ║
  ║    4. Cron job automatique                                         ║
  ║    5. Vue pour les contrats CDD                                   ║
  ╚════════════════════════════════════════════════════════════════════╝
*/

-- ========================================
-- 1. CRÉER LA TABLE NOTIFICATION
-- ========================================

CREATE TABLE IF NOT EXISTS notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('titre_sejour', 'visite_medicale', 'permis_conduire', 'contrat_cdd', 'contrat_cdd_expire')),
  titre text,
  message text,
  profil_id uuid REFERENCES profil(id) ON DELETE CASCADE,
  date_echeance date NOT NULL,
  date_notification date NOT NULL DEFAULT CURRENT_DATE,
  statut text DEFAULT 'active' CHECK (statut IN ('active', 'email_envoye', 'resolue', 'ignoree')),
  email_envoye_at timestamptz,
  email_envoye_par uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_profil ON notification(profil_id);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type);
CREATE INDEX IF NOT EXISTS idx_notification_statut ON notification(statut);
CREATE INDEX IF NOT EXISTS idx_notification_date ON notification(date_notification);

-- RLS
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated users" ON notification;
CREATE POLICY "Allow read for authenticated users" ON notification
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON notification;
CREATE POLICY "Allow insert for authenticated users" ON notification
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON notification;
CREATE POLICY "Allow update for authenticated users" ON notification
  FOR UPDATE TO authenticated USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_updated_at ON notification;
CREATE TRIGGER notification_updated_at
  BEFORE UPDATE ON notification
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- ========================================
-- 2. CRÉER LA TABLE INCIDENT
-- ========================================

CREATE TABLE IF NOT EXISTS incident (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('titre_sejour', 'visite_medicale', 'permis_conduire', 'contrat_cdd', 'contrat_expire')),
  titre text,
  profil_id uuid NOT NULL REFERENCES profil(id) ON DELETE CASCADE,
  date_expiration_originale date NOT NULL,
  date_creation_incident date NOT NULL DEFAULT CURRENT_DATE,
  statut text DEFAULT 'actif' CHECK (statut IN ('actif', 'en_cours', 'resolu', 'ignore')),
  date_changement_statut timestamptz DEFAULT now(),
  date_resolution timestamptz,
  ancienne_date_validite date,
  nouvelle_date_validite date,
  resolu_par uuid,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_incident_profil ON incident(profil_id);
CREATE INDEX IF NOT EXISTS idx_incident_statut ON incident(statut);
CREATE INDEX IF NOT EXISTS idx_incident_type ON incident(type);
CREATE INDEX IF NOT EXISTS idx_incident_date_creation ON incident(date_creation_incident);

-- RLS
ALTER TABLE incident ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated users" ON incident;
CREATE POLICY "Allow read for authenticated users" ON incident
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON incident;
CREATE POLICY "Allow insert for authenticated users" ON incident
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON incident;
CREATE POLICY "Allow update for authenticated users" ON incident
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON incident;
CREATE POLICY "Allow delete for authenticated users" ON incident
  FOR DELETE TO authenticated USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_incident_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incident_updated_at ON incident;
CREATE TRIGGER incident_updated_at
  BEFORE UPDATE ON incident
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_updated_at();

-- Lien bidirectionnel
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification' AND column_name = 'incident_id'
  ) THEN
    ALTER TABLE notification ADD COLUMN incident_id uuid REFERENCES incident(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_notification_incident ON notification(incident_id);
  END IF;
END $$;

-- ========================================
-- 3. FONCTION DE GÉNÉRATION D'INCIDENTS
-- ========================================

CREATE OR REPLACE FUNCTION generate_daily_expired_incidents()
RETURNS TABLE(
  incidents_created INTEGER,
  notifications_created INTEGER
) AS $$
DECLARE
  v_incidents_created INTEGER := 0;
  v_notifications_created INTEGER := 0;
  v_contrat RECORD;
  v_incident_id uuid;
BEGIN
  -- Parcourir tous les contrats CDD qui expirent AUJOURD'HUI
  FOR v_contrat IN
    SELECT
      c.id as contrat_id,
      c.profil_id,
      c.date_fin,
      c.type,
      p.prenom,
      p.nom,
      p.matricule_tca
    FROM contrat c
    JOIN profil p ON c.profil_id = p.id
    WHERE c.type = 'CDD'
      AND c.date_fin = CURRENT_DATE
      AND c.statut = 'actif'
      AND NOT EXISTS (
        SELECT 1 FROM incident i
        WHERE i.profil_id = c.profil_id
          AND i.type = 'contrat_expire'
          AND i.date_expiration_originale = c.date_fin
      )
  LOOP
    -- Créer l'incident
    INSERT INTO incident (
      type,
      titre,
      profil_id,
      date_expiration_originale,
      date_creation_incident,
      statut,
      metadata
    ) VALUES (
      'contrat_expire',
      'Contrat CDD expiré',
      v_contrat.profil_id,
      v_contrat.date_fin,
      CURRENT_DATE,
      'actif',
      jsonb_build_object(
        'contrat_id', v_contrat.contrat_id,
        'matricule', v_contrat.matricule_tca,
        'auto_generated', true
      )
    )
    RETURNING id INTO v_incident_id;

    v_incidents_created := v_incidents_created + 1;

    -- Créer la notification
    INSERT INTO notification (
      type,
      titre,
      message,
      profil_id,
      date_echeance,
      date_notification,
      statut,
      incident_id,
      metadata
    ) VALUES (
      'contrat_cdd_expire',
      'Contrat CDD expire',
      format('Le contrat CDD de %s %s (matricule: %s) expire le %s',
        v_contrat.prenom,
        v_contrat.nom,
        v_contrat.matricule_tca,
        to_char(v_contrat.date_fin, 'DD/MM/YYYY')
      ),
      v_contrat.profil_id,
      v_contrat.date_fin,
      CURRENT_DATE,
      'active',
      v_incident_id,
      jsonb_build_object(
        'contrat_id', v_contrat.contrat_id,
        'matricule', v_contrat.matricule_tca,
        'auto_generated', true
      )
    );

    v_notifications_created := v_notifications_created + 1;

  END LOOP;

  RETURN QUERY SELECT v_incidents_created, v_notifications_created;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. CRÉER LE CRON JOB
-- ========================================

-- Activer l'extension pg_cron si nécessaire
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer l'ancien job s'il existe
SELECT cron.unschedule('check-expired-contracts-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-expired-contracts-daily'
);

-- Créer le cron job qui s'exécute tous les jours à minuit
SELECT cron.schedule(
  'check-expired-contracts-daily',
  '0 0 * * *',  -- Tous les jours à 00:00
  $$SELECT generate_daily_expired_incidents();$$
);

-- ========================================
-- 5. VUE POUR LES CONTRATS CDD
-- ========================================

CREATE OR REPLACE VIEW contrats_cdd_expirant_bientot AS
SELECT
  c.id,
  c.profil_id,
  p.matricule_tca,
  p.prenom,
  p.nom,
  c.type,
  c.date_debut,
  c.date_fin,
  c.statut,
  c.date_fin - CURRENT_DATE as jours_restants,
  CASE
    WHEN c.date_fin < CURRENT_DATE THEN 'expiré'
    WHEN c.date_fin = CURRENT_DATE THEN 'expire_aujourd_hui'
    WHEN c.date_fin <= CURRENT_DATE + INTERVAL '30 days' THEN 'expire_bientot'
    ELSE 'ok'
  END as alerte_niveau
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE c.type = 'CDD'
  AND c.statut = 'actif'
  AND c.date_fin <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY c.date_fin ASC;

-- ========================================
-- MESSAGES FINAUX
-- ========================================

DO $$
DECLARE
  v_notification_count INTEGER;
  v_incident_count INTEGER;
  v_cron_count INTEGER;
BEGIN
  -- Vérifier les tables
  SELECT COUNT(*) INTO v_notification_count FROM notification LIMIT 1;
  SELECT COUNT(*) INTO v_incident_count FROM incident LIMIT 1;

  -- Vérifier le cron job
  SELECT COUNT(*) INTO v_cron_count FROM cron.job WHERE jobname = 'check-expired-contracts-daily';

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  INSTALLATION TERMINÉE !                                  ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table notification créée';
  RAISE NOTICE '✅ Table incident créée';
  RAISE NOTICE '✅ Fonction generate_daily_expired_incidents() créée';
  RAISE NOTICE '✅ Vue contrats_cdd_expirant_bientot créée';

  IF v_cron_count > 0 THEN
    RAISE NOTICE '✅ Cron job configuré (tous les jours à minuit)';
  ELSE
    RAISE NOTICE '⚠️  Cron job non créé - vérifier pg_cron';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Vous pouvez maintenant exécuter:';
  RAISE NOTICE '  TEST-EXPIRATION-CONTRAT-WAJDI-MAINTENANT-FIXE.sql';
  RAISE NOTICE '';
END $$;
