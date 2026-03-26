/*
  # Ajout prime mensuelle d'assurance

  1. Modifications table `vehicule`
    - Ajout de `assurance_prime_mensuelle` (numeric 10,2)
      Montant mensuel de la prime d'assurance du véhicule

  2. Modifications table `historique_assurance_vehicule`
    - Ajout de `ancienne_prime_mensuelle` (numeric 10,2)
      Ancienne valeur de la prime mensuelle lors du changement
    - Ajout de `nouvelle_prime_mensuelle` (numeric 10,2)
      Nouvelle valeur de la prime mensuelle lors du changement

  3. Notes importantes
    - Les colonnes sont nullables pour permettre la rétrocompatibilité
    - Format numeric(10,2) permet des montants jusqu'à 99 999 999,99 €
    - L'historique capture les changements de prime avec les autres champs d'assurance
*/

-- Ajout de la colonne dans la table vehicule
ALTER TABLE vehicule
ADD COLUMN IF NOT EXISTS assurance_prime_mensuelle numeric(10,2);

-- Ajout des colonnes dans l'historique des assurances
ALTER TABLE historique_assurance_vehicule
ADD COLUMN IF NOT EXISTS ancienne_prime_mensuelle numeric(10,2),
ADD COLUMN IF NOT EXISTS nouvelle_prime_mensuelle numeric(10,2);
