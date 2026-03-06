-- DIAGNOSTIC COMPLET : RDV VISITE MEDICALE
-- À exécuter dans le SQL Editor de Supabase

-- 1. Vérifier TOUTES les notifications RDV
SELECT
  id,
  titre,
  type,
  statut,
  lu,
  created_at,
  utilisateur_id,
  reference_id,
  reference_type
FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC;

-- 2. Compter les RDV par statut
SELECT
  statut,
  COUNT(*) as nombre,
  COUNT(CASE WHEN lu THEN 1 END) as lus,
  COUNT(CASE WHEN NOT lu THEN 1 END) as non_lus
FROM inbox
WHERE type = 'rdv_visite_medicale'
GROUP BY statut;

-- 3. Compter le TOTAL
SELECT
  COUNT(*) as total_rdv_visite_medicale
FROM inbox
WHERE type = 'rdv_visite_medicale';

-- 4. Vérifier tous les types de notifications
SELECT
  type,
  COUNT(*) as nombre
FROM inbox
GROUP BY type
ORDER BY nombre DESC;

-- 5. Vérifier si certaines notifications ont un type NULL ou différent
SELECT
  id,
  titre,
  type,
  statut,
  created_at
FROM inbox
WHERE titre ILIKE '%visite%médicale%'
   OR titre ILIKE '%rdv%'
   OR description ILIKE '%visite%médicale%'
ORDER BY created_at DESC;
