/*
  # Correction du template "1er Avertissement utilisation du véhicule"

  ## Problème
  Le template contient des éléments structurels qui sont ajoutés automatiquement
  par le générateur de PDF (en-tête, objet, formule de politesse, signature).
  Cela cause une duplication dans le document final.

  ## Solution
  Remplacer le contenu du template par UNIQUEMENT le corps de la lettre en HTML,
  sans les éléments suivants (ajoutés automatiquement):
  - L'en-tête de l'entreprise
  - L'adresse du destinataire
  - L'objet (défini séparément dans le champ 'sujet')
  - La formule d'appel (Madame, Monsieur)
  - La formule de politesse finale
  - La signature

  ## Exécution
  Exécutez cette requête dans le SQL Editor de Supabase
*/

UPDATE modele_courrier
SET contenu = '<p>Malgré les règles strictes en vigueur concernant l''utilisation du véhicule de service, nous avons constaté une infraction à ces règles. En effet, le {{date_incident}}, entre {{heure_debut_incident}} et {{heure_fin_incident}}, vous avez utilisé le véhicule de service pour un trajet de {{km_non_autorises}} km non autorisé.</p>

<p>Nous vous rappelons qu''en tant que {{poste}}, vous êtes soumis à des règles précises concernant l''utilisation du véhicule de service. Votre contrat de travail stipule clairement que tout usage personnel ou non justifié du véhicule est strictement interdit et constitue un manquement grave aux règlements internes de l''entreprise.</p>

<p><strong>Les conséquences de cette infraction sont les suivantes :</strong></p>
<ul>
<li><strong>Usure prématurée du véhicule :</strong> cette utilisation non autorisée entraîne des frais supplémentaires en maintenance et entretien.</li>
<li><strong>Consommation excessive de carburant :</strong> cela impacte directement les finances de l''entreprise.</li>
<li><strong>Risque assurantiel :</strong> en cas d''accident lors d''une utilisation non autorisée, l''assurance pourrait refuser de couvrir les dommages, exposant l''entreprise à des pertes financières.</li>
<li><strong>Atteinte à la réputation de l''entreprise :</strong> un tel comportement nuit à l''image de {{nom_entreprise}} et compromet la relation de confiance avec nos partenaires et clients.</li>
</ul>

<p>En conséquence, nous vous adressons ce premier avertissement.</p>

<p>Nous vous informons qu''en cas de nouvelle infraction, une convocation à un entretien disciplinaire pourra être envisagée, pouvant mener à des sanctions plus sévères, y compris un licenciement pour faute grave.</p>

<p>Nous vous prions de prendre cette mise en garde au sérieux et de respecter scrupuleusement les règles en vigueur.</p>',
    sujet = 'Avertissement pour non-respect des règles d''utilisation du véhicule de service',
    updated_at = now()
WHERE nom ILIKE '%1er%avertissement%vehicule%'
   OR nom ILIKE '%avertissement%utilisation%vehicule%';

-- Vérification
SELECT
  nom,
  sujet,
  substring(contenu from 1 for 100) as contenu_debut,
  updated_at
FROM modele_courrier
WHERE nom ILIKE '%1er%avertissement%vehicule%'
   OR nom ILIKE '%avertissement%utilisation%vehicule%';
