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
  let html = contract.modele.contenu_html;
  const variables = typeof contract.variables === 'string'
    ? JSON.parse(contract.variables)
    : contract.variables;

  // Remplacer les variables {{variable}} par les vraies valeurs
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, String(value || ''));
  });

  return html;
}

// ✅ Fonction pour générer le PDF via PDFShift (pour les modèles HTML)
async function generatePDF(htmlContent: string): Promise<ArrayBuffer> {
  const PDFSHIFT_API_KEY = Deno.env.get("PDFSHIFT_API_KEY");

  if (!PDFSHIFT_API_KEY) {
    throw new Error("PDFSHIFT_API_KEY not configured");
  }

  const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PDFSHIFT_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      source: htmlContent,
      sandbox: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PDFShift API error: ${errorText}`);
  }

  return await response.arrayBuffer();
}

// ✅ NEW: Fonction pour convertir Word → PDF via CloudConvert
async function convertWordToPDF(
  wordFileUrl: string,
  variables: Record<string, any>
): Promise<ArrayBuffer> {
  const CLOUDCONVERT_API_KEY = Deno.env.get("CLOUDCONVERT_API_KEY");

  if (!CLOUDCONVERT_API_KEY) {
    throw new Error("CLOUDCONVERT_API_KEY not configured");
  }

  console.log("Starting CloudConvert Word → PDF conversion...");

  // Étape 1: Créer un job de conversion
  const jobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUDCONVERT_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tasks: {
        "import-word": {
          operation: "import/url",
          url: wordFileUrl
        },
        "merge-variables": {
          operation: "merge",
          input: "import-word",
          output_format: "docx",
          variables: variables
        },
        "convert-to-pdf": {
          operation: "convert",
          input: "merge-variables",
          output_format: "pdf"
        },
        "export-pdf": {
          operation: "export/url",
          input: "convert-to-pdf"
        }
      }
    })
  });

  if (!jobResponse.ok) {
    const errorText = await jobResponse.text();
    throw new Error(`CloudConvert job creation error: ${errorText}`);
  }

  const jobData = await jobResponse.json();
  const jobId = jobData.data.id;
  console.log("CloudConvert job created:", jobId);

  // Étape 2: Attendre la fin du job (polling)
  let jobStatus = jobData.data.status;
  let attempts = 0;
  const maxAttempts = 30;

  while (jobStatus !== "finished" && jobStatus !== "error" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${CLOUDCONVERT_API_KEY}`
      }
    });

    if (!statusResponse.ok) {
      throw new Error("Failed to check CloudConvert job status");
    }

    const statusData = await statusResponse.json();
    jobStatus = statusData.data.status;
    attempts++;

    console.log(`CloudConvert job status: ${jobStatus} (attempt ${attempts})`);
  }

  if (jobStatus === "error") {
    throw new Error("CloudConvert job failed");
  }

  if (jobStatus !== "finished") {
    throw new Error("CloudConvert job timeout");
  }

  // Étape 3: Récupérer l'URL du PDF
  const exportTask = jobData.data.tasks.find((t: any) => t.name === "export-pdf");
  if (!exportTask || !exportTask.result?.files?.[0]?.url) {
    throw new Error("CloudConvert export task not found");
  }

  const pdfUrl = exportTask.result.files[0].url;
  console.log("PDF generated at:", pdfUrl);

  // Étape 4: Télécharger le PDF
  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error("Failed to download converted PDF");
  }

  return await pdfResponse.arrayBuffer();
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

    // Récupérer le contrat avec le modèle
    console.log("Fetching contract with ID:", contractId);
    const contractResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=*,modele:modele_id(*),profil:profil_id(*)`,
      {
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
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

    // ✅ DÉCISION : PDF ou Word ?
    let pdfArrayBuffer: ArrayBuffer;
    const isWordFile = contract.modele?.fichier_nom?.toLowerCase().endsWith('.docx');

    if (isWordFile && contract.modele?.fichier_url) {
      // ✅ OPTION 1 : Fichier Word → CloudConvert
      console.log("Detected Word file, using CloudConvert...");

      const variables = typeof contract.variables === 'string'
        ? JSON.parse(contract.variables)
        : contract.variables;

      pdfArrayBuffer = await convertWordToPDF(contract.modele.fichier_url, variables);
      console.log("Word → PDF conversion completed");

    } else if (contract.modele?.contenu_html) {
      // ✅ OPTION 2 : HTML → PDF (méthode classique)
      console.log("Using HTML → PDF conversion...");
      const htmlContent = await generateContractHTML(contract);
      pdfArrayBuffer = await generatePDF(htmlContent);
      console.log("HTML → PDF conversion completed");

    } else {
      throw new Error("Le modèle de contrat n'a ni fichier Word ni contenu HTML");
    }

    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    console.log("PDF ready for Yousign, size:", pdfBlob.size, "bytes");

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
