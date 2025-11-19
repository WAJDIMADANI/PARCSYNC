/*
  # Nettoyage de la table vivier

  1. Problème résolu
    - Supprime les lignes de la table `vivier` dont le candidat a un statut différent de 'vivier'
    - Supprime les doublons basés sur le même `candidat_id`

  2. Actions
    - Suppression des candidats qui ne sont plus en statut 'vivier'
    - Conservation uniquement de la ligne la plus récente en cas de doublon
*/

-- Étape 1 : Supprimer les entrées vivier dont le statut candidat n'est PAS 'vivier'
DELETE FROM vivier
WHERE candidat_id IN (
  SELECT id FROM candidat
  WHERE statut_candidature != 'vivier'
);

-- Étape 2 : Supprimer les doublons (garder seulement la ligne la plus récente par candidat_id)
DELETE FROM vivier a
USING vivier b
WHERE a.candidat_id = b.candidat_id
  AND a.id < b.id;
