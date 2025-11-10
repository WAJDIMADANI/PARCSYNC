/*
  # Unification des tables document/documents

  Ce script unifie les deux tables de documents en une seule.

  1. Actions
    - Supprime la table `documents` (pluriel) qui est redondante
    - Supprime la table `document_reminders` qui référence documents
    - Toute l'application utilisera la table `document` (singulier)

  2. Table finale
    La table `document` utilise:
    - proprietaire_type (text): 'candidat', 'profil', 'vehicule'
    - proprietaire_id (uuid): ID du propriétaire
    - type (text): type de document
    - fichier_url (text): URL du fichier
    - fichier_nom (text): nom du fichier
    - created_at (timestamptz): date de création
*/

-- Supprimer la table document_reminders si elle existe
DROP TABLE IF EXISTS document_reminders CASCADE;

-- Supprimer la table documents (pluriel) si elle existe
DROP TABLE IF EXISTS documents CASCADE;

-- La table document (singulier) reste inchangée et sera utilisée partout
