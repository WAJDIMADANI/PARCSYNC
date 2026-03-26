/*
  # Ajout fréquence kilométrique pour maintenances

  1. Modifications table `maintenance`
    - Ajout de `frequence_km` (integer)
      Fréquence en kilomètres entre deux maintenances du même type
      Exemple : 10000 pour une vidange tous les 10 000 km

  2. Notes importantes
    - La colonne est nullable pour permettre la rétrocompatibilité
    - Permet de planifier les maintenances préventives
    - Utilisée avec `prochain_controle_km` pour calculer les alertes
*/

-- Ajout de la colonne dans la table maintenance
ALTER TABLE maintenance
ADD COLUMN IF NOT EXISTS frequence_km integer;
