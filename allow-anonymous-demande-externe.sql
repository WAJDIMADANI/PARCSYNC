/*
  # Autoriser l'accès anonyme pour la page demande-externe

  1. Policies pour `profil`
    - Permettre SELECT pour rechercher par matricule (anonyme)

  2. Policies pour `poles`
    - Permettre SELECT pour lister les pôles actifs (anonyme)

  3. Policies pour `demandes_externes`
    - Permettre INSERT pour créer une demande (anonyme)
    - Permettre SELECT pour les admins

  4. Policies pour `app_utilisateur`
    - Permettre SELECT pour trouver les utilisateurs d'un pôle (anonyme)

  5. Policies pour `inbox`
    - Permettre INSERT pour créer des notifications (anonyme)
*/

-- 1. Profil: Permettre SELECT anonyme pour recherche par matricule
DROP POLICY IF EXISTS "Anonyme peut rechercher profil par matricule" ON profil;
CREATE POLICY "Anonyme peut rechercher profil par matricule"
  ON profil
  FOR SELECT
  TO anon
  USING (true);

-- 2. Poles: Permettre SELECT anonyme pour lister les pôles actifs
DROP POLICY IF EXISTS "Anonyme peut lire les pôles actifs" ON poles;
CREATE POLICY "Anonyme peut lire les pôles actifs"
  ON poles
  FOR SELECT
  TO anon
  USING (actif = true);

-- 3. Demandes externes: Permettre INSERT anonyme
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

-- 4. App utilisateur: Permettre SELECT anonyme pour notifier les utilisateurs
DROP POLICY IF EXISTS "Anonyme peut lire les utilisateurs pour notifications" ON app_utilisateur;
CREATE POLICY "Anonyme peut lire les utilisateurs pour notifications"
  ON app_utilisateur
  FOR SELECT
  TO anon
  USING (actif = true);

-- 5. Inbox: Permettre INSERT anonyme pour créer des notifications
DROP POLICY IF EXISTS "Anonyme peut créer des notifications inbox" ON inbox;
CREATE POLICY "Anonyme peut créer des notifications inbox"
  ON inbox
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 6. Storage: Créer le bucket et permettre l'upload anonyme
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
