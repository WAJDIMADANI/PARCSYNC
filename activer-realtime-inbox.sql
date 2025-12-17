/*
  Activer Realtime pour Inbox

  Active les notifications en temps réel pour que les tâches
  se mettent à jour automatiquement quand quelqu'un répond.
*/

-- Activer Realtime pour la table taches
ALTER PUBLICATION supabase_realtime ADD TABLE taches;

-- Activer Realtime pour la table taches_messages
ALTER PUBLICATION supabase_realtime ADD TABLE taches_messages;

SELECT '✅ REALTIME ACTIVÉ !' as resultat;
SELECT 'Les tâches se mettront maintenant à jour automatiquement' as info;
SELECT 'Quand quelqu''un répond, la ligne deviendra en gras instantanément' as info2;
