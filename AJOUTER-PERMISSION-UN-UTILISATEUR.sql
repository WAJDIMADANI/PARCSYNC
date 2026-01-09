/*
  # Ajouter la permission Comptabilité à UN utilisateur spécifique

  Remplacez 'votre.email@example.com' par l'email de l'utilisateur
*/

-- REMPLACEZ L'EMAIL ICI
DO $$
DECLARE
  user_email TEXT := 'votre.email@example.com';  -- ⬅️ CHANGEZ CETTE VALEUR
  user_id UUID;
BEGIN
  -- Trouver l'ID de l'utilisateur
  SELECT id INTO user_id
  FROM app_utilisateur
  WHERE email = user_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur avec email % non trouvé', user_email;
  END IF;

  -- Ajouter la permission globale "comptabilite"
  INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
  VALUES (user_id, 'comptabilite', true)
  ON CONFLICT (utilisateur_id, section_id)
  DO UPDATE SET actif = true;

  -- Ajouter toutes les permissions compta/* individuelles
  INSERT INTO utilisateur_permissions (utilisateur_id, section_id, actif)
  SELECT
    user_id,
    unnest(ARRAY[
      'compta/entrees',
      'compta/sorties',
      'compta/rib',
      'compta/adresse',
      'compta/avenants',
      'compta/mutuelle',
      'compta/ar',
      'compta/avance-frais'
    ]),
    true
  ON CONFLICT (utilisateur_id, section_id)
  DO UPDATE SET actif = true;

  RAISE NOTICE 'Permissions comptabilité ajoutées pour %', user_email;
END $$;

-- Vérifier les permissions de l'utilisateur
SELECT
  au.email,
  up.section_id,
  up.actif,
  up.created_at
FROM utilisateur_permissions up
JOIN app_utilisateur au ON up.utilisateur_id = au.id
WHERE au.email = 'votre.email@example.com'  -- ⬅️ CHANGEZ CETTE VALEUR
  AND up.section_id LIKE '%compta%'
ORDER BY up.section_id;
