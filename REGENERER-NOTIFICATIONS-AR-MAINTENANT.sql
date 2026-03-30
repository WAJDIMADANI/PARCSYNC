/*
  # COMMANDE RAPIDE - Régénérer les notifications A&R

  Après avoir appliqué la correction de la fonction,
  exécutez cette commande pour générer immédiatement
  les notifications pour les absences se terminant aujourd'hui.
*/

-- Générer les notifications A&R maintenant
SELECT generate_ar_fin_absence_notifications();

-- Afficher les notifications créées
SELECT
  COUNT(*) as notifications_creees,
  COUNT(DISTINCT reference_id) as absences_uniques,
  COUNT(DISTINCT utilisateur_id) as destinataires
FROM inbox
WHERE type = 'ar_fin_absence'
  AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute';
