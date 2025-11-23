/*
  # Setup CRON Jobs for Incident System

  This script configures pg_cron jobs to automate the incident system:
  1. Daily generation of incidents for newly expired documents (6:00 AM)
  2. Daily sending of incident reminders (9:00 AM)

  Prerequisites:
    - pg_cron extension must be enabled
    - The functions generate_daily_expired_incidents() must exist
    - The Edge Function send-incident-reminders must be deployed

  Usage:
    Execute this script once in Supabase SQL Editor
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing jobs if they exist (for clean reinstall)
SELECT cron.unschedule('generate-daily-incidents') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-incidents'
);

SELECT cron.unschedule('send-incident-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-incident-reminders'
);

-- Schedule daily incident generation at 6:00 AM every day
-- This creates incidents for documents that expired today
SELECT cron.schedule(
  'generate-daily-incidents',
  '0 6 * * *',
  $$SELECT generate_daily_expired_incidents();$$
);

-- Schedule incident reminder emails at 9:00 AM every day
-- This sends reminders for incidents that are 7, 14, 21+ days old
SELECT cron.schedule(
  'send-incident-reminders',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-incident-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Verify scheduled jobs
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname IN ('generate-daily-incidents', 'send-incident-reminders');

/*
  Note: To manually test the jobs, you can run:

  -- Test incident generation
  SELECT generate_daily_expired_incidents();

  -- Test reminder sending (requires Edge Function deployed)
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-incident-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) as request_id;
*/

-- Set app settings if not already set (replace with your actual values)
-- Note: These should be set in Supabase Dashboard under Settings > Vault
DO $$
BEGIN
  -- These are placeholders - set actual values in Supabase Dashboard
  PERFORM set_config('app.supabase_url', current_setting('SUPABASE_URL', true), false);
  PERFORM set_config('app.supabase_anon_key', current_setting('SUPABASE_ANON_KEY', true), false);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not set app settings. Please configure manually in Supabase Dashboard.';
END $$;
