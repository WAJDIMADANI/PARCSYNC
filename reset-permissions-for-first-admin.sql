/*
  # Script de réinitialisation pour FirstAdminSetup

  Ce script permet de réinitialiser le système de permissions
  pour permettre à l'utilisateur actuellement connecté de passer
  par l'interface FirstAdminSetup et obtenir tous les droits admin.

  ATTENTION: Ce script supprime TOUS les utilisateurs et permissions existants.
  Utilisez-le uniquement si vous voulez repartir de zéro.

  Étapes après exécution:
  1. Exécutez ce script dans Supabase SQL Editor
  2. Déconnectez-vous de l'application
  3. Reconnectez-vous
  4. L'écran FirstAdminSetup devrait apparaître
  5. Remplissez vos informations pour créer votre compte admin
*/

-- Supprimer toutes les permissions existantes
DELETE FROM utilisateur_permissions;

-- Supprimer tous les utilisateurs existants
DELETE FROM app_utilisateur;

-- Vérifier que les tables sont vides
SELECT 'app_utilisateur vide' as status, COUNT(*) as count FROM app_utilisateur
UNION ALL
SELECT 'utilisateur_permissions vide' as status, COUNT(*) as count FROM utilisateur_permissions;
