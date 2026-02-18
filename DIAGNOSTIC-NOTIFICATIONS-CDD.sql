-- Diagnostic complet : Notifications vs Incidents

-- 1. Vérifier si la table notification existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'notification'
) as table_notification_existe;

-- 2. Voir la structure de la table notification (si elle existe)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notification'
ORDER BY ordinal_position;

-- 3. Compter les notifications par type
SELECT type, COUNT(*) as count
FROM notification
GROUP BY type;

-- 4. Voir les 5 dernières notifications
SELECT 
  type,
  profil_id,
  date_echeance,
  statut,
  created_at
FROM notification
ORDER BY created_at DESC
LIMIT 5;

-- 5. Vérifier s'il existe une fonction pour générer les notifications
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name ILIKE '%notification%'
  AND routine_schema = 'public';

-- 6. Vérifier s'il existe un trigger pour créer des notifications automatiquement
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name ILIKE '%notification%';
