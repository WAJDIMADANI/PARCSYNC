/*
  # Ajout du fournisseur pour la carte essence

  1. Modifications
    - Ajoute la colonne `carte_essence_fournisseur` à la table vehicule
*/

ALTER TABLE vehicule
ADD COLUMN IF NOT EXISTS carte_essence_fournisseur text;
