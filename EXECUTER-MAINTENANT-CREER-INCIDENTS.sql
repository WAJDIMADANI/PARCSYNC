/*
  ⚡ CORRECTION URGENTE - Créer les incidents manquants

  PROBLÈME:
  - Le tableau de bord affiche 2 titres de séjour et 17 visites médicales expirés
  - Mais la page "Incidents" est vide

  CAUSE:
  - Les notifications existent dans la table "notification"
  - Mais les incidents n'existent pas dans la table "incident"

  SOLUTION:
  - Exécuter cette requête pour créer tous les incidents manquants

  📋 INSTRUCTIONS:
  1. Copier tout le contenu de ce fichier
  2. Aller dans Supabase SQL Editor
  3. Coller et exécuter
  4. Actualiser la page Incidents
*/

-- Exécuter la fonction de backfill qui crée tous les incidents manquants
SELECT backfill_existing_expired_documents();

-- Vérifier le résultat
SELECT
  type,
  statut,
  COUNT(*) as nombre
FROM incident
GROUP BY type, statut
ORDER BY type, statut;

/*
  ✅ Résultat attendu:
  - titre_sejour: 2 incidents
  - visite_medicale: 17 incidents
  - Tous avec statut = 'actif'

  Ensuite, actualisez la page "Gestion des incidents"
  et vous verrez tous les incidents !
*/
