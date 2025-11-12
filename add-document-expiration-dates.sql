/*
  # Ajout des dates d'expiration des documents au profil

  1. Nouvelles colonnes
    - `certificat_medical_expiration` (date) - Date d'expiration du certificat médical
    - `permis_expiration` (date) - Date d'expiration du permis de conduire

  2. Objectif
    - Permettre le suivi des dates d'expiration des documents importants directement dans le profil
    - Faciliter la gestion des renouvellements de documents

  3. Notes importantes
    - Ces colonnes sont optionnelles (NULL par défaut)
    - Elles complètent les informations du profil salarié
    - Permettent des alertes automatiques pour les documents expirés
*/

-- Ajouter les colonnes de dates d'expiration au profil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'certificat_medical_expiration'
  ) THEN
    ALTER TABLE profil ADD COLUMN certificat_medical_expiration date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profil' AND column_name = 'permis_expiration'
  ) THEN
    ALTER TABLE profil ADD COLUMN permis_expiration date;
  END IF;
END $$;
