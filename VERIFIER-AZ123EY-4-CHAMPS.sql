-- Vérifier les 4 champs pour AZ123EY
SELECT
  immatriculation,
  ref_tca,
  marque,
  modele,
  finition,
  energie,
  couleur,
  mode_acquisition,
  fournisseur,
  created_at
FROM vehicule
WHERE immatriculation = 'AZ123EY';
