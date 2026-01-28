/*
  # Ajout du système de soft delete pour la table profil

  ## Objectif
  Permettre l'archivage des profils au lieu de la suppression réelle pour :
  - Préserver l'historique des emails (crm_email_recipients référence profil_id)
  - Permettre la recréation d'un profil avec le même email (candidat → salarié)

  ## Modifications

  1. Nouvelle colonne
    - `deleted_at` (timestamptz, nullable) : date d'archivage du profil

  2. Index
    - Index sur `deleted_at` pour améliorer les performances des requêtes

  3. Contrainte d'unicité
    - Suppression de la contrainte unique globale sur email (si elle existe)
    - Création d'un index unique partiel : email unique SEULEMENT pour les profils actifs (deleted_at IS NULL)
    - Cela permet d'avoir plusieurs profils archivés avec le même email, mais un seul profil actif par email

  ## Sécurité
    - Les RLS policies existantes restent en place
    - Le soft delete n'affecte pas la sécurité, juste la visibilité des données
*/

-- Ajouter la colonne deleted_at
ALTER TABLE public.profil
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Créer un index sur deleted_at pour améliorer les performances des requêtes de filtrage
CREATE INDEX IF NOT EXISTS profil_deleted_at_idx
ON public.profil(deleted_at);

-- Supprimer la contrainte unique existante sur email si elle existe
DO $$
DECLARE
  constraint_name_var text;
BEGIN
  -- Chercher la contrainte unique sur email
  SELECT tc.constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'profil'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name = 'email';

  -- Si trouvée, la supprimer
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profil DROP CONSTRAINT ' || constraint_name_var || ';';
    RAISE NOTICE 'Contrainte % supprimée', constraint_name_var;
  ELSE
    RAISE NOTICE 'Aucune contrainte unique sur email trouvée';
  END IF;
END $$;

-- Créer un index unique partiel : email unique SEULEMENT pour les profils actifs (non archivés)
-- Cela permet d'avoir plusieurs profils archivés avec le même email, mais un seul actif
DROP INDEX IF EXISTS profil_email_unique_active;
CREATE UNIQUE INDEX profil_email_unique_active
ON public.profil(LOWER(email))
WHERE deleted_at IS NULL;

-- Ajouter un commentaire sur la colonne pour documenter son utilisation
COMMENT ON COLUMN public.profil.deleted_at IS
'Date d''archivage du profil (soft delete). NULL = profil actif. Permet de conserver l''historique des emails tout en permettant la recréation d''un profil avec le même email.';

-- Vérification
SELECT 'Migration terminée avec succès!' as status;
SELECT COUNT(*) as profils_actifs FROM public.profil WHERE deleted_at IS NULL;
SELECT COUNT(*) as profils_archives FROM public.profil WHERE deleted_at IS NOT NULL;
