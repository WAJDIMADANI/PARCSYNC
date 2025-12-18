/*
  # Créer la table inbox et autoriser l'accès anonyme pour demande-externe

  1. Créer la table inbox
    - Table pour les notifications/messages génériques
    - Différente de `taches` qui est pour les tâches assignées

  2. Policies RLS pour demande-externe
    - Permettre l'accès anonyme aux tables nécessaires
    - Permettre la création de demandes et notifications anonymes

  3. Storage
    - Créer le bucket et configurer les policies
*/

-- 1. Créer la table inbox si elle n'existe pas
CREATE TABLE IF NOT EXISTS inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid REFERENCES app_utilisateur(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  titre text NOT NULL,
  description text,
  contenu text,
  reference_id uuid,
  reference_type text,
  statut text DEFAULT 'nouveau' NOT NULL,
  lu boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_inbox_utilisateur_id ON inbox(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_inbox_statut ON inbox(statut);
CREATE INDEX IF NOT EXISTS idx_inbox_lu ON inbox(lu);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON inbox(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_reference ON inbox(reference_id, reference_type);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_inbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inbox_updated_at ON inbox;
CREATE TRIGGER inbox_updated_at
  BEFORE UPDATE ON inbox
  FOR EACH ROW
  EXECUTE FUNCTION update_inbox_updated_at();

-- Activer RLS
ALTER TABLE inbox ENABLE ROW LEVEL SECURITY;

-- 2. Policies RLS pour la table inbox

-- Les utilisateurs authentifiés peuvent voir leurs propres notifications
DROP POLICY IF EXISTS "Users can view their own inbox messages" ON inbox;
CREATE POLICY "Users can view their own inbox messages"
  ON inbox
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.id = inbox.utilisateur_id
      AND app_utilisateur.auth_user_id = auth.uid()
    )
  );

-- Les utilisateurs authentifiés peuvent mettre à jour leurs propres notifications
DROP POLICY IF EXISTS "Users can update their own inbox messages" ON inbox;
CREATE POLICY "Users can update their own inbox messages"
  ON inbox
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.id = inbox.utilisateur_id
      AND app_utilisateur.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE app_utilisateur.id = inbox.utilisateur_id
      AND app_utilisateur.auth_user_id = auth.uid()
    )
  );

-- Les utilisateurs authentifiés peuvent créer des notifications
DROP POLICY IF EXISTS "Authenticated users can create inbox messages" ON inbox;
CREATE POLICY "Authenticated users can create inbox messages"
  ON inbox
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permettre aux anonymes de créer des notifications (pour demande-externe)
DROP POLICY IF EXISTS "Anonyme peut créer des notifications inbox" ON inbox;
CREATE POLICY "Anonyme peut créer des notifications inbox"
  ON inbox
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 3. Policies RLS pour les autres tables utilisées par demande-externe

-- Profil: Permettre SELECT anonyme pour recherche par matricule
DROP POLICY IF EXISTS "Anonyme peut rechercher profil par matricule" ON profil;
CREATE POLICY "Anonyme peut rechercher profil par matricule"
  ON profil
  FOR SELECT
  TO anon
  USING (true);

-- Poles: Permettre SELECT anonyme pour lister les pôles actifs
DROP POLICY IF EXISTS "Anonyme peut lire les pôles actifs" ON poles;
CREATE POLICY "Anonyme peut lire les pôles actifs"
  ON poles
  FOR SELECT
  TO anon
  USING (actif = true);

-- Demandes externes: Permettre INSERT anonyme
DROP POLICY IF EXISTS "Anonyme peut créer des demandes externes" ON demandes_externes;
CREATE POLICY "Anonyme peut créer des demandes externes"
  ON demandes_externes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Permettre aux admins de lire toutes les demandes
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent lire les demandes" ON demandes_externes;
CREATE POLICY "Utilisateurs authentifiés peuvent lire les demandes"
  ON demandes_externes
  FOR SELECT
  TO authenticated
  USING (true);

-- App utilisateur: Permettre SELECT anonyme pour notifier les utilisateurs
DROP POLICY IF EXISTS "Anonyme peut lire les utilisateurs pour notifications" ON app_utilisateur;
CREATE POLICY "Anonyme peut lire les utilisateurs pour notifications"
  ON app_utilisateur
  FOR SELECT
  TO anon
  USING (actif = true);

-- 4. Storage: Créer le bucket et permettre l'upload anonyme
INSERT INTO storage.buckets (id, name, public)
VALUES ('demandes-externes', 'demandes-externes', false)
ON CONFLICT (id) DO NOTHING;

-- Permettre upload anonyme dans le bucket demandes-externes
DROP POLICY IF EXISTS "Anonyme peut uploader dans demandes-externes" ON storage.objects;
CREATE POLICY "Anonyme peut uploader dans demandes-externes"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'demandes-externes');

-- Permettre aux admins de lire les fichiers
DROP POLICY IF EXISTS "Admins peuvent lire demandes-externes" ON storage.objects;
CREATE POLICY "Admins peuvent lire demandes-externes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'demandes-externes');

-- 5. Activer real-time pour inbox
ALTER PUBLICATION supabase_realtime ADD TABLE inbox;
