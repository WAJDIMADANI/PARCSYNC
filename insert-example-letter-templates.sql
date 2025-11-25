/*
  # Modèles de courriers d'exemple

  Ce fichier contient 3 modèles de courriers prêts à l'emploi:
  1. Avertissement Disciplinaire
  2. Attestation de Travail
  3. Convocation à un Entretien

  INSTRUCTIONS:
  1. Assurez-vous que les tables modele_courrier et courrier_genere existent
  2. Remplacez 'YOUR_USER_ID' par l'UUID de votre utilisateur admin
  3. Exécutez ce fichier dans le SQL Editor de Supabase
*/

-- Modèle 1: Avertissement Disciplinaire
INSERT INTO modele_courrier (
  nom,
  type_courrier,
  sujet,
  contenu,
  variables_systeme,
  variables_personnalisees,
  actif,
  created_by
) VALUES (
  'Avertissement Disciplinaire',
  'Avertissement',
  'Avertissement disciplinaire',
  'Objet : Avertissement disciplinaire

Bonjour {{prenom}} {{nom}},

Nous avons constaté les faits suivants le {{date_faits}} :
{{description_faits}}

Ces faits constituent un manquement à vos obligations dans le cadre de vos fonctions de {{poste}} au sein de {{nom_entreprise}}.

Par la présente, nous vous notifions un avertissement disciplinaire.
Nous vous demandons de mettre fin à ce comportement et de respecter à l''avenir {{rappel_regle_ou_procedure}}.

Nous vous informons qu''en cas de récidive, d''autres sanctions, pouvant aller jusqu''à {{niveau_max_sanction}}, pourront être envisagées.

Pour toute question ou pour échanger à ce sujet, vous pouvez contacter le service RH.

Cordialement,

{{prenom_signataire}} {{nom_signataire}}
{{fonction_signataire}}
{{nom_entreprise}}',
  ARRAY['prenom', 'nom', 'poste', 'nom_entreprise', 'prenom_signataire', 'nom_signataire', 'fonction_signataire'],
  '{
    "date_faits": {
      "label": "Date des faits",
      "type": "date",
      "required": true,
      "ordre": 1
    },
    "description_faits": {
      "label": "Description des faits",
      "type": "textarea",
      "required": true,
      "ordre": 2
    },
    "rappel_regle_ou_procedure": {
      "label": "Règle ou procédure à respecter",
      "type": "text",
      "required": false,
      "ordre": 3
    },
    "niveau_max_sanction": {
      "label": "Niveau maximal de sanction",
      "type": "text",
      "required": false,
      "ordre": 4
    }
  }'::jsonb,
  true,
  'YOUR_USER_ID'
);

-- Modèle 2: Attestation de Travail
INSERT INTO modele_courrier (
  nom,
  type_courrier,
  sujet,
  contenu,
  variables_systeme,
  variables_personnalisees,
  actif,
  created_by
) VALUES (
  'Attestation de Travail',
  'Attestation',
  'Attestation de travail pour {{prenom}} {{nom}}',
  'ATTESTATION DE TRAVAIL

Je soussigné(e), {{prenom_signataire}} {{nom_signataire}}, {{fonction_signataire}} de {{nom_entreprise}}, située au {{adresse_entreprise}}, immatriculée sous le numéro SIRET {{siret_entreprise}},

Atteste que :

Madame/Monsieur {{prenom}} {{nom}}
Né(e) le {{date_naissance}} à {{lieu_naissance}}
Nationalité : {{nationalite}}
Adresse : {{adresse}}, {{code_postal}} {{ville}}

Est employé(e) au sein de notre entreprise depuis le {{date_entree}} en qualité de {{poste}}.

Affectation : {{site_nom}}
Secteur : {{secteur_nom}}

Cette attestation est délivrée à l''intéressé(e) pour servir et valoir ce que de droit.

Fait à Paris, le {{date_aujourd_hui}}

{{prenom_signataire}} {{nom_signataire}}
{{fonction_signataire}}
{{nom_entreprise}}',
  ARRAY['prenom', 'nom', 'date_naissance', 'lieu_naissance', 'nationalite', 'adresse', 'code_postal', 'ville', 'date_entree', 'poste', 'site_nom', 'secteur_nom', 'date_aujourd_hui', 'nom_entreprise', 'adresse_entreprise', 'siret_entreprise', 'prenom_signataire', 'nom_signataire', 'fonction_signataire'],
  '{}'::jsonb,
  true,
  'YOUR_USER_ID'
);

-- Modèle 3: Convocation à un Entretien
INSERT INTO modele_courrier (
  nom,
  type_courrier,
  sujet,
  contenu,
  variables_systeme,
  variables_personnalisees,
  actif,
  created_by
) VALUES (
  'Convocation à un Entretien',
  'Convocation',
  'Convocation à un entretien - {{prenom}} {{nom}}',
  'Objet : Convocation à un entretien

Madame, Monsieur {{nom}},

Nous vous prions de bien vouloir vous présenter le {{date_entretien}} à {{heure_entretien}} dans nos locaux situés à {{lieu_entretien}}.

Motif de l''entretien :
{{motif_entretien}}

Vous aurez la possibilité de vous faire assister par une personne de votre choix appartenant au personnel de l''entreprise.

Vos informations de contact :
Email : {{email}}
Téléphone : {{tel}}
Site d''affectation : {{site_nom}}

En cas d''empêchement, merci de nous contacter au plus vite.

Nous vous remercions de votre attention.

Cordialement,

{{prenom_signataire}} {{nom_signataire}}
{{fonction_signataire}}
{{nom_entreprise}}',
  ARRAY['nom', 'prenom', 'email', 'tel', 'site_nom', 'nom_entreprise', 'prenom_signataire', 'nom_signataire', 'fonction_signataire'],
  '{
    "date_entretien": {
      "label": "Date de l''entretien",
      "type": "date",
      "required": true,
      "ordre": 1
    },
    "heure_entretien": {
      "label": "Heure de l''entretien",
      "type": "text",
      "required": true,
      "ordre": 2
    },
    "lieu_entretien": {
      "label": "Lieu de l''entretien",
      "type": "text",
      "required": true,
      "ordre": 3
    },
    "motif_entretien": {
      "label": "Motif de l''entretien",
      "type": "textarea",
      "required": true,
      "ordre": 4
    }
  }'::jsonb,
  true,
  'YOUR_USER_ID'
);
