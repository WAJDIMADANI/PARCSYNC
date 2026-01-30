/*
  # Ajouter colonne source à la table candidat

  1. Modifications
    - Ajoute une colonne `source` (text) à la table `candidat`
    - Valeur par défaut : 'apply'
    - Valeurs possibles : 'apply' (lien habituel) ou 'applysite' (nouveau lien)

  2. But
    - Permet de différencier l'origine des candidatures
    - Les candidatures depuis /applysite auront une couleur orange dans le tableau
*/

-- Ajouter la colonne source à la table candidat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidat' AND column_name = 'source'
  ) THEN
    ALTER TABLE candidat
    ADD COLUMN source text DEFAULT 'apply';
  END IF;
END $$;

-- Mettre à jour les candidats existants avec la source par défaut
UPDATE candidat
SET source = 'apply'
WHERE source IS NULL;
