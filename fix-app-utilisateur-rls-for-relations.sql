/*
  # Ajouter la policy RLS pour permettre la lecture des utilisateurs dans les relations

  1. Problème
    - Actuellement, les requêtes qui font des relations vers app_utilisateur échouent
    - Exemple: courrier_genere -> app_utilisateur (created_by, envoye_par)
    - Supabase ne peut pas charger les relations si app_utilisateur n'a pas de policy SELECT

  2. Solution
    - Ajouter une policy SELECT sur app_utilisateur
    - Permettre aux utilisateurs authentifiés de lire les infos de base des autres utilisateurs
    - Restreindre aux colonnes nécessaires: prenom, nom, email

  3. Sécurité
    - Les utilisateurs authentifiés peuvent lire prenom, nom, email
    - Les mots de passe et données sensibles ne sont pas dans app_utilisateur
    - Cette policy est nécessaire pour afficher "Créé par X" et "Envoyé par Y"
*/

-- Activer RLS sur app_utilisateur si ce n'est pas déjà fait
ALTER TABLE app_utilisateur ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne policy si elle existe (au cas où)
DROP POLICY IF EXISTS "Users can read basic info of other users" ON app_utilisateur;

-- Créer une policy qui permet aux utilisateurs authentifiés de lire les infos de base
CREATE POLICY "Authenticated users can read basic user info for relations"
  ON app_utilisateur
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: Cette policy permet la lecture de toutes les colonnes de app_utilisateur
-- Si vous voulez restreindre, vous devrez créer une vue séparée
