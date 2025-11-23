/*
  # Setup automatic daily execution of notification generation

  1. Configuration
    - Enables pg_cron extension
    - Schedules generate_expiration_notifications() to run daily at 6 AM
    - Job name: 'generate-notifications-daily'

  2. Notes
    - If pg_cron is not available in your Supabase plan, you can:
      a) Manually run: SELECT generate_expiration_notifications();
      b) Create an Edge Function with scheduled execution
      c) Use external cron service to call an Edge Function
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily execution at 6 AM
SELECT cron.schedule(
  'generate-notifications-daily',
  '0 6 * * *',
  $$ SELECT generate_expiration_notifications(); $$
);

-- To view scheduled jobs, run:
-- SELECT * FROM cron.job;

-- To unschedule this job, run:
-- SELECT cron.unschedule('generate-notifications-daily');
