-- ====================================================
-- COPIEZ ET EXÉCUTEZ CETTE LIGNE DANS SUPABASE
-- ====================================================

ALTER TABLE contrat DROP CONSTRAINT IF EXISTS ux_contrat_one_base_per_group CASCADE;

-- ====================================================
-- C'EST TOUT ! RAFRAÎCHISSEZ VOTRE APPLICATION
-- ====================================================
