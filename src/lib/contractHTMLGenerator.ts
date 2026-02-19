function formatDateDDMMYYYY(dateStr: string): string {
  try {
    const dateOnly = dateStr.split('T')[0];
    const [year, month, day] = dateOnly.split('-');

    if (!year || !month || !day) return dateStr;

    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  } catch (error) {
    return dateStr;
  }
}

interface ContractData {
  variables: {
    prenom?: string;
    nom?: string;
    poste?: string;
    salaire?: string;
    date_debut?: string;
    heures_semaine?: string;
    [key: string]: any;
  };
  modele?: {
    nom: string;
    type_contrat: string;
  };
  profil?: {
    prenom?: string;
    nom?: string;
    email?: string;
  };
}

export function generateContractHTML(contract: ContractData): string {
  const vars = contract.variables || {};
  const profil = contract.profil || {};

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: #2563eb;
      font-size: 20pt;
      margin-bottom: 30px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #1e40af;
      font-size: 14pt;
      margin-top: 25px;
      margin-bottom: 15px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .info-box {
      background: #f0f9ff;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 20px 0;
    }
    .signature-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 60px;
      padding-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      font-size: 9pt;
      color: #666;
      text-align: center;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${contract.modele?.nom || 'CONTRAT DE TRAVAIL'}</h1>
    <p><strong>Type de contrat :</strong> ${contract.modele?.type_contrat || 'CDI'}</p>
  </div>

  <h2>ENTRE LES SOUSSIGNÉS :</h2>

  <div class="info-box">
    <p><strong>L'Employeur :</strong> <span style="color: #FFA500;">TRANSPORT</span> <span style="color: #4A90E2;">CLASSE AFFAIRE</span></p>
    <p><strong>Représenté par :</strong> [Nom du représentant]</p>
  </div>

  <p style="text-align: center; margin: 20px 0;"><strong>ET</strong></p>

  <div class="info-box">
    <p><strong>Le Salarié :</strong> ${profil.prenom || vars.prenom || '[Prénom]'} ${profil.nom || vars.nom || '[Nom]'}</p>
    <p><strong>Email :</strong> ${profil.email || '[Email]'}</p>
  </div>

  <h2>ARTICLE 1 : OBJET DU CONTRAT</h2>
  <p>
    Le présent contrat a pour objet de définir les conditions d'emploi et de rémunération
    du salarié au sein de la société <span style="color: #FFA500;">TRANSPORT</span> <span style="color: #4A90E2;">CLASSE AFFAIRE</span>.
  </p>

  <h2>ARTICLE 2 : POSTE ET FONCTIONS</h2>
  <table>
    <tr>
      <th>Poste</th>
      <td>${vars.poste || '[Poste à définir]'}</td>
    </tr>
    <tr>
      <th>Date de début</th>
      <td>${vars.date_debut ? formatDateDDMMYYYY(vars.date_debut) : '[Date à définir]'}</td>
    </tr>
    <tr>
      <th>Durée hebdomadaire</th>
      <td>${vars.heures_semaine || '35'} heures</td>
    </tr>
  </table>

  <h2>ARTICLE 3 : RÉMUNÉRATION</h2>
  <div class="info-box">
    <p><strong>Salaire brut mensuel :</strong> ${vars.salaire || '[Salaire à définir]'}</p>
    <p>Le salaire sera versé mensuellement par virement bancaire.</p>
  </div>

  <h2>ARTICLE 4 : PÉRIODE D'ESSAI</h2>
  <p>
    Le contrat est conclu sous réserve d'une période d'essai de ${vars.periode_essai || '2 mois'},
    renouvelable une fois, conformément à la convention collective applicable.
  </p>

  <h2>ARTICLE 5 : LIEU DE TRAVAIL</h2>
  <p>
    Le lieu de travail est fixé au : ${vars.lieu_travail || '[Adresse à définir]'}
  </p>

  <h2>ARTICLE 6 : OBLIGATIONS DU SALARIÉ</h2>
  <p>Le salarié s'engage à :</p>
  <ul>
    <li>Exercer ses fonctions avec diligence et professionnalisme</li>
    <li>Respecter le règlement intérieur de l'entreprise</li>
    <li>Respecter les consignes de sécurité</li>
    <li>Maintenir la confidentialité sur les informations de l'entreprise</li>
  </ul>

  <h2>ARTICLE 7 : DOCUMENTS À FOURNIR</h2>
  <p>Le salarié s'engage à fournir avant son entrée en fonction :</p>
  <ul>
    <li>Une visite médicale obligatoire (médecin agréé préfecture)</li>
    <li>Une copie de la carte nationale d'identité ou du passeport</li>
    <li>Un RIB</li>
    <li>Une carte vitale</li>
    ${vars.permis_requis ? '<li>Une copie du permis de conduire</li>' : ''}
  </ul>

  <h2>ARTICLE 8 : CONVENTION COLLECTIVE</h2>
  <p>
    Le présent contrat est régi par ${vars.convention_collective || 'la convention collective applicable au secteur d\'activité'}.
  </p>

  <div class="signature-section">
    <div class="signature-box">
      <p><strong>Fait à :</strong> ${vars.lieu_signature || '[Lieu]'}</p>
      <p><strong>Le :</strong> ${vars.date_signature ? formatDateDDMMYYYY(vars.date_signature) : formatDateDDMMYYYY(new Date().toISOString().split('T')[0])}</p>
      <div class="signature-line">
        <p>Signature de l'employeur</p>
        <p>(Précédée de la mention "Lu et approuvé")</p>
      </div>
    </div>
    <div class="signature-box">
      <p><strong>Fait à :</strong> ${vars.lieu_signature || '[Lieu]'}</p>
      <p><strong>Le :</strong> ${vars.date_signature ? formatDateDDMMYYYY(vars.date_signature) : formatDateDDMMYYYY(new Date().toISOString().split('T')[0])}</p>
      <div class="signature-line">
        <p>Signature du salarié</p>
        <p>(Précédée de la mention "Lu et approuvé")</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Document généré automatiquement par <span style="color: #FFA500;">TRANSPORT</span> <span style="color: #4A90E2;">CLASSE AFFAIRE</span> - ${formatDateDDMMYYYY(new Date().toISOString().split('T')[0])}</p>
    <p>Ce contrat fait foi entre les parties signataires.</p>
  </div>
</body>
</html>
  `;
}
