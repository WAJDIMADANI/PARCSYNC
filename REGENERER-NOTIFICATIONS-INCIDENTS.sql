/*
  RÉGÉNÉRATION DES NOTIFICATIONS ET INCIDENTS
  ============================================

  À exécuter si les notifications et incidents ne s'affichent pas correctement.

  ATTENTION: Ce script va :
  1. Générer les notifications manquantes pour les documents arrivant à échéance
  2. Générer les incidents manquants pour les documents expirés

  ÉTAPES:
  1. D'abord exécuter DIAGNOSTIC-NOTIFICATIONS-INCIDENTS.sql pour identifier le problème
  2. Puis exécuter ce script pour régénérer les notifications et incidents
*/

-- ========================================
-- 1. GÉNÉRER LES NOTIFICATIONS MANQUANTES
-- ========================================

SELECT '=== GÉNÉRATION DES NOTIFICATIONS ===' as action;

-- Cette fonction va scanner tous les profils et contrats et créer les notifications
-- pour les documents/contrats arrivant à échéance dans les 30/15 prochains jours
SELECT generate_expiration_notifications();

SELECT 'Notifications générées avec succès' as resultat;

-- ========================================
-- 2. GÉNÉRER LES INCIDENTS MANQUANTS
-- ========================================

SELECT '=== GÉNÉRATION DES INCIDENTS ===' as action;

-- Cette fonction va créer des incidents pour tous les documents qui ont expiré
-- Note: Par défaut, elle ne crée des incidents que pour les documents expirés AUJOURD'HUI
-- Pour générer rétroactivement, il faut utiliser la fonction ci-dessous

-- D'abord, générer les incidents pour aujourd'hui
SELECT generate_daily_expired_incidents();

-- ========================================
-- 3. BACKFILL - GÉNÉRER INCIDENTS RÉTROACTIFS (OPTIONNEL)
-- ========================================

SELECT '=== GÉNÉRATION RÉTROACTIVE DES INCIDENTS (si nécessaire) ===' as action;

-- Cette section va créer des incidents pour TOUS les documents déjà expirés
-- (pas seulement ceux d'aujourd'hui)

-- Titres de séjour expirés
INSERT INTO incident (
  type,
  profil_id,
  date_expiration_originale,
  date_creation_incident,
  statut,
  ancienne_date_validite,
  metadata
)
SELECT
  'titre_sejour',
  p.id,
  p.titre_sejour_fin_validite,
  CURRENT_DATE,
  'actif',
  p.titre_sejour_fin_validite,
  jsonb_build_object(
    'document', 'Titre de séjour',
    'auto_generated', true,
    'backfilled', true
  )
FROM profil p
WHERE p.titre_sejour_fin_validite IS NOT NULL
  AND p.titre_sejour_fin_validite < CURRENT_DATE
  AND p.statut = 'actif'
  AND NOT EXISTS (
    SELECT 1 FROM incident i
    WHERE i.profil_id = p.id
      AND i.type = 'titre_sejour'
      AND i.date_expiration_originale = p.titre_sejour_fin_validite
      AND i.statut IN ('actif', 'en_cours')
  );

-- Visites médicales expirées
INSERT INTO incident (
  type,
  profil_id,
  date_expiration_originale,
  date_creation_incident,
  statut,
  ancienne_date_validite,
  metadata
)
SELECT
  'visite_medicale',
  p.id,
  p.date_fin_visite_medicale,
  CURRENT_DATE,
  'actif',
  p.date_fin_visite_medicale,
  jsonb_build_object(
    'document', 'Visite médicale',
    'auto_generated', true,
    'backfilled', true
  )
FROM profil p
WHERE p.date_fin_visite_medicale IS NOT NULL
  AND p.date_fin_visite_medicale < CURRENT_DATE
  AND p.statut = 'actif'
  AND NOT EXISTS (
    SELECT 1 FROM incident i
    WHERE i.profil_id = p.id
      AND i.type = 'visite_medicale'
      AND i.date_expiration_originale = p.date_fin_visite_medicale
      AND i.statut IN ('actif', 'en_cours')
  );

-- Permis de conduire expirés
INSERT INTO incident (
  type,
  profil_id,
  date_expiration_originale,
  date_creation_incident,
  statut,
  ancienne_date_validite,
  metadata
)
SELECT
  'permis_conduire',
  p.id,
  p.permis_conduire_expiration,
  CURRENT_DATE,
  'actif',
  p.permis_conduire_expiration,
  jsonb_build_object(
    'document', 'Permis de conduire',
    'auto_generated', true,
    'backfilled', true
  )
FROM profil p
WHERE p.permis_conduire_expiration IS NOT NULL
  AND p.permis_conduire_expiration < CURRENT_DATE
  AND p.statut = 'actif'
  AND NOT EXISTS (
    SELECT 1 FROM incident i
    WHERE i.profil_id = p.id
      AND i.type = 'permis_conduire'
      AND i.date_expiration_originale = p.permis_conduire_expiration
      AND i.statut IN ('actif', 'en_cours')
  );

-- Contrats CDD expirés
INSERT INTO incident (
  type,
  profil_id,
  date_expiration_originale,
  date_creation_incident,
  statut,
  ancienne_date_validite,
  metadata
)
SELECT
  'contrat_cdd',
  c.profil_id,
  c.date_fin,
  CURRENT_DATE,
  'actif',
  c.date_fin,
  jsonb_build_object(
    'document', 'Contrat CDD',
    'contrat_id', c.id,
    'auto_generated', true,
    'backfilled', true
  )
FROM contrat c
JOIN profil p ON p.id = c.profil_id
WHERE c.type_contrat = 'CDD'
  AND c.date_fin IS NOT NULL
  AND c.date_fin < CURRENT_DATE
  AND c.statut = 'actif'
  AND p.statut = 'actif'
  AND NOT EXISTS (
    SELECT 1 FROM incident i
    WHERE i.profil_id = c.profil_id
      AND i.type = 'contrat_cdd'
      AND i.date_expiration_originale = c.date_fin
      AND i.statut IN ('actif', 'en_cours')
  );

SELECT 'Incidents rétroactifs générés avec succès' as resultat;

-- ========================================
-- 4. VÉRIFICATION FINALE
-- ========================================

SELECT '=== VÉRIFICATION FINALE ===' as action;

-- Compter les nouvelles notifications
SELECT
  type,
  statut,
  COUNT(*) as nombre
FROM notification
GROUP BY type, statut
ORDER BY type, statut;

-- Compter les nouveaux incidents
SELECT
  type,
  statut,
  COUNT(*) as nombre
FROM incident
GROUP BY type, statut
ORDER BY type, statut;

SELECT 'TERMINÉ - Les notifications et incidents ont été régénérés' as resultat;
