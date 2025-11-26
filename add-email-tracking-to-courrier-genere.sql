/*
  # Ajout des colonnes d'envoi email à courrier_genere
  
  1. Nouvelles colonnes
    - `canal` (email/courrier) - Type de communication
    - `sent_to` - Email du destinataire (si envoyé)
    - `sent_at` - Timestamp d'envoi (si envoyé)
  
  2. Modification du statut
    - Ajouter les valeurs: 'brouillon', 'pret', 'envoye', 'erreur'
    
  3. Notes
    - Migration additive seulement
    - Pas de perte de données
*/

-- Ajouter les colonnes si elles n'existent pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courrier_genere' AND column_name = 'canal'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN canal TEXT DEFAULT 'courrier';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courrier_genere' AND column_name = 'sent_to'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN sent_to TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courrier_genere' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE courrier_genere ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Créer un index pour optimiser les requêtes par statut
CREATE INDEX IF NOT EXISTS idx_courrier_genere_status ON courrier_genere(status);
CREATE INDEX IF NOT EXISTS idx_courrier_genere_canal ON courrier_genere(canal);
