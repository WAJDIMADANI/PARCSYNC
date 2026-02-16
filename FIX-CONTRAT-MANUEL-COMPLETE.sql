/*
  # FIX COMPLET : Erreur 400 lors de l'ajout de contrat manuel

  ## Problème
  Erreur 400 lors de l'insertion d'un contrat manuel depuis le modal.

  ## Solutions appliquées
  1. Rendre modele_id nullable (pour les contrats manuels sans modèle)
  2. S'assurer que toutes les colonnes nécessaires existent
  3. Vérifier les contraintes CHECK sur le statut
  4. Vérifier les policies RLS
*/

-- 1. Rendre modele_id nullable (important pour les contrats manuels)
ALTER TABLE contrat ALTER COLUMN modele_id DROP NOT NULL;

-- 2. Ajouter les colonnes manquantes si elles n'existent pas
DO $$
BEGIN
  -- Colonne type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'type'
  ) THEN
    ALTER TABLE contrat ADD COLUMN type text;
  END IF;

  -- Colonne date_debut
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'date_debut'
  ) THEN
    ALTER TABLE contrat ADD COLUMN date_debut date;
  END IF;

  -- Colonne date_fin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'date_fin'
  ) THEN
    ALTER TABLE contrat ADD COLUMN date_fin date;
  END IF;

  -- Colonne source
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'source'
  ) THEN
    ALTER TABLE contrat ADD COLUMN source text;
  END IF;

  -- Colonne yousign_signature_request_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contrat' AND column_name = 'yousign_signature_request_id'
  ) THEN
    ALTER TABLE contrat ADD COLUMN yousign_signature_request_id text;
  END IF;
END $$;

-- 3. Mettre à jour la contrainte CHECK pour accepter 'signe'
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_statut_check;
ALTER TABLE contrat ADD CONSTRAINT contrat_statut_check
  CHECK (statut IS NULL OR statut IN ('envoye', 'en_attente_signature', 'signe', 'valide', 'actif', 'expire', 'refuse'));

-- 4. Vérifier les policies RLS (s'assurer qu'elles permettent l'insertion)
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON contrat;
CREATE POLICY "Authenticated users can insert contracts"
  ON contrat FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view contracts" ON contrat;
CREATE POLICY "Authenticated users can view contracts"
  ON contrat FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update contracts" ON contrat;
CREATE POLICY "Authenticated users can update contracts"
  ON contrat FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Vérification finale
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contrat'
  AND column_name IN (
    'profil_id',
    'modele_id',
    'fichier_signe_url',
    'statut',
    'date_signature',
    'variables',
    'yousign_signature_request_id',
    'source'
  )
ORDER BY column_name;

-- Afficher la contrainte CHECK actuelle
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'contrat'
  AND con.contype = 'c';
