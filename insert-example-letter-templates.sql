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

  IMPORTANT - FORMAT DES TEMPLATES:
  Les templates doivent contenir UNIQUEMENT le corps de la lettre en HTML.
  N'incluez PAS les éléments suivants (ils sont ajoutés automatiquement):
  - L'en-tête de l'entreprise (nom, adresse, SIRET)
  - L'adresse du destinataire
  - L'objet (il est défini dans le champ 'sujet' séparé)
  - La formule d'appel (Madame, Monsieur, etc.)
  - La formule de politesse finale (Veuillez agréer...)
  - La signature (nom et fonction du signataire)

  Le template doit être en HTML avec des balises <p>, <strong>, <br/>, etc.
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
  '<p>Nous avons constaté les faits suivants le {{date_faits}} :</p>
<p>{{description_faits}}</p>
<p>Ces faits constituent un manquement à vos obligations dans le cadre de vos fonctions de {{poste}} au sein de {{nom_entreprise}}.</p>
<p>Par la présente, nous vous notifions un avertissement disciplinaire. Nous vous demandons de mettre fin à ce comportement et de respecter à l''avenir {{rappel_regle_ou_procedure}}.</p>
<p>Nous vous informons qu''en cas de récidive, d''autres sanctions, pouvant aller jusqu''à {{niveau_max_sanction}}, pourront être envisagées.</p>
<p>Pour toute question ou pour échanger à ce sujet, vous pouvez contacter le service RH.</p>',
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
  '<p style="text-align: center;"><strong>ATTESTATION DE TRAVAIL</strong></p>
<p>Je soussigné(e), {{prenom_signataire}} {{nom_signataire}}, {{fonction_signataire}} de {{nom_entreprise}}, située au {{adresse_entreprise}}, immatriculée sous le numéro SIRET {{siret_entreprise}},</p>
<p><strong>Atteste que :</strong></p>
<p>{{prenom}} {{nom}}<br/>
Né(e) le {{date_naissance}} à {{lieu_naissance}}<br/>
Nationalité : {{nationalite}}<br/>
Adresse : {{adresse}}, {{code_postal}} {{ville}}</p>
<p>Est employé(e) au sein de notre entreprise depuis le {{date_entree}} en qualité de {{poste}}.</p>
<p>Affectation : {{site_nom}}<br/>
Secteur : {{secteur_nom}}</p>
<p>Cette attestation est délivrée à l''intéressé(e) pour servir et valoir ce que de droit.</p>',
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
  '<p>Nous vous prions de bien vouloir vous présenter le {{date_entretien}} à {{heure_entretien}} dans nos locaux situés à {{lieu_entretien}}.</p>
<p><strong>Motif de l''entretien :</strong><br/>
{{motif_entretien}}</p>
<p>Vous aurez la possibilité de vous faire assister par une personne de votre choix appartenant au personnel de l''entreprise.</p>
<p><strong>Vos informations de contact :</strong><br/>
Email : {{email}}<br/>
Téléphone : {{tel}}<br/>
Site d''affectation : {{site_nom}}</p>
<p>En cas d''empêchement, merci de nous contacter au plus vite.</p>
<p>Nous vous remercions de votre attention.</p>',
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
