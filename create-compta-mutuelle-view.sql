/*
  # Vue Comptabilité Mutuelle

  ## Description
    Vue pour afficher les salariés avec leur date d'effectivité de mutuelle

  ## Colonnes
    - profil_id: ID du profil
    - nom: Nom du salarié
    - prenom: Prénom du salarié
    - mutuelle_effective_since: Date d'effectivité de la mutuelle

  ## Usage
    Utilisée dans le module Comptabilité > Mutuelle pour suivre les dates d'effectivité
*/

-- Supprimer la vue si elle existe déjà
DROP VIEW IF EXISTS public.v_compta_mutuelle;

-- Créer la vue
CREATE OR REPLACE VIEW public.v_compta_mutuelle AS
SELECT
  p.id AS profil_id,
  p.nom,
  p.prenom,
  p.mutuelle_effective_since
FROM profil p
WHERE p.deleted_at IS NULL
  AND p.mutuelle_effective_since IS NOT NULL
ORDER BY p.mutuelle_effective_since DESC;

-- Ajouter un commentaire
COMMENT ON VIEW public.v_compta_mutuelle IS 'Vue des salariés avec leur date d''effectivité de mutuelle';

-- Vérifier que la vue fonctionne
SELECT COUNT(*) as total_salaries_avec_mutuelle
FROM public.v_compta_mutuelle;

-- Afficher un aperçu
SELECT *
FROM public.v_compta_mutuelle
LIMIT 10;
