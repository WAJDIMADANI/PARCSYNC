/*
  # Ajouter les permissions de suppression pour les candidats et leurs documents

  1. Modifications
    - Ajoute une politique DELETE pour la table candidat
    - Ajoute une politique DELETE pour la table document (documents des candidats)
    - Permet aux utilisateurs avec permission "gerer_candidatures" de supprimer

  2. Sécurité
    - Vérifie que l'utilisateur a la permission appropriée
    - Permet la suppression en cascade des documents liés
*/

-- Policy DELETE pour la table candidat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'candidat'
    AND policyname = 'Utilisateurs avec permission peuvent supprimer candidats'
  ) THEN
    CREATE POLICY "Utilisateurs avec permission peuvent supprimer candidats"
      ON candidat
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM app_utilisateur au
          JOIN app_permission ap ON au.role = ap.role
          WHERE au.user_id = auth.uid()
          AND ap.permission = 'gerer_candidatures'
        )
      );
  END IF;
END $$;

-- Policy DELETE pour la table document (pour supprimer les documents des candidats)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'document'
    AND policyname = 'Utilisateurs avec permission peuvent supprimer documents candidats'
  ) THEN
    CREATE POLICY "Utilisateurs avec permission peuvent supprimer documents candidats"
      ON document
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM app_utilisateur au
          JOIN app_permission ap ON au.role = ap.role
          WHERE au.user_id = auth.uid()
          AND (ap.permission = 'gerer_candidatures' OR ap.permission = 'gerer_salaries')
        )
      );
  END IF;
END $$;
