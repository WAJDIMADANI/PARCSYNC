/*
  # CORRECTION DIRECTE DU CONTRAT DE WAJDI

  Ce script corrige directement le contrat de Wajdi.
  À utiliser pour tester rapidement si la correction fonctionne.
*/

-- ========================================
-- 1. D'ABORD: Vérifier la contrainte CHECK
-- ========================================
-- Si vous obtenez une erreur "contrat_statut_check",
-- exécutez D'ABORD: fix-contrat-statut-constraint.sql

-- ========================================
-- 2. CORRECTION DIRECTE
-- ========================================

-- Correction du contrat de Wajdi (ID: 4ce63c31-c775-4e50-98a4-d27966fccecc)
UPDATE contrat
SET
  type = COALESCE(
    (variables->>'type_contrat'),
    'CDD'  -- Par défaut CDD si non trouvé
  ),
  date_debut = COALESCE(
    (variables->>'date_debut')::date,
    '2025-10-21'::date  -- Date de created_at visible dans l'erreur
  ),
  date_fin = COALESCE(
    (variables->>'date_fin')::date,
    '2026-07-03'::date  -- Date visible dans l'erreur
  ),
  statut = 'actif'  -- Changer 'valide' → 'actif'
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';

-- ========================================
-- 3. VÉRIFICATION
-- ========================================
SELECT
  '=== RÉSULTAT DE LA CORRECTION ===' as titre,
  type,
  date_debut,
  date_fin,
  statut,
  CASE
    WHEN type = 'CDD' THEN '✅'
    WHEN type = 'cdd' THEN '✅'
    ELSE '❌ Type doit être CDD'
  END as check_type,
  CASE
    WHEN date_fin IS NOT NULL THEN '✅'
    ELSE '❌ Date fin manquante'
  END as check_date_fin,
  CASE
    WHEN statut = 'actif' THEN '✅'
    ELSE '❌ Statut doit être actif'
  END as check_statut
FROM contrat
WHERE id = '4ce63c31-c775-4e50-98a4-d27966fccecc';
