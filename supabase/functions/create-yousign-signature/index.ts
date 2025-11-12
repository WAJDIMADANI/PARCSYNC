import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignatureRequest {
  contractId: string;
}

// ✅ Fonction pour générer l'HTML du contrat avec les variables
async function generateContractHTML(contract: any): Promise<string> {
  const variables = typeof contract.variables === 'string'
    ? JSON.parse(contract.variables)
    : contract.variables;

  const profil = contract.profil || {};
  const modele = contract.modele || {};

  // Si le modèle a du HTML custom, l'utiliser
  if (modele.contenu_html) {
    let html = modele.contenu_html;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value || ''));
    });
    return html;
  }

  // Sinon, générer un HTML par défaut
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      margin: 40px;
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
    .info-box {
      background: #f0f9ff;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 20px 0;
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
  </style>
</head>
<body>
  <h1>${modele.nom || 'CONTRAT DE TRAVAIL'}</h1>
  <p style="text-align: center;"><strong>Type :</strong> ${modele.type_contrat || 'CDI'}</p>

  <h2>ENTRE LES SOUSSIGNÉS :</h2>
  <div class="info-box">
    <p><strong>L'Employeur :</strong> PARC SYNC</p>
  </div>

  <p style="text-align: center; margin: 20px 0;"><strong>ET</strong></p>

  <div class="info-box">
    <p><strong>Le Salarié :</strong> ${profil.prenom || ''} ${profil.nom || ''}</p>
    <p><strong>Email :</strong> ${profil.email || ''}</p>
  </div>

  <h2>INFORMATIONS DU CONTRAT</h2>
  <table>
    <tr>
      <th>Poste</th>
      <td>${variables.poste || '[Poste à définir]'}</td>
    </tr>
    <tr>
      <th>Date de début</th>
      <td>${variables.date_debut ? new Date(variables.date_debut).toLocaleDateString('fr-FR') : '[Date à définir]'}</td>
    </tr>
    <tr>
      <th>Durée hebdomadaire</th>
      <td>${variables.heures_semaine || '35'} heures</td>
    </tr>
    <tr>
      <th>Salaire brut mensuel</th>
      <td style="font-weight: bold; color: #059669;">${variables.salaire || '[Salaire à définir]'}</td>
    </tr>
    ${variables.lieu_travail ? `<tr><th>Lieu de travail</th><td>${variables.lieu_travail}</td></tr>` : ''}
  </table>

  <p style="margin-top: 40px; text-align: center; color: #666;">
    Document généré automatiquement - ${new Date().toLocaleDateString('fr-FR')}
  </p>
</body>
</html>
  `;
}

// ✅ Fonction pour générer le PDF via HTML2PDF.it (service gratuit)
async function generatePDF(htmlContent: string): Promise<ArrayBuffer> {
  const response = await fetch("https://api.html2pdf.app/v1/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      html: htmlContent,
      engine: "chrome",
      pdf_options: {
        format: "A4",
        margin: {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm"
        },
        printBackground: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("HTML2PDF error:", errorText);
    throw new Error(`PDF generation error: ${response.status} - ${errorText}`);
  }

  return await response.arrayBuffer();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", success: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { contractId }: SignatureRequest = body;

    console.log("Received request:", { contractId });

    const YOUSIGN_API_KEY = Deno.env.get("YOUSIGN_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!YOUSIGN_API_KEY) {
      throw new Error("YOUSIGN_API_KEY not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Récupérer le contrat
    console.log("Fetching contract with ID:", contractId);
    const contractResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=*,modele:modele_id(nom,type_contrat,contenu_html),profil:profil_id(prenom,nom,email)`,
      {
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Accept": "application/json"
        }
      }
    );

    if (!contractResponse.ok) {
      throw new Error(`Failed to fetch contract: ${contractResponse.statusText}`);
    }

    const contracts = await contractResponse.json();
    const contract = contracts[0];

    if (!contract) {
      throw new Error("Contract not found");
    }

    // Récupérer l'email et le nom depuis le profil
    const employeeEmail = contract.profil?.email || contract.variables?.email_salarie || '';
    const employeeName = contract.profil
      ? `${contract.profil.prenom} ${contract.profil.nom}`
      : contract.variables?.nom_salarie || 'Salarié';

    console.log("Employee data:", { employeeEmail, employeeName });

    if (!employeeEmail || !employeeEmail.includes('@')) {
      throw new Error("Email employé invalide ou manquant dans le profil");
    }

    if (!contract.modele?.contenu_html) {
      throw new Error("Le modèle de contrat n'a pas de contenu HTML associé");
    }

    // ✅ ÉTAPE 0 : GÉNÉRER LE PDF EN MÉMOIRE
    console.log("Step 0: Generating PDF from HTML template...");
    const htmlContent = await generateContractHTML(contract);
    console.log("HTML generated, length:", htmlContent.length);

    const pdfArrayBuffer = await generatePDF(htmlContent);
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    console.log("PDF generated in memory, size:", pdfBlob.size, "bytes");

    // ✅ ÉTAPE 1 : Créer une signature request
    console.log("Step 1: Creating signature request...");
    const signatureRequestResponse = await fetch("https://api-sandbox.yousign.app/v3/signature_requests", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Contrat de travail - ${employeeName}`,
        delivery_mode: "email",
        timezone: "Europe/Paris",
        external_id: contractId,
      }),
    });

    if (!signatureRequestResponse.ok) {
      const errorText = await signatureRequestResponse.text();
      console.error("Yousign signature request error:", errorText);
      throw new Error(`Yousign signature request error: ${errorText}`);
    }

    const signatureRequestData = await signatureRequestResponse.json();
    const signatureRequestId = signatureRequestData.id;
    console.log("Signature request created with ID:", signatureRequestId);

    // ✅ ÉTAPE 2 : Uploader le document vers la signature request
    console.log("Step 2: Uploading document to signature request...");
    const formData = new FormData();
    formData.append("nature", "signable_document");
    formData.append("parse_anchors", "true");
    formData.append("file", pdfBlob, `contrat_${employeeName.replace(/\s+/g, '_')}.pdf`);

    const uploadResponse = await fetch(
      `https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/documents`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Yousign upload error:", errorText);
      throw new Error(`Yousign upload error: ${errorText}`);
    }

    const documentData = await uploadResponse.json();
    const documentId = documentData.id;
    console.log("Document uploaded with ID:", documentId);

    // Étape 4: Ajouter le signataire
    console.log("Step 4: Adding signer...");
    const nameParts = employeeName.trim().split(' ');
    const firstName = nameParts[0] || employeeName;
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const signerResponse = await fetch(
      `https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/signers`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          info: {
            first_name: firstName,
            last_name: lastName,
            email: employeeEmail,
            locale: "fr",
          },
          signature_level: "electronic_signature",
          signature_authentication_mode: "no_otp",
          fields: [
            {
              document_id: documentId,
              type: "signature",
              page: 1,
              x: 77,
              y: 581,
            }
          ]
        }),
      }
    );

    if (!signerResponse.ok) {
      const errorText = await signerResponse.text();
      console.error("Yousign signer error:", errorText);
      throw new Error(`Yousign signer error: ${errorText}`);
    }

    const signerData = await signerResponse.json();
    console.log("Signer added with ID:", signerData.id);

    // Étape 5: Activer la signature request
    console.log("Step 5: Activating signature request...");
    const activateResponse = await fetch(
      `https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/activate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
        },
      }
    );

    if (!activateResponse.ok) {
      const errorText = await activateResponse.text();
      console.error("Yousign activate error:", errorText);
      throw new Error(`Yousign activate error: ${errorText}`);
    }

    console.log("Signature request activated successfully");

    // Mettre à jour le contrat dans Supabase
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          yousign_signature_request_id: signatureRequestId,
          yousign_signer_id: signerData.id,
          statut: 'en_attente_signature'
        })
      }
    );

    if (!updateResponse.ok) {
      console.error("Supabase update error:", await updateResponse.text());
    }

    return new Response(
      JSON.stringify({
        success: true,
        signatureRequestId: signatureRequestId,
        signerId: signerData.id,
        message: "Demande de signature créée et activée avec succès"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in create-yousign-signature:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
