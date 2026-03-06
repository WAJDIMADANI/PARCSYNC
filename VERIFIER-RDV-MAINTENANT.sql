-- ============================================
-- VÉRIFIER LES RDV DANS LA BASE
-- ============================================

-- 1. Compter TOUS les messages avec "RDV" dans le titre
SELECT
  COUNT(*) as total,
  type,
  statut
FROM inbox
WHERE titre ILIKE '%rdv%visite%médicale%'
   OR titre ILIKE '%visite%médicale%'
GROUP BY type, statut
ORDER BY type, statut;

-- 2. Lister TOUS les RDV (même sans type)
SELECT
  id,
  type,
  titre,
  statut,
  lu,
  reference_type,
  reference_id,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as date_creation,
  utilisateur_id
FROM inbox
WHERE titre ILIKE '%rdv%visite%médicale%'
   OR titre ILIKE '%visite%médicale%'
ORDER BY created_at DESC;

-- 3. Vérifier spécifiquement pour Abdelali BENNI
SELECT
  i.id,
  i.type,
  i.titre,
  i.statut,
  i.lu,
  TO_CHAR(i.created_at, 'DD/MM/YYYY HH24:MI') as date_creation,
  p.prenom,
  p.nom,
  p.matricule_tca,
  p.visite_medicale_rdv_date,
  p.visite_medicale_rdv_heure
FROM inbox i
LEFT JOIN profil p ON i.reference_id = p.id
WHERE i.titre ILIKE '%BENNI%'
  AND i.titre ILIKE '%rdv%'
ORDER BY i.created_at DESC;

-- 4. Compter les RDV avec type correct vs sans type
SELECT
  'Avec type rdv_visite_medicale' as categorie,
  COUNT(*) as nombre
FROM inbox
WHERE type = 'rdv_visite_medicale'

UNION ALL

SELECT
  'Sans type ou type différent' as categorie,
  COUNT(*) as nombre
FROM inbox
WHERE (titre ILIKE '%rdv%visite%médicale%' OR titre ILIKE '%visite%médicale%')
  AND (type IS NULL OR type != 'rdv_visite_medicale')

UNION ALL

SELECT
  'Total RDV (par titre)' as categorie,
  COUNT(*) as nombre
FROM inbox
WHERE titre ILIKE '%rdv%visite%médicale%' OR titre ILIKE '%visite%médicale%';

-- ============================================
-- CORRECTION SI NÉCESSAIRE
-- ============================================

-- Si certains RDV n'ont pas le bon type, les corriger
UPDATE inbox
SET
  type = 'rdv_visite_medicale',
  updated_at = NOW()
WHERE (titre ILIKE '%rdv%visite%médicale%' OR titre ILIKE '%visite%médicale%')
  AND (type IS NULL OR type != 'rdv_visite_medicale');

-- Vérifier le résultat
SELECT
  COUNT(*) as total_apres_correction
FROM inbox
WHERE type = 'rdv_visite_medicale';

-- Lister tous les RDV après correction
SELECT
  id,
  type,
  titre,
  statut,
  lu,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as date_creation
FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC;
