/*
  # Configuration de l'automatisation d'emails pour l'embauche

  ## Objectif
  Envoyer automatiquement un email d'invitation au formulaire d'onboarding
  quand un candidat passe au statut "À embaucher"

  ## Composants
  1. Fonction pour appeler l'Edge Function d'envoi d'email
  2. Trigger sur la table candidates pour détecter les changements de statut
  3. Table pour tracer les emails envoyés

  ## Important
  Avant d'exécuter ce script, vous devez :
  1. Déployer l'Edge Function "send-onboarding-email" depuis le dossier supabase/functions/
  2. Configurer la variable d'environnement BREVO_API_KEY dans Supabase
*/

-- Table pour tracer les emails envoyés
CREATE TABLE IF NOT EXISTS onboarding_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  email text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent',
  message_id text,
  error text
);

ALTER TABLE onboarding_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view onboarding emails"
  ON onboarding_emails FOR SELECT
  TO authenticated
  USING (true);

-- Fonction pour appeler l'Edge Function d'envoi d'email
CREATE OR REPLACE FUNCTION send_onboarding_email_trigger()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  supabase_url text;
  anon_key text;
  request_body json;
  response_status int;
  response_body text;
BEGIN
  -- Vérifier si le statut a changé vers "À embaucher"
  IF NEW.status = 'À embaucher' AND (OLD.status IS NULL OR OLD.status != 'À embaucher') THEN

    -- Construire l'URL de l'Edge Function
    supabase_url := current_setting('app.settings.supabase_url', true);
    IF supabase_url IS NULL OR supabase_url = '' THEN
      supabase_url := 'https://jnlvinwekqvkrywxrjgr.supabase.co';
    END IF;

    function_url := supabase_url || '/functions/v1/send-onboarding-email';

    -- Préparer le corps de la requête
    request_body := json_build_object(
      'candidateEmail', NEW.email,
      'candidateName', NEW.nom || ' ' || NEW.prenom,
      'candidateId', NEW.id::text
    );

    -- Note : Dans un trigger PostgreSQL, on ne peut pas faire d'appels HTTP directs
    -- Cette fonction doit être appelée depuis votre application frontend
    -- ou via un webhook Supabase Realtime

    -- Pour l'instant, on enregistre juste qu'un email doit être envoyé
    INSERT INTO onboarding_emails (candidate_id, email, status)
    VALUES (NEW.id, NEW.email, 'pending')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Onboarding email should be sent to: %', NEW.email;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_send_onboarding_email ON candidates;
CREATE TRIGGER trigger_send_onboarding_email
  AFTER UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION send_onboarding_email_trigger();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_onboarding_emails_candidate_id ON onboarding_emails(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_emails_status ON onboarding_emails(status);

-- Commentaire explicatif
COMMENT ON TABLE onboarding_emails IS 'Trace tous les emails d''onboarding envoyés aux candidats';
COMMENT ON FUNCTION send_onboarding_email_trigger() IS 'Déclenche l''envoi d''un email quand un candidat passe au statut À embaucher';
