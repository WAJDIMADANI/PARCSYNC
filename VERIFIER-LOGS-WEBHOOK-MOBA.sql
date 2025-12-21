/*
  Vérifier les logs du webhook YouSign pour Jean Marie MOBA-BIKOMBO

  Ce script recherche tous les événements webhook reçus récemment
*/

-- 1. Vérifier si une table de logs existe
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('email_logs', 'webhook_logs', 'yousign_logs');

-- 2. Si la table email_logs existe, chercher les événements de signature
SELECT
  created_at,
  event_type,
  recipient_email,
  status,
  error_message,
  signature_request_id
FROM email_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND (
    recipient_email ILIKE '%moba%'
    OR event_type ILIKE '%signature%'
  )
ORDER BY created_at DESC;

-- 3. Vérifier les contrats avec yousign_signature_request_id
SELECT
  c.id as contrat_id,
  c.type,
  c.statut,
  c.date_signature,
  c.yousign_signature_request_id,
  c.created_at,
  c.updated_at,
  p.nom,
  p.prenom,
  p.email
FROM contrat c
INNER JOIN profil p ON p.id = c.profil_id
WHERE p.nom ILIKE '%MOBA%'
  AND c.yousign_signature_request_id IS NOT NULL
ORDER BY c.created_at DESC;

-- 4. Chercher dans les logs edge functions (si disponibles)
-- Note: Ces logs sont généralement dans les logs de Supabase, pas dans une table
SELECT
  'Vérifiez les logs de la fonction edge yousign-webhook dans le dashboard Supabase' as instruction,
  'Allez dans : Edge Functions > yousign-webhook > Logs' as chemin,
  'Cherchez les événements avec signature_request.done pour MOBA' as recherche;
